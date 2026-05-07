import React, { useState } from 'react';
import { CreditCard, Zap, Check, ExternalLink, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';
import { useApi } from '../../services/swr';
import api from '../../services/api';
import toast from 'react-hot-toast';

const BillingPanel = ({ org, shuttleCount = 0 }: any) => {
    const [loading, setLoading] = useState<string | null>(null);

    const handleManage = async () => {
        setLoading('portal');
        try {
            const { data } = await api.post('/billing/create-portal-session');
            window.location.href = data.data.url;
        } catch (err) {
            toast.error('Failed to open billing portal');
            setLoading(null);
        }
    };

    const handleUpgrade = async (priceId: string) => {
        setLoading(priceId);
        try {
            const { data } = await api.post('/billing/create-checkout-session', { priceId });
            window.location.href = data.data.url;
        } catch (err) {
            toast.error('Failed to start checkout');
            setLoading(null);
        }
    };

    const PLANS = [
        {
            id: 'starter',
            name: 'Starter',
            price: '$49',
            period: '/mo',
            features: ['Up to 5 Shuttles', 'Live Tracking', 'Basic Chat', 'Email Support'],
            priceId: 'price_starter_mock'
        },
        {
            id: 'growth',
            name: 'Growth',
            price: '$149',
            period: '/mo',
            popular: true,
            features: ['Up to 20 Shuttles', 'Full Communication Suite', 'Advanced Analytics', 'Priority Support', 'Geofencing Alerts'],
            priceId: 'price_growth_mock'
        },
        {
            id: 'enterprise',
            name: 'Enterprise',
            price: 'Custom',
            period: '',
            features: ['Unlimited Shuttles', 'White-label Platform', 'SLA Guarantee', 'Dedicated Manager', 'API Access'],
            priceId: 'price_enterprise_mock'
        }
    ];

    return (
        <div className="p-6 space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="font-display font-bold text-xl" style={{ color: 'var(--text-1)' }}>Billing & Subscription</h2>
                    <p className="text-xs opacity-50">Manage your SaaS plan and payment methods</p>
                </div>
                {org?.stripeCustomerId && (
                    <button 
                        onClick={handleManage} 
                        disabled={!!loading}
                        className="btn-secondary flex items-center gap-2"
                    >
                        {loading === 'portal' ? <Loader2 className="animate-spin" size={16}/> : <ExternalLink size={16} />}
                        Stripe Customer Portal
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-md rounded-2xl p-6 border-l-4 border-brand">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center">
                            <Zap size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Current Plan</p>
                            <p className="font-display font-black text-lg uppercase tracking-tight">{org?.plan || 'Pilot'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mb-4">
                        <div className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${org?.subscriptionStatus === 'active' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                            {org?.subscriptionStatus || 'Unknown'}
                        </div>
                        {org?.currentPeriodEnd && (
                            <span className="text-[10px] opacity-40">Renewing {new Date(org.currentPeriodEnd).toLocaleDateString()}</span>
                        )}
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-glass-1 border border-border-1">
                        <div className="flex items-center gap-2">
                             <CreditCard size={14} className="opacity-40" />
                             <span className="text-xs font-bold opacity-60">Fleet Usage</span>
                        </div>
                        <span className="text-xs font-bold tracking-tighter">{shuttleCount} / {org?.settings?.maxShuttles || 5}</span>
                    </div>
                </div>

                <div className="md:col-span-2 glass-md rounded-2xl p-6 flex items-center gap-6">
                    <div className="hidden sm:flex w-24 h-24 rounded-3xl bg-brand/5 border border-brand/10 items-center justify-center text-brand">
                        <ShieldCheck size={48} className="opacity-40" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-base mb-1">Upgrade your experience</h3>
                        <p className="text-xs opacity-60 mb-4 leading-relaxed">
                            Unlock advanced features like enterprise fleet management, real-time geofencing, and WhatsApp-integrated communications with a higher tier plan.
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {['Priority Support', 'No Ads', 'Daily Backups'].map(f => (
                                <div key={f} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand/5 border border-brand/10 text-[9px] font-bold uppercase text-brand tracking-widest">
                                    <Check size={10} /> {f}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                {PLANS.map(plan => (
                    <div key={plan.id} className={`glass-md rounded-3xl p-8 flex flex-col relative ${plan.popular ? 'border-2 border-brand/40 shadow-xl scale-[1.02]' : ''}`}>
                        {plan.popular && (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg">
                                Most Popular
                            </div>
                        )}
                        <h3 className="font-display font-black text-xl mb-1 uppercase tracking-tight">{plan.name}</h3>
                        <div className="flex items-baseline gap-1 mb-8">
                            <span className="text-4xl font-display font-black tracking-tighter">{plan.price}</span>
                            <span className="text-sm opacity-40 font-bold uppercase">{plan.period}</span>
                        </div>
                        
                        <div className="flex-1 space-y-4 mb-10">
                            {plan.features.map(f => (
                                <div key={f} className="flex items-start gap-3">
                                    <div className="w-5 h-5 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <Check size={10} />
                                    </div>
                                    <span className="text-xs font-semibold opacity-70">{f}</span>
                                </div>
                            ))}
                        </div>

                        <button 
                            onClick={() => handleUpgrade(plan.priceId)}
                            disabled={org?.plan === plan.id || !!loading}
                            className={`w-full py-4 rounded-2xl font-display font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 ${
                                org?.plan === plan.id 
                                    ? 'bg-green-500/10 text-green-500 border border-green-500/20 cursor-default'
                                    : plan.popular 
                                        ? 'bg-brand text-white hover:bg-brand-dark shadow-lg shadow-brand/20 active:scale-95'
                                        : 'bg-glass-2 border border-border-1 hover:bg-glass-1'
                            }`}
                        >
                            {loading === plan.priceId ? <Loader2 className="animate-spin" size={16} /> : (
                                <>
                                    {org?.plan === plan.id ? 'Current Plan' : `Get ${plan.name}`}
                                    {org?.plan !== plan.id && <ArrowRight size={14} />}
                                </>
                            )}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default BillingPanel;
