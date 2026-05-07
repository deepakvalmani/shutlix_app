import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Send, User, Plane as MessagePlane, Shield, Truck, GraduationCap, 
  ChevronLeft, MoreVertical, Search, Smile, Paperclip, Plus, 
  Users, MessageSquare, Info, X, Check, CheckCheck,
  Bell, BellOff
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import useAuthStore from '../store/authStore';
import useSocket from '../hooks/useSocket';
import { getSocket } from '../services/socket';
import { Avatar } from '../components/ui/index';
import api from '../services/api';
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
        ${active ? 'bg-brand/10 border-brand/20' : 'hover:bg-glass-2'}
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
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-900" 
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
        }, 500); // Increased debounce for performance
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
                className="bg-glass-3 rounded-3xl w-full max-w-md p-6 shadow-2xl border border-border-1"
            >
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-display font-bold">New Message</h2>
                    <button onClick={onClose} className="btn-ghost btn-icon"><X size={20}/></button>
                </div>

                <div className="relative mb-6">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30" size={18} />
                    <input 
                        className="input pl-11" 
                        placeholder="Search by name or email..." 
                        value={query} 
                        onChange={e => setQuery(e.target.value)}
                        autoFocus
                    />
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto pr-2">
                    {loading ? (
                        <div className="flex justify-center p-8"><span className="loader"><span/><span/><span/></span></div>
                    ) : results.length === 0 ? (
                        <p className="text-center py-8 text-xs opacity-50">{query ? 'No users found' : 'Type to search for friends...'}</p>
                    ) : (
                        results.map(user => (
                            <button 
                                key={user._id} 
                                onClick={() => onSelect(user)}
                                className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-glass-2 transition-all"
                            >
                                <Avatar user={user} size={40} />
                                <div className="text-left">
                                    <p className="font-bold text-sm">{user.name}</p>
                                    <p className="text-[10px] uppercase tracking-wider font-bold opacity-50">{user.role}</p>
                                </div>
                                <div className="ml-auto text-brand opacity-0 group-hover:opacity-100"><Plus size={20} /></div>
                            </button>
                        ))
                    )}
                </div>
            </motion.div>
        </div>
    );
};

