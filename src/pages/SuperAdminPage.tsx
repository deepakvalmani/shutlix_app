import React, { useState } from 'react';
import useSWR from 'swr';
import { 
    LayoutDashboard, Building2, Users, DollarSign, Settings, 
    Search, Plus, ShieldCheck, Globe, CreditCard, TrendingUp,
    ChevronRight, ArrowUpRight, BarChart4, LogOut, User, Activity, Bell, Shield, Database, Lock
} from 'lucide-react';
import { useApi } from '../services/swr';
import { LoadingScreen, PageHeader } from '../components/ui/index';
import ThemeToggle from '../components/ui/ThemeToggle';
import { motion } from 'motion/react';
import api from '../services/api';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const SuperAdminPage = () => {
    const [activeTab, setActiveTab] = useState('overview');
    const { logout, user } = useAuthStore();
    const navigate = useNavigate();
    const { data: rawStats, isLoading: statsLoading } = useApi('/superadmin/stats');
    const { data: orgs, isLoading: orgsLoading } = useApi('/superadmin/organizations');
    const { data: rawAnalytics, isLoading: analyticsLoading } = useApi('/superadmin/analytics');

    const statsData = rawStats?.data || {};
    const analyticsData = rawAnalytics?.data || [];

    const superStats = [
        { label: 'Total Revenue', value: `$${(statsData.monthlyRevenue || 0).toLocaleString()}`, sub: '+12% from last month', icon: DollarSign, color: '#10B981' },
        { label: 'Organizations', value: (statsData.totalOrganizations || 0).toString(), sub: `${statsData.activeSubscriptions || 0} active subscriptions`, icon: Building2, color: '#2563EB' },
        { label: 'Total Users', value: (statsData.totalUsers || 0).toLocaleString(), sub: 'Across all tenants', icon: Users, color: '#8B5CF6' },
        { label: 'Global Bookings', value: (statsData.totalBookings || 0).toLocaleString(), sub: 'Cumulative activity', icon: TrendingUp, color: '#F59E0B' },
    ];

    if (statsLoading || orgsLoading || analyticsLoading) return <LoadingScreen />;

    const handleLogout = () => {
        logout();
        toast.success('Logged out from Master Control');
    };

    return (
        <div className="min-h-screen bg-bg-base flex flex-col font-sans">
            {/* Top Bar */}
            <header className="h-16 flex-shrink-0 bg-glass-3 backdrop-blur-xl border-b border-border-1 px-6 flex items-center justify-between sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center text-white shadow-lg shadow-brand/20">
                        <ShieldCheck size={20} />
                    </div>
                    <div>
                        <h1 className="font-display font-black text-sm uppercase tracking-widest text-text-1">Platform Master</h1>
                        <p className="text-[10px] font-black opacity-40 uppercase tracking-[0.2em] -mt-1">ShutliX SaaS Controller</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <ThemeToggle />
                    <button 
                        onClick={handleLogout}
                        className="p-2.5 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all border border-red-500/20"
                        title="Logout"
                    >
                        <LogOut size={18} />
                    </button>
                    <div className="flex items-center gap-2 pl-4 border-l border-border-1">
                        <div 
                            onClick={() => setActiveTab('profile')}
                            className="w-8 h-8 rounded-full bg-brand/10 text-brand flex items-center justify-center text-xs font-bold ring-2 ring-brand/20 cursor-pointer hover:scale-110 transition-transform"
                        >
                            {user?.name?.[0] || 'SA'}
                        </div>
                        <span className="text-xs font-bold text-text-2 hidden sm:block">Master Node</span>
                    </div>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar */}
                <aside className="w-64 hidden lg:flex flex-col border-r border-border-1 bg-glass-1 p-4 gap-2">
                    {[
                        { id: 'overview', label: 'Platform Stats', icon: LayoutDashboard },
                        { id: 'orgs', label: 'Organizations', icon: Building2 },
                        { id: 'billing', label: 'Global Revenue', icon: DollarSign },
                        { id: 'users', label: 'Master Users', icon: Users },
                        { id: 'settings', label: 'System Settings', icon: Settings },
                        { id: 'profile', label: 'My Identity', icon: User },
                    ].map(t => (
                        <button 
                            key={t.id}
                            onClick={() => setActiveTab(t.id)}
                            className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
                                activeTab === t.id ? 'bg-brand text-white shadow-lg shadow-brand/20' : 'text-text-3 hover:bg-glass-2'
                            }`}
                        >
                            <t.icon size={16} />
                            {t.label}
                        </button>
                    ))}
                    <div className="mt-auto pt-4 border-t border-border-1">
                        <button 
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-widest text-red-500 hover:bg-red-500/10 transition-all"
                        >
                            <LogOut size={16} />
                            Terminate Session
                        </button>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 overflow-y-auto p-8 max-w-7xl mx-auto w-full">
                    {activeTab === 'overview' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {superStats.map((stat, i) => (
                                    <motion.div 
                                        key={stat.label}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: i * 0.1 }}
                                        className="glass-heavy p-6 rounded-[2.5rem] border border-border-1 relative group overflow-hidden"
                                    >
                                        <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-500">
                                            <stat.icon size={120} />
                                        </div>
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="p-3 rounded-2xl" style={{ background: `${stat.color}15`, color: stat.color }}>
                                                <stat.icon size={20} />
                                            </div>
                                            <div className="px-2 py-1 rounded-lg bg-green-500/10 text-green-500 text-[10px] font-black italic">
                                                LIVE
                                            </div>
                                        </div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-1">{stat.label}</p>
                                        <h3 className="text-3xl font-display font-black tracking-tighter text-text-1">{stat.value}</h3>
                                        <p className="text-[10px] font-bold mt-2 text-text-3">{stat.sub}</p>
                                    </motion.div>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-2 glass-md rounded-[3rem] p-8 border border-border-1">
                                    <div className="flex items-center justify-between mb-8">
                                        <h2 className="font-display font-black text-xl uppercase tracking-tight">Growth Projection</h2>
                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand/10 text-brand text-[10px] font-black uppercase tracking-widest">
                                                <TrendingUp size={12} /> Bullish 42%
                                            </div>
                                        </div>
                                    </div>
                                    <div className="h-64 w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={analyticsData}>
                                                <defs>
                                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="var(--brand)" stopOpacity={0.3}/>
                                                        <stop offset="95%" stopColor="var(--brand)" stopOpacity={0}/>
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                                <XAxis dataKey="name" stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} axisLine={false} />
                                                <YAxis stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} axisLine={false} />
                                                <Tooltip 
                                                    contentStyle={{ background: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '12px', fontSize: '10px' }}
                                                />
                                                <Area type="monotone" dataKey="revenue" stroke="var(--brand)" fillOpacity={1} fill="url(#colorRevenue)" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                <div className="glass-md rounded-[3rem] p-8 border border-border-1 flex flex-col">
                                    <h2 className="font-display font-black text-xl uppercase tracking-tight mb-8 text-brand">System Health</h2>
                                    <div className="space-y-6 flex-1">
                                        {[
                                            { label: 'API Gateway', status: 'Healthy', val: '99.99%', color: '#10B981' },
                                            { label: 'Socket Cluster', status: 'Healthy', val: '12ms Latency', color: '#10B981' },
                                            { label: 'Redis Cache', status: 'Load: 12GB', val: '84% Hits', color: '#F59E0B' },
                                            { label: 'Worker Nodes', status: '8 Active', val: '12% CPU', color: '#10B981' },
                                        ].map(s => (
                                            <div key={s.label} className="flex items-center justify-between group">
                                                <div>
                                                    <p className="text-xs font-black uppercase tracking-widest leading-none">{s.label}</p>
                                                    <p className="text-[10px] font-bold mt-1.5 opacity-40 group-hover:opacity-100 transition-opacity" style={{ color: s.color }}>{s.status}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs font-mono font-black">{s.val}</p>
                                                    <div className="w-16 h-1 rounded-full bg-glass-2 mt-2">
                                                        <div className="h-full rounded-full" style={{ background: s.color, width: '100%' }} />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'billing' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                             <div>
                                <h2 className="font-display font-black text-3xl uppercase tracking-tight text-text-1">Global Revenue</h2>
                                <p className="text-xs opacity-40 font-bold uppercase tracking-widest mt-1">Cross-tenant billing & Financial aggregates</p>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="glass-md p-8 rounded-[2.5rem] border border-border-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2">Monthly Recurring Revenue</p>
                                    <h3 className="text-4xl font-display font-black text-brand">${(statsData.monthlyRevenue || 0).toLocaleString()}</h3>
                                </div>
                                <div className="glass-md p-8 rounded-[2.5rem] border border-border-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2">Active Subscriptions</p>
                                    <h3 className="text-4xl font-display font-black">{statsData.activeSubscriptions || 0}</h3>
                                </div>
                                <div className="glass-md p-8 rounded-[2.5rem] border border-border-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2">Avg. Revenue Per Org</p>
                                    <h3 className="text-4xl font-display font-black">${statsData.activeSubscriptions ? (statsData.monthlyRevenue / statsData.activeSubscriptions).toFixed(0) : 0}</h3>
                                </div>
                            </div>

                            <div className="glass-md rounded-[3rem] p-8 border border-border-1 h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={analyticsData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                        <XAxis dataKey="name" stroke="rgba(255,255,255,0.2)" fontSize={10} />
                                        <YAxis stroke="rgba(255,255,255,0.2)" fontSize={10} />
                                        <Tooltip 
                                            contentStyle={{ background: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '12px', fontSize: '10px' }}
                                        />
                                        <Bar dataKey="revenue" fill="var(--brand)" radius={[10, 10, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {activeTab === 'users' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                            <div>
                                <h2 className="font-display font-black text-3xl uppercase tracking-tight text-text-1">Master User List</h2>
                                <p className="text-xs opacity-40 font-bold uppercase tracking-widest mt-1">Universal across all organization nodes</p>
                            </div>
                            
                            <div className="glass-md rounded-[2.5rem] border border-border-1 overflow-hidden">
                                <div className="p-6 border-b border-white/5 bg-white/5 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Users size={16} className="text-brand" />
                                        <span className="text-xs font-black uppercase tracking-widest">Global Directory</span>
                                    </div>
                                    <div className="text-[10px] font-bold opacity-40 uppercase tracking-widest">Total: {statsData.totalUsers || 0} Entities</div>
                                </div>
                                <div className="p-20 text-center">
                                    <Users size={48} className="mx-auto mb-4 opacity-10" />
                                    <p className="text-xs font-black uppercase tracking-[0.2em] opacity-20">Global User Search and Audit in Terminal Phase...</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'settings' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                            <div>
                                <h2 className="font-display font-black text-3xl uppercase tracking-tight text-text-1">System Settings</h2>
                                <p className="text-xs opacity-40 font-bold uppercase tracking-widest mt-1">Platform-wide parameters & hardware locks</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    {[
                                        { label: 'Maintenance Mode', icon: Lock, desc: 'Freeze all tenant writes' },
                                        { label: 'Global Notifications', icon: Bell, desc: 'Broadcast to all terminals' },
                                        { label: 'API Throttling', icon: Activity, desc: 'Adjust master rate limits' },
                                    ].map(s => (
                                        <div key={s.label} className="glass-md p-6 rounded-3xl border border-border-1 flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-brand/10 text-brand flex items-center justify-center">
                                                    <s.icon size={20} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black uppercase tracking-widest">{s.label}</p>
                                                    <p className="text-[10px] font-bold opacity-40">{s.desc}</p>
                                                </div>
                                            </div>
                                            <div className="w-12 h-6 rounded-full bg-glass-2 relative cursor-pointer">
                                                <div className="absolute left-1 top-1 w-4 h-4 rounded-full bg-white/20" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="space-y-6">
                                     {[
                                        { label: 'Core Integrity', icon: Shield, desc: 'Security protocol alignment' },
                                        { label: 'Data Retention', icon: Database, desc: 'Master purge sequence' },
                                    ].map(s => (
                                        <div key={s.label} className="glass-md p-6 rounded-3xl border border-border-1 flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-brand/10 text-brand flex items-center justify-center">
                                                    <s.icon size={20} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black uppercase tracking-widest">{s.label}</p>
                                                    <p className="text-[10px] font-bold opacity-40">{s.desc}</p>
                                                </div>
                                            </div>
                                            <ChevronRight size={16} className="opacity-20" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'profile' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl">
                             <div className="mb-10">
                                <h2 className="font-display font-black text-3xl uppercase tracking-tight text-text-1">My Identity</h2>
                                <p className="text-xs opacity-40 font-bold uppercase tracking-widest mt-1">Superadmin Credentials & Root Access</p>
                            </div>

                            <div className="glass-md p-10 rounded-[3rem] border border-border-1 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-brand/10 blur-[100px] -mr-32 -mt-32" />
                                
                                <div className="flex flex-col items-center text-center relative z-10">
                                    <div className="w-24 h-24 rounded-[2rem] bg-brand/20 border border-brand/40 flex items-center justify-center text-brand font-black text-4xl mb-6 shadow-2xl">
                                        {user?.name?.[0] || 'SA'}
                                    </div>
                                    <h3 className="text-2xl font-display font-black tracking-tight">{user?.name || 'Super Admin'}</h3>
                                    <p className="text-xs font-black uppercase tracking-widest text-brand mt-1">{user?.email}</p>
                                    
                                    <div className="mt-10 w-full grid grid-cols-2 gap-4">
                                        <div className="bg-white/5 border border-white/5 p-6 rounded-3xl text-left">
                                            <p className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-2">Access Level</p>
                                            <p className="text-sm font-bold uppercase">Root System</p>
                                        </div>
                                        <div className="bg-white/5 border border-white/5 p-6 rounded-3xl text-left">
                                            <p className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-2">Status</p>
                                            <p className="text-sm font-bold uppercase text-green-500">Verified</p>
                                        </div>
                                    </div>

                                    <button className="w-full mt-8 py-4 bg-glass-2 border border-border-1 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-glass-3 transition-all">
                                        Update Master Security Key
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'orgs' && (
                        <div className="animate-in fade-in zoom-in-95 duration-500">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h2 className="font-display font-black text-3xl uppercase tracking-tight text-text-1">Partner Organizations</h2>
                                    <p className="text-xs opacity-40 font-bold uppercase tracking-widest mt-1">Tenant Management & Sandbox Controls</p>
                                </div>
                                <button className="btn-primary rounded-full px-8 py-3 flex items-center gap-2 shadow-2xl shadow-brand/40 group">
                                    <Plus size={18} className="group-hover:rotate-90 transition-transform" />
                                    <span className="text-sm font-black uppercase tracking-widest">Provision Org</span>
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {orgs?.data?.map((o: any) => (
                                    <div key={o._id} className="glass-md rounded-[2.5rem] p-8 border border-border-1 relative group hover:-translate-y-1 transition-all">
                                        <div className="flex items-start justify-between mb-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-14 h-14 rounded-2xl bg-glass-1 border border-border-1 flex items-center justify-center text-brand font-black text-xl">
                                                    {o.shortName?.[0] || o.name?.[0]}
                                                </div>
                                                <div>
                                                    <h3 className="font-display font-black text-xl uppercase tracking-tight">{o.name}</h3>
                                                    <p className="text-[10px] font-black opacity-30 uppercase tracking-widest">{o.plan} Plan · Joined {new Date(o.createdAt).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.2em] ${
                                                o.subscriptionStatus === 'active' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'
                                            }`}>
                                                {o.subscriptionStatus || 'Inactive'}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 mb-8">
                                            <div className="glass-1 p-4 rounded-3xl border border-white/5">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Users size={12} className="opacity-40" />
                                                    <span className="text-[9px] font-black uppercase tracking-widest opacity-40">User Capacity</span>
                                                </div>
                                                <p className="text-xl font-display font-black tracking-tighter">{o.settings?.maxUsers || '∞'}</p>
                                            </div>
                                            <div className="glass-1 p-4 rounded-3xl border border-white/5">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Globe size={12} className="opacity-40" />
                                                    <span className="text-[9px] font-black uppercase tracking-widest opacity-40">Region</span>
                                                </div>
                                                <p className="text-xl font-display font-black tracking-tighter">USA-EAST</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 pt-6 border-t border-white/5">
                                            <button className="flex-1 py-3 rounded-2xl bg-glass-2 text-[10px] font-black uppercase tracking-widest hover:bg-glass-3 transition-colors">Manage Tenant</button>
                                            <button className="w-12 h-12 rounded-2xl bg-glass-1 border border-border-1 flex items-center justify-center text-text-3 hover:text-brand transition-colors">
                                                <ArrowUpRight size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default SuperAdminPage;
