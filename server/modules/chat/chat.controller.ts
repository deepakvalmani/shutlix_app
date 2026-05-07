import { Response, NextFunction } from 'express';
import { Conversation } from '../../models/Conversation';
import { Message } from '../../models/Message';
import { User } from '../../models/User';
import mongoose from 'mongoose';

export const getConversations = async (req: any, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user.organizationId?._id || req.user.organizationId;
    const userId = req.user._id;

    if (!orgId) {
      return res.status(400).json({ success: false, message: 'Organization required for chat' });
    }

    // First, ensure the global conversation exists for this org
    let globalChat = await Conversation.findOne({ organizationId: orgId, type: 'global' });
    if (!globalChat) {
      globalChat = await Conversation.create({
        organizationId: orgId,
        type: 'global',
        name: 'Global Announcement',
        participants: [] 
      });
    }

    const conversations = await Conversation.find({
      organizationId: orgId,
      $or: [
        { type: 'global' },
        { participants: userId }
      ]
    })
    .populate('participants', 'name avatar role email')
    .populate({
      path: 'lastMessage',
      populate: { path: 'sender', select: 'name' }
    })
    .sort({ updatedAt: -1 })
    .lean();

    res.json({ success: true, data: conversations });
  } catch (err) { next(err); }
};

export const getMessages = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { conversationId } = req.params;
    const { lastId, limit = 50 } = req.query;
    const userId = req.user._id;
    const orgId = req.user.organizationId?._id || req.user.organizationId;

    // Security: Verify user belongs to this conversation AND organization
    const conversation = await Conversation.findOne({
      _id: conversationId,
      organizationId: orgId,
      $or: [
        { type: 'global' },
        { participants: userId }
      ]
    });

    if (!conversation) {
      return res.status(403).json({ success: false, message: 'Access denied to this conversation' });
    }

    const query: any = { conversationId };
    
    // Cursor-based pagination
    if (lastId) {
      const lastMessage = await Message.findOne({ _id: lastId, conversationId }).select('createdAt');
      if (lastMessage) {
        query.createdAt = { $lt: lastMessage.createdAt };
      }
    }

    const messages = await Message.find(query)
      .populate('sender', 'name avatar role')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .lean();

    // Reset unread count for this user
    if (conversation.unreadCounts) {
      const userUnread = conversation.unreadCounts.find((u: any) => u.userId.toString() === userId.toString());
      if (userUnread && userUnread.count > 0) {
        userUnread.count = 0;
        await conversation.save();
      }
    }

    // Mark messages as read
    await Message.updateMany(
      { 
        conversationId, 
        sender: { $ne: userId }, 
        'readBy.user': { $ne: userId } 
      },
      { 
        $addToSet: { 
          readBy: { user: userId, readAt: new Date() } 
        } 
      }
    );

    res.json({ success: true, data: messages.reverse() });
  } catch (err) { next(err); }
};

export const createConversation = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { type, participants, name } = req.body;
    const orgId = req.user.organizationId?._id || req.user.organizationId;
    const userId = req.user._id;

    if (!orgId) {
      return res.status(400).json({ success: false, message: 'Organization required' });
    }

    // Add current user to participants if not global
    let allParticipants = type === 'global' ? [] : [...new Set([...(participants || []), userId.toString()])];
    
    // Sort participants to ensure consistent DM identification
    if (type === 'dm') {
      allParticipants = allParticipants.sort();
    }

    if (type === 'dm' && allParticipants.length === 2) {
      // Check if DM already exists
      const existing = await Conversation.findOne({
        organizationId: orgId,
        type: 'dm',
        participants: allParticipants
      }).populate('participants', 'name avatar role');

      if (existing) return res.json({ success: true, data: existing });
    }

    const conversation = await Conversation.create({
      organizationId: orgId,
      type,
      participants: allParticipants,
      name
    });

    const populated = await conversation.populate('participants', 'name avatar role');
    res.status(201).json({ success: true, data: populated });
  } catch (err) { next(err); }
};

export const searchUsers = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { q } = req.query;
    const orgId = req.user.organizationId?._id || req.user.organizationId;
    
    if (!q) return res.json({ success: true, data: [] });

    const users = await User.find({
      organizationId: orgId,
      _id: { $ne: req.user._id },
      $text: { $search: q }
    }, { score: { $meta: 'textScore' } })
    .select('name avatar role email')
    .sort({ score: { $meta: 'textScore' } })
    .limit(10);

    res.json({ success: true, data: users });
  } catch (err) { next(err); }
};

export const deleteConversation = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;

    const conversation = await Conversation.findOne({ 
      _id: conversationId, 
      organizationId: req.user.organizationId,
      participants: userId 
    });
    
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found or access denied' });
    }

    if (conversation.type === 'global') {
      return res.status(403).json({ success: false, message: 'Cannot delete global conversation' });
    }

    // Delete all messages in the conversation
    await Message.deleteMany({ conversationId });
    
    // Delete the conversation itself
    await Conversation.findOneAndDelete({ _id: conversationId, organizationId: req.user.organizationId });

    res.json({ success: true, message: 'Conversation deleted' });
  } catch (err) { next(err); }
};

export const updateConversation = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { conversationId } = req.params;
    const { name } = req.body;
    const userId = req.user._id;

    const conversation = await Conversation.findOne({ _id: conversationId, participants: userId });
    
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found or access denied' });
    }

    if (name && conversation.type !== 'dm') {
      conversation.name = name;
    }

    await conversation.save();
    res.json({ success: true, data: conversation });
  } catch (err) { next(err); }
};

export const deleteMessage = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ success: false, message: 'Message not found' });

    // Verify conversation ownership
    const conversation = await Conversation.findOne({ 
      _id: message.conversationId, 
      organizationId: req.user.organizationId,
      participants: userId 
    });

    if (!conversation) {
      return res.status(403).json({ success: false, message: 'Access denied to message conversation' });
    }

    if (message.sender.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: 'You can only delete your own messages' });
    }

    await Message.findOneAndDelete({ _id: messageId, conversationId: message.conversationId });

    // If this was the last message, find the new last message
    if (conversation.lastMessage?.toString() === messageId) {
      const newLastMsg = await Message.findOne({ conversationId: message.conversationId }).sort({ createdAt: -1 });
      conversation.lastMessage = newLastMsg?._id;
      await conversation.save();
    }

    res.json({ success: true, message: 'Message deleted' });
  } catch (err) { next(err); }
};
