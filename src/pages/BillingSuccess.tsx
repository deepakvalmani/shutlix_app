import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, ArrowRight, Activity, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import toast from 'react-hot-toast';

const BillingSuccess = () => {
    const navigate = useNavigate();

    useEffect(() => {
        toast.success('Subscription activated successfully!', {
            icon: '💎',
            duration: 6000
        });
    }, []);

    return (
        <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden">
            {/* Ambient Background */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand/10 blur-[150px] rounded-full pointer-events-none" />
            
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md bg-[#0A0A0A]/80 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-10 flex flex-col items-center text-center relative z-10 shadow-[0_0_100px_rgba(37,99,235,0.15)]"
            >
                <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', damping: 15, stiffness: 200, delay: 0.2 }}
                    className="w-24 h-24 rounded-[2rem] bg-brand/20 border border-brand/50 flex items-center justify-center mb-8 shadow-[0_0_40px_rgba(37,99,235,0.3)]"
                >
                    <CheckCircle size={48} className="text-brand animate-pulse" />
                </motion.div>

                <h1 className="font-display font-black text-4xl uppercase tracking-tighter mb-4">
                    Access <span className="text-brand">Unlocked.</span>
                </h1>
                
                <p className="text-sm font-medium text-white/40 mb-10 leading-relaxed uppercase tracking-[0.1em]">
                    The synchronization process was successful. Your organization's fleet hub is now running at full capacity.
                </p>

                <div className="w-full space-y-4 mb-10">
                    {[
                        { icon: ShieldCheck, label: 'Advanced Analytics Active' },
                        { icon: Activity, label: 'Priority Support Enabled' },
                    ].map((feat, i) => (
                        <motion.div 
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.5 + (i * 0.1) }}
                            className="flex items-center gap-4 bg-white/5 border border-white/5 p-4 rounded-2xl"
                        >
                            <div className="p-2 rounded-lg bg-brand/10 text-brand">
                                <feat.icon size={16} />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/60">{feat.label}</span>
                        </motion.div>
                    ))}
                </div>

                <button 
                    onClick={() => navigate('/admin')}
                    className="w-full h-20 bg-brand text-white rounded-3xl font-display font-black uppercase tracking-[0.3em] text-xs shadow-2xl shadow-brand/40 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                    Enter Dashboard <ArrowRight size={18} />
                </button>

                <p className="mt-8 text-[9px] font-black uppercase tracking-widest opacity-20 italic">
                    Platform status: Operational · Enterprise Class
                </p>
            </motion.div>
        </div>
    );
};

export default BillingSuccess;
