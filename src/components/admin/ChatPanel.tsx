import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Send, User, Search, Plus, MessageSquare, Info, X, CheckCheck,
  ChevronLeft, MoreVertical, Smile, Paperclip, Users, Shield, Truck, GraduationCap, Bell
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import useAuthStore from '../../store/authStore';
import useSocket, { getSocket } from '../../hooks/useSocket';
import { Avatar } from '../ui/index';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface Message {
  _id: string;
  conversationId: string;
  sender: {
    _id: string;
    name: string;
    role: string;
    avatar?: string;
  };
  content: string;
  createdAt: string;
  readBy?: { user: string; readAt: string }[];
  status?: 'sending' | 'sent' | 'error';
}

interface Conversation {
  _id: string;
  type: 'dm' | 'group' | 'global';
  name?: string;
  participants: any[];
  lastMessage?: {
    _id: string;
    content: string;
    sender: { name: string };
    createdAt: string;
  };
  unreadCounts?: Record<string, number>;
  updatedAt: string;
}

const ConversationItem = ({ conversation, active, onClick, userId, statusMap }: any) => {
  const isGlobal = conversation.type === 'global';
  const isDM = conversation.type === 'dm';
  
  const otherParticipant = isDM 
    ? conversation.participants.find((p: any) => p._id !== userId)
    : null;

  const isOnline = isDM && otherParticipant && statusMap?.[otherParticipant._id] === 'online';
  const unreadCount = conversation.unreadCounts?.[userId] || 0;

  const displayName = isGlobal 
    ? (conversation.name || 'Global Chat')
    : isDM 
      ? (otherParticipant?.name || 'Private Chat')
      : (conversation.name || 'Group Chat');

  const displayAvatar = isGlobal 
    ? { icon: MessageSquare, bg: 'bg-indigo-500' }
    : isDM 
      ? { user: otherParticipant }
      : { icon: Users, bg: 'bg-emerald-500' };

  return (
    <button 
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 p-3 rounded-2xl transition-all relative group
        ${active ? 'bg-brand/10 border-brand/20' : 'hover:bg-white/5'}
      `}
    >
      {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-brand rounded-r-full" />}
      
      <div className="flex-shrink-0 relative">
        {displayAvatar.user ? (
          <Avatar user={displayAvatar.user} size={44} />
        ) : (
          <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white ${displayAvatar.bg}`}>
            {displayAvatar.icon && <displayAvatar.icon size={20} />}
          </div>
        )}
        {isOnline && (
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2" 
               style={{ borderColor: 'var(--bg-base)' }} />
        )}
      </div>

      <div className="flex-1 text-left min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <p className="font-bold text-sm truncate" style={{ color: 'var(--text-1)' }}>{displayName}</p>
          {conversation.lastMessage && (
            <span className="text-[10px]" style={{ color: 'var(--text-4)' }}>
              {new Date(conversation.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs truncate opacity-60 flex-1" style={{ color: 'var(--text-3)' }}>
            {conversation.lastMessage 
              ? `${conversation.lastMessage.sender.name}: ${conversation.lastMessage.content}` 
              : 'No messages yet'}
          </p>
          {unreadCount > 0 && !active && (
            <span className="flex-shrink-0 min-w-[18px] h-[18px] flex items-center justify-center bg-brand text-white text-[10px] font-bold rounded-full px-1">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
};

const UserSearchModal = ({ onClose, onSelect }: any) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (query.trim()) search();
            else setResults([]);
        }, 500);
        return () => clearTimeout(timer);
    }, [query]);

    const search = async () => {
        setLoading(true);
        try {
            const { data } = await api.get(`/chat/users/search?q=${encodeURIComponent(query)}`);
            setResults(data.data);
        } catch (e) {
            toast.error('Search failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="glass-heavy rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl border border-border-1"
            >
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-display font-black tracking-tight" style={{ color: 'var(--text-1)' }}>New Message</h2>
                    <button onClick={onClose} className="w-10 h-10 rounded-xl hover:bg-white/10 flex items-center justify-center transition-all"><X size={20}/></button>
                </div>

                <div className="relative mb-6">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30" size={18} />
                    <input 
                        className="input pl-11" 
                        placeholder="Search users..." 
                        value={query} 
                        onChange={e => setQuery(e.target.value)}
                        autoFocus
                    />
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
                    {loading ? (
                        <div className="flex justify-center p-8"><Loader2 iClass="animate-spin text-brand" size={24} /></div>
                    ) : results.length === 0 ? (
                        <p className="text-center py-8 text-xs opacity-50 font-bold uppercase tracking-widest">{query ? 'No users found' : 'Type to search...'}</p>
                    ) : (
                        results.map(user => (
                            <button 
                                key={user._id} 
                                onClick={() => onSelect(user)}
                                className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-white/5 transition-all group"
                            >
                                <Avatar user={user} size={40} />
                                <div className="text-left flex-1">
                                    <p className="font-bold text-sm" style={{ color: 'var(--text-1)' }}>{user.name}</p>
                                    <p className="text-[10px] uppercase tracking-wider font-black opacity-40">{user.role}</p>
                                </div>
                                <div className="text-brand opacity-0 group-hover:opacity-100 transition-opacity"><Plus size={20} /></div>
                            </button>
                        ))
                    )}
                </div>
            </motion.div>
        </div>
    );
};

const Loader2 = ({ iClass, size }: any) => (
  <div className={iClass}>
    <Search size={size} className="animate-pulse" />
  </div>
);

const ChatPanel = () => {
    const { user } = useAuthStore();
    const { emitMessage, joinOrganization, joinConversation } = useSocket();
  
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [content, setContent] = useState('');
    const [loadingConv, setLoadingConv] = useState(true);
    const [loadingMsgs, setLoadingMsgs] = useState(false);
    const [isTyping, setIsTyping] = useState<Record<string, string>>({});
    const [showUserSearch, setShowUserSearch] = useState(false);
    const [statusMap, setStatusMap] = useState<Record<string, 'online' | 'offline'>>({});

    const scrollRef = useRef<HTMLDivElement>(null);
    const typingTimeoutRef = useRef<any>(null);

    useEffect(() => {
        joinOrganization();
        loadConversations();

        const socket = getSocket();
        
        const handleReceive = (msg: Message) => {
            if (activeConversation && msg.conversationId === activeConversation._id) {
                if (msg.sender._id !== user._id) {
                    socket.emit('message:read', { conversationId: msg.conversationId });
                }
                setMessages(prev => {
                    if (prev.find(p => p._id === msg._id)) return prev;
                    // Remove optimistic if exists
                    const filtered = prev.filter(p => !p._id.startsWith('temp-') || p.content !== msg.content);
                    return [...filtered, msg];
                });
                setTimeout(() => scrollToBottom(), 50);
            }
            
            setConversations(prev => {
                const updated = prev.map(c => {
                    if (c._id === msg.conversationId) {
                        return {
                            ...c,
                            lastMessage: {
                                _id: msg._id,
                                content: msg.content,
                                sender: msg.sender,
                                createdAt: msg.createdAt
                            },
                            updatedAt: msg.createdAt,
                            unreadCounts: {
                                ...c.unreadCounts,
                                [user._id]: (msg.sender._id !== user._id && activeConversation?._id !== msg.conversationId)
                                    ? (Number(c.unreadCounts?.[user._id] || 0)) + 1
                                    : (Number(c.unreadCounts?.[user._id] || 0))
                            }
                        };
                    }
                    return c;
                });
                return updated.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
            });
        };

        socket.on('message:receive', handleReceive);
        socket.on('chat:typing', ({ userId, isTyping: typing, userName }: any) => {
            setIsTyping(prev => {
                const next = { ...prev };
                if (typing) next[userId] = userName;
                else delete next[userId];
                return next;
            });
        });

        socket.on('user:status', ({ userId, status }: any) => {
            setStatusMap(prev => ({ ...prev, [userId]: status }));
        });

        return () => {
            socket.off('message:receive', handleReceive);
            socket.off('chat:typing');
        };
    }, [activeConversation?._id]);

    const loadConversations = async () => {
        try {
            const { data } = await api.get('/chat/conversations');
            setConversations(data.data || []);
            if (data.data.length > 0 && !activeConversation) {
                // selectConversation(data.data[0]); // Optional: auto-select first
            }
        } catch (err) {
            toast.error('Failed to load chats');
        } finally {
            setLoadingConv(false);
        }
    };

    const loadMessages = async (convId: string) => {
        setLoadingMsgs(true);
        try {
            const { data } = await api.get(`/chat/conversations/${convId}/messages`, {
                params: { limit: 50 }
            });
            setMessages(data.data || []);
            setTimeout(() => scrollToBottom(), 50);
        } catch (err) {
            toast.error('Failed to load messages');
        } finally {
            setLoadingMsgs(false);
        }
    };

    const selectConversation = (conv: Conversation) => {
        setActiveConversation(conv);
        setIsTyping({});
        joinConversation(conv._id);
        loadMessages(conv._id);
        
        setConversations(prev => prev.map(c => 
            c._id === conv._id ? { ...c, unreadCounts: { ...c.unreadCounts, [user._id]: 0 } } : c
        ));
        getSocket().emit('message:read', { conversationId: conv._id });
    };

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim() || !activeConversation) return;

        const orgId = typeof user.organizationId === 'string' ? user.organizationId : user.organizationId?._id;
        
        // Optimistic
        const tempId = `temp-${Date.now()}`;
        const optimisticMsg: Message = {
            _id: tempId,
            conversationId: activeConversation._id,
            sender: { _id: user._id, name: user.name, role: user.role, avatar: user.avatar },
            content: content.trim(),
            createdAt: new Date().toISOString()
        };
        setMessages(prev => [...prev, optimisticMsg]);
        setTimeout(() => scrollToBottom(), 50);

        emitMessage(orgId, content.trim(), activeConversation._id);
        setContent('');
    };

    const scrollToBottom = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    };

    const handleStartDM = async (otherUser: any) => {
        try {
            const { data } = await api.post('/chat/conversations', {
                type: 'dm',
                participants: [otherUser._id]
            });
            const newConv = data.data;
            setConversations(prev => {
                const exists = prev.find(c => c._id === newConv._id);
                if (exists) return prev;
                return [newConv, ...prev];
            });
            selectConversation(newConv);
            setShowUserSearch(false);
        } catch {
            toast.error('Failed to start chat');
        }
    };

    return (
        <div className="h-[calc(100vh-12rem)] flex overflow-hidden rounded-[2.5rem] border border-border-1 glass-md shadow-2xl">
            <aside className="w-80 flex flex-col border-r border-border-1 bg-white/5">
                <div className="p-6 border-b border-border-1">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-display font-black text-xl tracking-tight" style={{ color: 'var(--text-1)' }}>Messages</h2>
                        <button 
                            onClick={() => setShowUserSearch(true)}
                            className="w-10 h-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center hover:bg-brand/20 transition-all"
                        >
                            <Plus size={20} />
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
                    {loadingConv ? (
                        <div className="space-y-4">
                            {[1,2,3].map(i => <div key={i} className="h-16 w-full rounded-2xl bg-white/5 animate-pulse" />)}
                        </div>
                    ) : (
                        conversations.map(conv => (
                            <ConversationItem 
                                key={conv._id}
                                conversation={conv}
                                active={activeConversation?._id === conv._id}
                                onClick={() => selectConversation(conv)}
                                userId={user._id}
                                statusMap={statusMap}
                            />
                        ))
                    )}
                </div>
            </aside>

            <main className="flex-1 flex flex-col min-w-0 bg-white/5">
                {activeConversation ? (
                    <>
                        <header className="p-4 border-b border-border-1 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {activeConversation.type === 'dm' ? (
                                    <Avatar user={activeConversation.participants.find(p => p._id !== user._id)} size={40} />
                                ) : (
                                    <div className="w-10 h-10 rounded-xl bg-brand/20 text-brand flex items-center justify-center">
                                        <Users size={20} />
                                    </div>
                                )}
                                <div>
                                    <h3 className="font-bold text-sm" style={{ color: 'var(--text-1)' }}>
                                        {activeConversation.type === 'dm' 
                                            ? activeConversation.participants.find(p => p._id !== user._id)?.name 
                                            : activeConversation.name || 'Group Chat'}
                                    </h3>
                                    <p className="text-[10px] uppercase font-black opacity-30 tracking-widest mt-0.5">
                                        {Object.keys(isTyping).length > 0 ? 'Typing...' : 'Connected'}
                                    </p>
                                </div>
                            </div>
                        </header>

                        <div 
                            ref={scrollRef}
                            className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar"
                            style={{ background: 'var(--whatsapp-bg)' }}
                        >
                            {messages.map((msg, idx) => {
                                const isMe = msg.sender?._id === user?._id;
                                return (
                                    <div key={msg._id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`
                                            max-w-[70%] px-4 py-2 rounded-2xl text-sm relative shadow-sm
                                            ${isMe 
                                                ? 'bg-brand text-white rounded-tr-none' 
                                                : 'bg-white dark:bg-zinc-800 text-neutral-800 dark:text-zinc-100 rounded-tl-none border border-border-1'}
                                        `}>
                                            {!isMe && <p className="text-[10px] font-black uppercase tracking-tighter opacity-50 mb-1">{msg.sender.name}</p>}
                                            <p className="leading-relaxed">{msg.content}</p>
                                            <p className={`text-[9px] mt-1 text-right opacity-50 ${isMe ? 'text-white/70' : ''}`}>
                                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <form onSubmit={handleSend} className="p-4 border-t border-border-1 flex items-center gap-2">
                            <input 
                                className="input flex-1"
                                placeholder="Type a message..."
                                value={content}
                                onChange={e => setContent(e.target.value)}
                            />
                            <button type="submit" className="w-12 h-12 rounded-xl bg-brand text-white flex items-center justify-center hover:scale-105 transition-all shadow-lg active:scale-95">
                                <Send size={20} />
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center opacity-30">
                        <MessageSquare size={64} className="mb-4" />
                        <h3 className="font-display font-black text-xl">Operational Communications</h3>
                        <p className="text-xs uppercase font-black tracking-[0.2em] mt-2">Select a channel to transmit</p>
                    </div>
                )}
            </main>

            {showUserSearch && (
                <UserSearchModal 
                    onClose={() => setShowUserSearch(false)}
                    onSelect={handleStartDM}
                />
            )}
        </div>
    );
};

export default ChatPanel;
