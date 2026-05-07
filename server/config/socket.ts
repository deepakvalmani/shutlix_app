import { Server, Socket } from 'socket.io';
import http from 'http';
import jwt from 'jsonwebtoken';
import * as redis from './redis';
import { haversine } from '../utils/geo';
import { Geofence, Trip, Booking } from '../models/index';
import { sendPushNotification } from '../utils/notifications';
import { Conversation } from '../models/Conversation';
import { Message } from '../models/Message';
import { ConversationUnread } from '../models/ConversationUnread';

let io: Server;
const onlineUsers = new Map<string, string>(); // userId -> socketId

export const initSocket = (server: http.Server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 30000,
    pingInterval: 10000,
  });

  // ── Auth middleware ──────────────────────────────────────
  io.use((socket: any, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.split(' ')[1];
      if (!token) { 
        socket.user = null; 
        return next(); 
      }
      const secret = process.env.JWT_SECRET || 'secret';
      const decoded: any = jwt.verify(token, secret);
      socket.user = decoded;
      
      // Auto-join organization if present in token
      if (decoded.organizationId) {
          socket.organizationId = decoded.organizationId.toString();
          socket.join(`org:${socket.organizationId}`);
      }
      
      next();
    } catch (err) {
      console.error('Socket auth error:', err);
      socket.user = null;
      next();
    }
  });

  io.on('connection', (socket: any) => {
    const uid  = socket.user?.id   || 'guest';
    const role = socket.user?.role || 'guest';
    console.log(`🔌 Connected: ${uid} (${role})`);

    if (uid !== 'guest') {
        onlineUsers.set(uid, socket.id);
        socket.join(`user:${uid}`); // Individual room for private notifications
        if (socket.organizationId) {
            io.to(`org:${socket.organizationId}`).emit('user:status', { userId: uid, status: 'online' });
        }
    }

    // ── Join org room ──────────────────────────────────────
    socket.on('join:organization', async ({ organizationId }: { organizationId: string }) => {
      // Security: only allow joining the org ID present in the JWT
      const targetOrg = socket.organizationId || organizationId;
      if (!targetOrg) return;
      socket.join(`org:${targetOrg}`);
      
      // Send current shuttle positions
      const positions = await redis.getAllPositions();
      const relevant  = positions.filter((p: any) => p.organizationId === targetOrg);
      if (relevant.length) socket.emit('shuttle:allPositions', relevant);
    });

    // ── Chat: Message systems ──────────────────────────────
    socket.on('chat:join', ({ conversationId }: { conversationId: string }) => {
        if (!conversationId) return;
        socket.join(`chat:${conversationId}`);
        console.log(`💬 User ${uid} joined room chat:${conversationId}`);
    });

    socket.on('chat:typing', ({ conversationId, isTyping }: { conversationId: string, isTyping: boolean }) => {
        socket.to(`chat:${conversationId}`).emit('chat:typing', { 
            conversationId, 
            userId: uid, 
            isTyping,
            userName: socket.user?.name 
        });
    });

    socket.on('message:send', async ({ content, conversationId, organizationId }: any) => {
        const authOrgId = socket.organizationId || organizationId;
        if (!uid || uid === 'guest' || !authOrgId) return;
        
        try {
            let actualConvId = conversationId;
            let conv;
            
            if (!actualConvId) {
                conv = await Conversation.findOne({ organizationId: authOrgId, type: 'global' });
                if (!conv) {
                    conv = await Conversation.create({ 
                        organizationId: authOrgId, 
                        type: 'global', 
                        name: 'Global Announcement' 
                    });
                }
                actualConvId = conv._id.toString();
            } else {
                conv = await Conversation.findOne({ 
                    _id: actualConvId, 
                    organizationId: authOrgId,
                    $or: [{ type: 'global' }, { participants: uid }]
                });
                
                if (!conv) return;
            }

            const msg = await Message.create({
                conversationId: actualConvId,
                sender: uid,
                content
            });

            // Increment unread counts for all participants EXCEPT sender
            if (conv.type !== 'global') {
                const unreadPromises = conv.participants
                    .filter((pId: any) => pId.toString() !== uid.toString())
                    .map((pId: any) => 
                        ConversationUnread.findOneAndUpdate(
                            { conversationId: actualConvId, userId: pId },
                            { $inc: { count: 1 }, organizationId: authOrgId },
                            { upsert: true }
                        )
                    );
                
                await Promise.all([
                    ...unreadPromises,
                    Conversation.findByIdAndUpdate(actualConvId, { 
                        lastMessage: msg._id, 
                        updatedAt: new Date() 
                    })
                ]);
            } else {
                await Conversation.findByIdAndUpdate(actualConvId, {
                    lastMessage: msg._id,
                    updatedAt: new Date()
                });
            }

            const populated = await msg.populate('sender', 'name avatar role');
            
            // 1. Emit to chat room
            io.to(`chat:${actualConvId}`).emit('message:receive', populated);
            
            // 2. Sidebar/Push notifications
            if (conv.type === 'global') {
                io.to(`org:${authOrgId}`).emit('message:receive', populated);
            } else {
                conv.participants.forEach((pId: any) => {
                    const participantId = pId.toString();
                    io.to(`user:${participantId}`).emit('message:receive', populated);
                    
                    if (participantId !== uid.toString()) {
                        const room = io.sockets.adapter.rooms.get(`chat:${actualConvId}`);
                        const isInRoom = room && room.has(onlineUsers.get(participantId) || '');
                        
                        if (!isInRoom) {
                            sendPushNotification(participantId, {
                                title: `New message from ${populated.sender.name}`,
                                body: content.length > 60 ? content.substring(0, 60) + '...' : content,
                                data: { url: '/chat', conversationId: actualConvId, type: 'chat' }
                            });
                        }
                    }
                });
            }
        } catch (err) { console.error('Socket message error:', err); }
    });

    socket.on('message:read', async ({ conversationId }: { conversationId: string }) => {
        if (!uid || uid === 'guest') return;
        try {
            await Promise.all([
                Message.updateMany(
                    { conversationId, sender: { $ne: uid }, 'readBy.user': { $ne: uid } },
                    { $addToSet: { readBy: { user: uid, readAt: new Date() } } }
                ),
                ConversationUnread.findOneAndUpdate(
                    { conversationId, userId: uid },
                    { $set: { count: 0 } },
                    { upsert: true }
                )
            ]);

            io.to(`chat:${conversationId}`).emit('message:read_update', { conversationId, userId: uid });
        } catch (err) {
            console.error('Error marking message as read:', err);
        }
    });

    socket.on('message:delete', async ({ messageId, conversationId }: any) => {
        if (!uid || uid === 'guest') return;
        try {
            const message = await Message.findById(messageId);
            if (message && message.sender.toString() === uid.toString()) {
                await Message.findByIdAndDelete(messageId);
                
                // Update Conversation's lastMessage if needed
                const conv = await Conversation.findById(conversationId);
                if (conv && conv.lastMessage?.toString() === messageId) {
                    const lastMsg = await Message.findOne({ conversationId }).sort({ createdAt: -1 });
                    conv.lastMessage = lastMsg?._id;
                    await conv.save();
                }

                io.to(`chat:${conversationId}`).emit('message:deleted', { messageId, conversationId });
            }
        } catch (err) {}
    });

    // ── Driver: start trip ─────────────────────────────────
    socket.on('driver:startTrip', ({ tripId, shuttleId }: { tripId: string, shuttleId: string }) => {
      if (socket.user?.role !== 'driver') return;
      socket.tripId = tripId;
      socket.shuttleId = shuttleId;
      socket.join(`shuttle:${shuttleId}`);
      console.log(`🚌 Driver ${uid} started trip ${tripId}`);
    });

    // ── Driver: location update ────────────────────────────
    socket.on('shuttle:emergency', ({ shuttleId, lat, lng }: any) => {
        if (!socket.organizationId) return;
        
        io.to(`org:${socket.organizationId}`).emit('shuttle:emergency', {
            shuttleId, lat, lng,
            timestamp: Date.now(),
            driverId: uid
        });
    });

    socket.on('driver:location', async ({ lat, lng, speed, heading, passengerCount, shuttleId, eta, distance, status }: any) => {
      if (socket.user?.role !== 'driver' || !socket.organizationId) return;

      const posData = {
        shuttleId,
        organizationId: socket.organizationId,
        lat, lng, speed: speed || 0,
        heading: heading || 0,
        passengerCount: passengerCount || 0,
        eta: eta || 0,
        distanceRemaining: distance || 0,
        timestamp: Date.now(),
        driverId: uid,
        status: status || 'active'
      };

      await redis.setPosition(shuttleId, posData);

      if (socket.tripId) {
          await Trip.findByIdAndUpdate(socket.tripId, {
              currentLat: lat,
              currentLng: lng,
              etaMinutes: eta,
              distanceRemainingKm: distance
          });
      }

      io.to(`org:${socket.organizationId}`).emit('shuttle:position', posData);

      try {
        const fences = await Geofence.find({
          organizationId: socket.organizationId,
          isActive: true,
        }).populate('stopId', 'name');

        for (const fence of fences as any[]) {
          const dist = haversine(lat, lng, fence.center.lat, fence.center.lng) * 1000;
          const isInside = dist <= fence.radiusMeters;
          
          const stateKey = `geofence:state:${shuttleId}:${fence._id}`;
          const previousState = await redis.get(stateKey);

          if (isInside && previousState !== 'inside') {
            io.to(`org:${socket.organizationId}`).emit('geofence:enter', {
              shuttleId,
              geofenceId: fence._id,
              stopId:   fence.stopId?._id,
              stopName: fence.stopId?.name || fence.name,
              timestamp: Date.now(),
            });

            try {
                const stopId = fence.stopId?._id || fence.stopId;
                if (stopId) {
                    const bookings = await Booking.find({
                        organizationId: socket.organizationId,
                        status: 'confirmed',
                        $or: [
                            { pickupStopId: stopId },
                            { dropoffStopId: stopId }
                        ]
                    });

                    for (const booking of bookings) {
                        const isPickup = booking.pickupStopId?.toString() === stopId.toString();
                        await sendPushNotification(booking.studentId.toString(), {
                            title: isPickup ? '🚌 Shuttle Arrived!' : '📍 Arrival approaching',
                            body: isPickup 
                                ? `Your shuttle has arrived at ${fence.stopId?.name || 'your stop'}. Get ready to board!`
                                : `The shuttle is reaching ${fence.stopId?.name || 'your destination'}. Don't miss your stop!`,
                            icon: '/icons/bus-icon.png',
                            data: { url: '/student', type: 'proximity' }
                        });
                    }
                }
            } catch (e) {}

            await redis.set(stateKey, 'inside', 3600);
          } else if (!isInside && previousState === 'inside') {
            io.to(`org:${socket.organizationId}`).emit('geofence:exit', {
              shuttleId,
              geofenceId: fence._id,
              stopId:   fence.stopId?._id,
              stopName: fence.stopId?.name || fence.name,
              timestamp: Date.now(),
            });
            await redis.set(stateKey, 'outside', 3600);
          }
        }
      } catch (err) {}
    });

    // ── Driver: end trip ──────────────────────────────────
    socket.on('driver:endTrip', async ({ shuttleId }: { shuttleId: string }) => {
      if (socket.user?.role !== 'driver') return;
      await redis.removePosition(shuttleId);
      io.to(`org:${socket.organizationId}`).emit('shuttle:offline', { shuttleId });
      socket.leave(`shuttle:${shuttleId}`);
    });

    // ── Disconnect ────────────────────────────────────────
    socket.on('disconnect', async () => {
      console.log(`🔌 Disconnected: ${uid}`);
      if (uid !== 'guest') {
          onlineUsers.delete(uid);
          if (socket.organizationId) {
              io.to(`org:${socket.organizationId}`).emit('user:status', { userId: uid, status: 'online' });
          }
      }
      if (socket.user?.role === 'driver' && socket.shuttleId) {
        await redis.removePosition(socket.shuttleId);
        if (socket.organizationId) {
          io.to(`org:${socket.organizationId}`).emit('shuttle:offline', {
            shuttleId: socket.shuttleId,
          });
        }
      }
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
};