const ChatPage = () => {
  const { user } = useAuthStore();
  const { emitMessage, joinOrganization, joinConversation } = useSocket();
  const navigate = useNavigate();
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [content, setContent] = useState('');
  const [loadingConv, setLoadingConv] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isTyping, setIsTyping] = useState<Record<string, string>>({}); // userId -> userName
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [showChatSettings, setShowChatSettings] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mutedConvs, setMutedConvs] = useState<string[]>(() => {
    const saved = localStorage.getItem('muted_conversations');
    return saved ? JSON.parse(saved) : [];
  });
  const [showChatInfo, setShowChatInfo] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [statusMap, setStatusMap] = useState<Record<string, 'online' | 'offline'>>({});

  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<any>(null);

  useEffect(() => {
    localStorage.setItem('muted_conversations', JSON.stringify(mutedConvs));
  }, [mutedConvs]);

  const toggleMute = (convId: string) => {
    setMutedConvs(prev => 
      prev.includes(convId) ? prev.filter(id => id !== convId) : [...prev, convId]
    );
    toast.success(mutedConvs.includes(convId) ? 'Notifications unmuted' : 'Notifications muted');
  };

  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages;
    return messages.filter(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [messages, searchQuery]);

  useEffect(() => {
    joinOrganization();
    loadConversations();

    const socket = getSocket();
    
    const handleReceive = (msg: Message) => {
      // 1. Update message list if in active chat
      if (activeConversation && msg.conversationId === activeConversation._id) {
        if (msg.sender._id !== user._id) {
          socket.emit('message:read', { conversationId: msg.conversationId });
        }
        
        setMessages(prev => {
          // Check for existing optimistic message
          const tempMsg = prev.find(p => p._id.startsWith('temp-') && p.content === msg.content && p.sender._id === msg.sender._id);
          if (tempMsg) {
            return prev.map(p => p._id === tempMsg._id ? { ...msg, status: 'sent' } : p);
          }
          if (prev.find(p => p._id === msg._id)) return prev;
          return [...prev, msg];
        });
        setTimeout(() => scrollToBottom(), 50);
      }
      
      // 2. Update sidebar (last message + unread count)
    setConversations((prev: Conversation[]) => {
          const updated = prev.map(c => {
              if (c._id === msg.conversationId) {
                  const isSender = msg.sender._id === user._id;
                  const isActive = activeConversation?._id === msg.conversationId;
                  
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
                          [user._id]: (!isSender && !isActive) 
                            ? (Number(c.unreadCounts?.[user._id] || 0)) + 1 
                            : (Number(c.unreadCounts?.[user._id] || 0))
                      }
                  };
              }
              return c;
          });
          return updated.sort((a: Conversation, b: Conversation) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      });
    };

    socket.on('message:receive', handleReceive);
    socket.on('chat:typing', ({ userId, isTyping: typing, userName }: any) => {
        setIsTyping((prev: Record<string, string>) => {
            const next = { ...prev };
            if (typing) next[userId] = userName;
            else delete next[userId];
            return next;
        });
    });

    socket.on('user:status', ({ userId, status }: { userId: string, status: 'online' | 'offline' }) => {
        setStatusMap((prev: Record<string, 'online' | 'offline'>) => ({ ...prev, [userId]: status }));
    });

    socket.on('message:read_update', ({ userId, conversationId }: any) => {
        if (activeConversation?._id === conversationId) {
            setMessages(prev => prev.map(m => {
                if (m.sender._id === user._id) {
                    const readBy = m.readBy || [];
                    if (!readBy.some(r => r.user === userId)) {
                        return { ...m, readBy: [...readBy, { user: userId, readAt: new Date().toISOString() }] };
                    }
                }
                return m;
            }));
        }
        
        setConversations((prev: Conversation[]) => prev.map(c => {
            if (c._id === conversationId) {
                return { ...c, unreadCounts: { ...c.unreadCounts, [userId]: 0 } };
            }
            return c;
        }));
    });

    socket.on('message:deleted', ({ messageId, conversationId }: any) => {
        if (activeConversation?._id === conversationId) {
            setMessages(prev => prev.filter(m => m._id !== messageId));
        }
    });

    return () => {
      socket.off('message:receive', handleReceive);
      socket.off('chat:typing');
      socket.off('message:read_update');
      socket.off('message:deleted');
    };
  }, [activeConversation?._id]);

  const loadConversations = async () => {
    try {
      const { data } = await api.get('/chat/conversations');
      setConversations(data.data || []);
      if (data.data.length > 0 && !activeConversation) {
        selectConversation(data.data[0]);
      }
    } catch (err) {
      toast.error('Failed to load chats');
    } finally {
      setLoadingConv(false);
    }
  };

  const loadMessages = async (convId: string, lastId?: string) => {
    const isMore = !!lastId;
    if (isMore) setLoadingMore(true);
    else setLoadingMsgs(true);

    try {
      const { data } = await api.get(`/chat/conversations/${convId}/messages`, {
        params: { lastId, limit: 30 }
      });
      const newMsgs = data.data || [];
      
      setMessages(prev => isMore ? [...newMsgs, ...prev] : newMsgs);
      setHasMore(newMsgs.length === 30);
      
      if (!isMore) setTimeout(() => scrollToBottom(), 50);
    } catch (err) {
      toast.error('Failed to load messages');
    } finally {
      setLoadingMsgs(false);
      setLoadingMore(false);
    }
  };

  const selectConversation = (conv: Conversation) => {
    setActiveConversation(conv);
    setIsSidebarOpen(false);
    setHasMore(true);
    setIsTyping({});
    joinConversation(conv._id);
    loadMessages(conv._id);
    
    // Clear unread in frontend immediately
    setConversations((prev: Conversation[]) => prev.map(c => 
        c._id === conv._id ? { ...c, unreadCounts: { ...c.unreadCounts, [user._id]: 0 } } : c
    ));
    getSocket().emit('message:read', { conversationId: conv._id });
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('Delete this message for everyone?')) return;
    try {
        await api.delete(`/chat/messages/${messageId}`);
        setMessages(prev => prev.filter(m => m._id !== messageId));
        getSocket().emit('message:delete', { messageId, conversationId: activeConversation?._id });
    } catch {
        toast.error('Failed to delete message');
    }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setContent(e.target.value);
    
    if (!activeConversation) return;
    
    const socket = getSocket();
    socket.emit('chat:typing', { conversationId: activeConversation._id, isTyping: true });
    
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
        socket.emit('chat:typing', { conversationId: activeConversation._id, isTyping: false });
    }, 2000);
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollTop < 50 && hasMore && !loadingMore && !loadingMsgs && messages.length > 0) {
        loadMessages(activeConversation!._id, messages[0]._id);
    }
  };

  const handleStartDM = async (otherUser: any) => {
    try {
        const { data } = await api.post('/chat/conversations', {
            type: 'dm',
            participants: [otherUser._id]
        });
        
        const newConv = data.data;
        setConversations((prev: Conversation[]) => {
            const exists = prev.find(c => c._id === newConv._id);
            if (exists) return prev;
            return [newConv, ...prev];
        });
        
        selectConversation(newConv);
        setShowUserSearch(false);
    } catch (err) {
        toast.error('Could not start conversation');
    }
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !activeConversation) return;

    const orgId = typeof user.organizationId === 'string' ? user.organizationId : user.organizationId?._id;
    if (!orgId) {
        toast.error('Missing organization context');
        return;
    }

    // Optimistic Update
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: Message = {
        _id: tempId,
        conversationId: activeConversation._id,
        sender: {
            _id: user._id,
            name: user.name,
            role: user.role,
            avatar: user.avatar
        },
        content: content.trim(),
        createdAt: new Date().toISOString()
    };

    setMessages(prev => [...prev, optimisticMsg]);
    setTimeout(() => scrollToBottom(), 100);

    emitMessage(orgId, content.trim(), activeConversation._id);
    setContent('');
  };

  const handleDeleteChat = async () => {
    if (!activeConversation || activeConversation.type === 'global') return;
    if (!confirm('Are you sure you want to delete this conversation and all its messages?')) return;

    try {
        await api.delete(`/chat/conversations/${activeConversation._id}`);
        toast.success('Conversation deleted');
        setConversations(prev => prev.filter(c => c._id !== activeConversation._id));
        setActiveConversation(null);
        setShowChatInfo(false);
    } catch (err) {
        toast.error('Failed to delete conversation');
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
        case 'admin': return <Shield size={10} className="text-violet-500" />;
        case 'driver': return <Truck size={10} className="text-green-500" />;
        default: return <GraduationCap size={10} className="text-blue-500" />;
    }
  };

  const activeChatName = activeConversation ? (
      activeConversation.type === 'global' ? 'Global Chat' :
      activeConversation.type === 'dm' ? activeConversation.participants.find(p => p._id !== user._id)?.name :
      activeConversation.name
  ) : 'Select a Chat';

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      {/* Sidebar */}
      <aside 
        className={`
            fixed inset-0 z-40 md:relative md:flex flex-col w-full md:w-80 flex-shrink-0 transition-transform duration-300
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
        style={{ background: 'var(--glass-3)', borderRight: '1px solid var(--border-1)', backdropFilter: 'blur(24px)' }}
      >
        <div className="p-5 pb-3">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
               <button onClick={() => navigate(-1)} className="p-2 hover:bg-glass-2 rounded-xl text-text-3">
                   <ChevronLeft size={20} />
               </button>
               <h1 className="font-display font-black text-xl tracking-tight">Messages</h1>
            </div>
            <button onClick={() => setShowUserSearch(true)} className="w-10 h-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center hover:bg-brand/20 transition-all">
                <Plus size={20} />
            </button>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 opacity-30" size={16} />
            <input 
              className="input pl-10" 
              placeholder="Search chats..." 
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loadingConv ? (
             <div className="flex flex-col gap-4 p-4">
                 {[1,2,3,4].map(i => <div key={i} className="h-16 w-full rounded-2xl animate-pulse bg-glass-2" />)}
             </div>
          ) : conversations.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <div className="w-16 h-16 rounded-3xl bg-glass-2 flex items-center justify-center mb-4 opacity-50">
                    <MessageSquare size={32} />
                </div>
                <p className="font-bold text-sm">No conversations</p>
                <p className="text-xs opacity-50 mt-1">Start a private chat or join a group to see them here.</p>
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
        
        <div className="p-4 border-t border-border-1 bg-glass-1/50 backdrop-blur-xl">
             <div className="flex items-center gap-3">
                 <Avatar user={user} size={36} />
                <div className="flex-1 min-w-0">
                    <p className="font-bold text-xs truncate leading-tight">{user?.name}</p>
                    <p className="text-[10px] uppercase font-black tracking-widest opacity-40 leading-none mt-1">{user?.role}</p>
                </div>
                <button onClick={() => setShowChatSettings(true)} className="btn-ghost btn-icon opacity-50 hover:opacity-100 transition-opacity">
                    <MoreVertical size={16}/>
                </button>
             </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        {/* Header */}
        <header className="flex-shrink-0 px-4 py-3 flex items-center justify-between z-10"
          style={{ background: 'var(--glass-3)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border-1)' }}>
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(true)} className="btn-ghost btn-icon md:hidden">
              <ChevronLeft size={20} />
            </button>
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand/5 flex items-center justify-center relative">
                    {activeConversation?.type === 'dm' ? (
                        <>
                            <Avatar user={activeConversation.participants.find(p => p._id !== user._id)} size={40} />
                            {mutedConvs.includes(activeConversation._id) && (
                                <div className="absolute -top-1 -right-1 p-0.5 rounded-full bg-orange-500 text-white border-2 border-[var(--bg-base)]">
                                    <Bell size={8} />
                                </div>
                            )}
                        </>
                    ) : (
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white relative ${activeConversation?.type === 'global' ? 'bg-indigo-500' : 'bg-emerald-500'}`}>
                            {activeConversation?.type === 'global' ? <MessageSquare size={18} /> : <Users size={18} />}
                            {mutedConvs.includes(activeConversation?._id || '') && (
                                <div className="absolute -top-1 -right-1 p-0.5 rounded-full bg-orange-500 text-white border-2 border-[var(--bg-base)]">
                                    <Bell size={8} />
                                </div>
                            )}
                        </div>
                    )}
                </div>
                        <div className="flex-1 min-w-0">
                            <h2 className="font-display font-bold text-base leading-none truncate">{activeChatName}</h2>
                            <div className="flex items-center gap-1.5 mt-1 h-3">
                                {Object.keys(isTyping).length > 0 ? (
                                    <div className="flex items-center gap-1">
                                        <span className="text-[10px] text-brand font-bold animate-pulse">
                                            {Object.values(isTyping).join(', ')} is typing...
                                        </span>
                                    </div>
                                ) : (
                                    <>
                                        <div className={`w-1.5 h-1.5 rounded-full ${
                                            activeConversation?.type === 'dm' 
                                                ? (statusMap[activeConversation.participants.find(p => p._id !== user._id)?._id] === 'online' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-neutral-500')
                                                : 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]'
                                        }`} />
                                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-50">
                                            {activeConversation?.type === 'dm' 
                                                ? (statusMap[activeConversation.participants.find(p => p._id !== user._id)?._id] === 'online' ? 'Online' : 'Offline')
                                                : 'Public Channel'
                                            }
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
              {searchQuery && (
                  <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-brand/10 border border-brand/20">
                      <Search size={14} className="text-brand" />
                      <span className="text-[10px] font-bold text-brand uppercase tracking-widest">{filteredMessages.length} results</span>
                      <button onClick={() => setSearchQuery('')} className="p-1 hover:bg-brand/10 rounded-lg"><X size={12} className="text-brand" /></button>
                  </div>
              )}
              <button 
                onClick={() => {
                  const term = prompt('Current search term:', searchQuery);
                  if (term !== null) setSearchQuery(term);
                }} 
                className={`btn-ghost btn-icon ${searchQuery ? 'text-brand bg-brand/10' : 'opacity-50'}`}
              >
                  <Search size={18} />
              </button>
              <button onClick={() => setShowChatInfo(!showChatInfo)} className={`btn-ghost btn-icon ${showChatInfo ? 'text-brand bg-brand/10' : 'opacity-50'}`}><Info size={18} /></button>
              <button className="btn-ghost btn-icon md:hidden"><MoreVertical size={18} className="opacity-50" /></button>
          </div>
        </header>

        {/* Messages */}
        <div 
          ref={scrollRef} 
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-4 space-y-2 pb-10" 
          style={{ background: 'var(--whatsapp-bg)' }}
        >
          {loadingMore && (
              <div className="flex justify-center py-2">
                  <span className="loader scale-50"><span/><span/><span/></span>
              </div>
          )}
          {loadingMsgs ? (
              <div className="flex flex-col items-center justify-center h-full opacity-50">
                  <div className="loader mb-2"><span/><span/><span/></div>
              </div>
          ) : !activeConversation ? (
              <div className="flex flex-col items-center justify-center h-full opacity-40 text-center px-12">
                  <div className="w-20 h-20 rounded-[2.5rem] bg-glass-1 border border-border-1 flex items-center justify-center mb-6 text-brand/40">
                      <MessageSquare size={44} />
                  </div>
                  <h3 className="font-display font-bold text-xl mb-2">Private & Encrypted</h3>
                  <p className="text-xs max-w-xs mx-auto leading-relaxed">
                      Select a conversation on the left to start chatting with your fleet members.
                  </p>
              </div>
          ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full opacity-40 text-center px-12">
                   <div className="w-12 h-12 rounded-2xl bg-glass-1 flex items-center justify-center mb-4">
                       <Smile size={24} />
                   </div>
                   <p className="text-xs font-bold uppercase tracking-widest">Say wave to start!</p>
              </div>
          ) : (
              filteredMessages.map((msg, idx) => {
                  const isMe = msg.sender?._id === user?._id;
                  const prevMsg = idx > 0 ? messages[idx-1] : null;
                  const showSender = !prevMsg || prevMsg.sender?._id !== msg.sender?._id;

                  return (
                      <div key={msg._id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group animate-fade-in mb-1`}>
                          {!isMe && showSender && (
                              <div className="mt-1 mr-2 flex-shrink-0">
                                  <Avatar user={msg.sender} size={32} />
                              </div>
                          )}
                          {!isMe && !showSender && <div className="w-10 mr-2 flex-shrink-0" />}

                          <div className={`max-w-[85%] sm:max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                              {showSender && !isMe && (
                                  <div className="flex items-center gap-1.5 ml-1 mb-1">
                                      <span className="text-[10px] font-bold opacity-60">{msg.sender?.name}</span>
                                      {getRoleIcon(msg.sender?.role)}
                                  </div>
                              )}
                              
                              <div className={`
                                  px-3 py-2 rounded-xl text-[13px] relative shadow-sm leading-relaxed
                                  ${isMe 
                                      ? 'bg-[#d9fdd3] dark:bg-[#005c4b] text-neutral-800 dark:text-zinc-100 rounded-tr-none' 
                                      : 'bg-white dark:bg-zinc-800 text-neutral-800 dark:text-zinc-100 rounded-tl-none'}
                              `}>
                                  {/* WhatsApp Tail */}
                                  <div className={`absolute top-0 w-3 h-3 ${isMe ? '-right-2' : '-left-2'}`}>
                                      <svg viewBox="0 0 8 13" className={`w-full h-full ${isMe ? 'text-[#d9fdd3] dark:text-[#005c4b]' : 'text-white dark:text-zinc-800'}`} fill="currentColor">
                                          {isMe ? (
                                              <path d="M5.126 1.1c.365-.333.644-.45 1.174-.45H8v12L5.807 10.354l-5.32-5.32c-.65-.65-.65-1.704 0-2.354L5.126 1.1z" transform="scale(-1 1) translate(-8 0)"/>
                                          ) : (
                                              <path d="M5.126 1.1c.365-.333.644-.45 1.174-.45H8v12L5.807 10.354l-5.32-5.32c-.65-.65-.65-1.704 0-2.354L5.126 1.1z" />
                                          )}
                                      </svg>
                                  </div>

                                  <div className="pr-12">
                                       {msg.content}
                                  </div>
                                  
                                  <div className="absolute bottom-1 right-2 flex items-center gap-1">
                                      <span className="text-[9px] opacity-50">
                                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                      {isMe && (
                                          <div className="flex items-center">
                                               {msg.readBy && msg.readBy.length > 0 ? (
                                                   <CheckCheck size={12} className="text-[#53bdeb] drop-shadow-sm" />
                                               ) : (
                                                   <CheckCheck size={12} className="text-neutral-400 opacity-60" />
                                               )}
                                          </div>
                                      )}
                                  </div>
                                  
                                  {isMe && !msg._id.startsWith('temp-') && (
                                      <button 
                                          onClick={() => handleDeleteMessage(msg._id)}
                                          className="absolute -left-8 top-1/2 -translate-y-1/2 p-2 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:scale-110"
                                      >
                                          <X size={14} />
                                      </button>
                                  )}
                              </div>
                          </div>
                      </div>
                  );
              })
          )}
        </div>

        {/* Input Area */}
        <AnimatePresence>
            {activeConversation && (
                <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="flex-shrink-0 p-4 pt-2"
                    style={{ background: 'var(--glass-3)', borderTop: '1px solid var(--border-1)', backdropFilter: 'blur(20px)' }}
                >
                    <form onSubmit={handleSend} className="flex items-end gap-2 max-w-4xl mx-auto">
                        <div className="flex-1 bg-glass-1 rounded-2xl border border-border-1 focus-within:border-brand/40 focus-within:shadow-[0_0_15px_rgba(37,99,235,0.05)] transition-all flex flex-col p-2">
                             <input
                                className="bg-transparent border-none outline-none px-2 py-1.5 text-sm"
                                placeholder="Write your message..."
                                value={content}
                                onChange={handleTyping}
                            />
                            <div className="flex items-center justify-between mt-1 px-1">
                                <div className="flex items-center gap-0.5">
                                    <button type="button" className="p-1.5 hover:bg-glass-2 rounded-lg text-text-4 transition-colors"><Smile size={18} /></button>
                                    <button type="button" className="p-1.5 hover:bg-glass-2 rounded-lg text-text-4 transition-colors"><Paperclip size={18} /></button>
                                </div>
                                <span className="text-[10px] opacity-30 font-medium">Auto-saved as draft</span>
                            </div>
                        </div>
                        <button 
                            type="submit" 
                            disabled={!content.trim()} 
                            className={`
                                w-11 h-11 rounded-2xl flex items-center justify-center transition-all active:scale-90 disabled:opacity-50
                                ${content.trim() ? 'bg-brand text-white shadow-lg shadow-brand/30' : 'bg-glass-2 text-text-4'}
                            `}
                        >
                            <Send size={18} />
                        </button>
                    </form>
                </motion.div>
            )}
        </AnimatePresence>

        {/* Info Panel Overlay */}
        <AnimatePresence>
            {showChatInfo && activeConversation && (
                <motion.div 
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    className="absolute right-0 top-0 bottom-0 w-80 z-50 glass-heavy border-l border-border-1 flex flex-col"
                >
                    <div className="p-6 border-b border-border-1 flex items-center justify-between">
                        <h3 className="font-display font-black text-lg">Chat Details</h3>
                        <button onClick={() => setShowChatInfo(false)} className="btn-ghost btn-icon"><X size={20}/></button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 text-center">
                         <div className="flex justify-center mb-6">
                            {activeConversation.type === 'dm' ? (
                                <Avatar user={activeConversation.participants.find(p => p._id !== user._id)} size={96} />
                            ) : (
                                <div className={`w-24 h-24 rounded-3xl flex items-center justify-center text-white text-3xl ${activeConversation.type === 'global' ? 'bg-indigo-500' : 'bg-emerald-500'}`}>
                                    {activeConversation.type === 'global' ? <MessageSquare size={44} /> : <Users size={44} />}
                                </div>
                            )}
                         </div>
                         <h4 className="text-xl font-display font-bold mb-1">{activeChatName}</h4>
                         <p className="text-[10px] uppercase font-black tracking-widest opacity-40 mb-8">{activeConversation.type} • {activeConversation.participants.length} members</p>

                         <div className="space-y-3">
                             <div className="p-4 rounded-2xl bg-glass-1 border border-border-1 text-left">
                                 <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-2">Members</p>
                                 <div className="space-y-2">
                                     {activeConversation.participants.map((p: any) => (
                                         <div key={p._id} className="flex items-center gap-2">
                                             <Avatar user={p} size={24} />
                                             <span className="text-xs font-medium">{p.name} {p._id === user._id ? '(You)' : ''}</span>
                                         </div>
                                     ))}
                                     {activeConversation.type === 'global' && <p className="text-xs opacity-50 italic">Everyone in your organization</p>}
                                 </div>
                             </div>

                             <div className="p-4 rounded-2xl bg-glass-1 border border-border-1 text-left">
                                 <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-2">Options</p>
                                 <button onClick={() => {
                                     const term = prompt('Search messages in this chat:', searchQuery);
                                     if (term !== null) setSearchQuery(term);
                                 }} className="w-full text-left py-2 text-xs font-bold flex items-center justify-between hover:text-brand transition-colors group">
                                     <span>Search Messages</span>
                                     <Search size={14} className="opacity-40 group-hover:opacity-100" />
                                 </button>
                                 <button onClick={() => toggleMute(activeConversation._id)} className="w-full text-left py-2 text-xs font-bold flex items-center justify-between hover:text-brand transition-colors group">
                                     <span>{mutedConvs.includes(activeConversation._id) ? 'Unmute Notifications' : 'Mute Notifications'}</span>
                                     {mutedConvs.includes(activeConversation._id) ? <BellOff size={14} className="text-orange-500" /> : <Bell size={14} className="opacity-40 group-hover:opacity-100" />}
                                 </button>
                             </div>

                             {activeConversation.type !== 'global' && (
                                <div className="p-4 rounded-2xl bg-glass-1 border border-border-1 text-left">
                                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-2">Danger Zone</p>
                                    <button 
                                        onClick={handleDeleteChat}
                                        className="w-full text-left py-2 text-xs font-bold text-red-500 flex items-center justify-between hover:opacity-80 transition-all"
                                    >
                                        <span>Delete Chat</span>
                                        <X size={14} />
                                    </button>
                                </div>
                             )}
                         </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
      </main>

      {/* Modals */}
      <AnimatePresence>
          {showUserSearch && (
              <UserSearchModal 
                onClose={() => setShowUserSearch(false)} 
                onSelect={handleStartDM}
              />
          )}

          {showChatSettings && (
              <ChatSettingsModal 
                onClose={() => setShowChatSettings(false)}
                mutedConvs={mutedConvs}
                onClearMutes={() => setMutedConvs([])}
              />
          )}
      </AnimatePresence>
    </div>
  );
};

// ─── CHAT SETTINGS MODAL ────────────────────────────────
const ChatSettingsModal = ({ onClose, mutedConvs, onClearMutes }: any) => {
    const { user } = useAuthStore();
    const [theme, setTheme] = useState(localStorage.getItem('chat_theme') || 'standard');
    const [soundEnabled, setSoundEnabled] = useState(localStorage.getItem('chat_sounds') !== 'false');

    const handleSave = () => {
        localStorage.setItem('chat_theme', theme);
        localStorage.setItem('chat_sounds', soundEnabled.toString());
        toast.success('Chat settings saved');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-glass-3 rounded-[2rem] w-full max-w-sm p-6 shadow-2xl border border-white/10"
            >
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-xl font-display font-black uppercase italic tracking-tight">Messenger Settings</h2>
                        <p className="text-[10px] font-black uppercase opacity-40 tracking-widest mt-1">Configure your experience</p>
                    </div>
                    <button onClick={onClose} className="btn-ghost btn-icon"><X size={20}/></button>
                </div>

                <div className="space-y-6">
                    <section className="space-y-3">
                        <p className="text-[10px] font-black uppercase opacity-30 tracking-widest">General</p>
                        <div className="flex items-center justify-between p-4 rounded-2xl bg-glass-1 border border-border-1">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500"><Bell size={16}/></div>
                                <span className="text-sm font-semibold">Message Sounds</span>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" checked={soundEnabled} onChange={() => setSoundEnabled(!soundEnabled)} />
                                <div className="w-9 h-5 bg-glass-3 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand"></div>
                            </label>
                        </div>
                    </section>

                    <section className="space-y-3">
                        <p className="text-[10px] font-black uppercase opacity-30 tracking-widest text-left">Theme</p>
                        <div className="grid grid-cols-2 gap-2">
                            {['standard', 'bubble', 'modern', 'minimal'].map(t => (
                                <button 
                                    key={t}
                                    onClick={() => setTheme(t)}
                                    className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${theme === t ? 'bg-brand text-white border-brand shadow-lg shadow-brand/20' : 'bg-glass-1 border-border-1 hover:border-brand/30'}`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </section>

                    <section className="space-y-3">
                        <p className="text-[10px] font-black uppercase opacity-30 tracking-widest text-left">Privacy</p>
                        <button 
                            onClick={() => {
                                if (confirm('Clear all muted conversations?')) onClearMutes();
                            }}
                            className="w-full flex items-center justify-between p-4 rounded-2xl bg-glass-1 border border-border-1 hover:bg-red-500/5 hover:border-red-500/30 group transition-all"
                        >
                            <span className="text-xs font-bold">Muted Chats ({mutedConvs.length})</span>
                            <span className="text-[10px] font-black uppercase text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">Clear All</span>
                        </button>
                    </section>
                </div>

                <div className="mt-8 pt-6 border-t border-white/5 flex gap-3">
                    <button onClick={onClose} className="btn-secondary flex-1 py-3">Cancel</button>
                    <button onClick={handleSave} className="btn-primary flex-1 py-3">Apply</button>
                </div>
            </motion.div>
        </div>
    );
};

export default ChatPage;
