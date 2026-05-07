import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Bus, MapPin, Bell, Users, TrendingUp, Smartphone, 
  ArrowRight, Shield, Zap, Check, Globe, Menu, X,
  Activity, Navigation, Layers, ShieldCheck, Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ThemeToggle from '../components/ui/ThemeToggle';
import { Button, GlassCard, Modal } from '../components/ui/index';

// --- DATA ---

const FEATURES = [
  { 
    icon: Navigation, 
    title: 'Live Tracking', 
    description: 'Real-time GPS updates for every active shuttle in your fleet with pinpoint accuracy.',
    color: '#3B82F6'
  },
  { 
    icon: Bell, 
    title: 'Instant Alerts', 
    description: 'Automated notifications for arrivals, delays, or route changes.',
    color: '#10B981'
  },
  { 
    icon: Activity, 
    title: 'ETA Accuracy', 
    description: 'Arrival time estimations based on real-time traffic and historical data.',
    color: '#F59E0B'
  },
  { 
    icon: Globe, 
    title: 'Multi-Org Management', 
    description: 'Manage multiple campuses or locations with unified administration and permissions.',
    color: '#8B5CF6'
  },
  { 
    icon: ShieldCheck, 
    title: 'Security & Safety', 
    description: 'Emergency reporting with instant location sharing to security teams.',
    color: '#EF4444'
  },
  { 
    icon: TrendingUp, 
    title: 'Powerful Analytics', 
    description: 'Comprehensive dashboards for fleet performance and usage reporting.',
    color: '#6366F1'
  }
];

const PRICING = [
  {
    name: 'Starter',
    price: '$0',
    desc: 'Perfect for small organizations getting started.',
    features: ['Up to 2 shuttles', 'Basic tracking', 'Email alerts', 'Standard support'],
    button: 'Start Free',
    highlight: false
  },
  {
    name: 'Professional',
    price: '$149',
    desc: 'For growing fleets that need precision.',
    features: ['Up to 15 shuttles', 'Live management hub', 'Advanced ETA logic', 'Priority support', 'Usage analytics'],
    button: 'Get Started',
    highlight: true
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    desc: 'For large institutions and city-wide networks.',
    features: ['Unlimited units', 'Custom branding', 'API access', 'Dedicated support', 'Guaranteed uptime'],
    button: 'Contact Us',
    highlight: false
  }
];

const STEPS = [
  { icon: Smartphone, title: 'Driver App', desc: 'Drivers share their location through a simple mobile dashboard.' },
  { icon: Layers, title: 'Manage Routes', desc: 'Administrators define routes, stops, and schedules easily.' },
  { icon: Zap, title: 'Real-time Sync', desc: 'Students see live shuttle locations and ETAs instantly.' }
];

// --- COMPONENTS ---

const DashboardMockup = () => {
  return (
    <div className="relative w-full max-w-2xl aspect-[4/3] glass-md rounded-[2.5rem] p-4 shadow-2xl border border-[var(--border-1)] group overflow-hidden">
      <div className="absolute inset-0 bg-[#0A0D14]" />
      
      {/* Grid Pattern */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" 
        style={{ backgroundImage: 'radial-gradient(circle, #3B82F6 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

      <div className="relative z-10 h-full flex flex-col gap-4">
        {/* Header UI */}
        <div className="flex items-center justify-between px-4 py-2 bg-white/5 rounded-xl border border-white/10">
          <div className="flex items-center gap-3">
             <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
             <span className="text-[10px] font-bold uppercase tracking-widest opacity-60 text-white">Live Tracking Active</span>
          </div>
          <div className="flex gap-2">
             <div className="w-8 h-2 bg-white/5 rounded-full" />
             <div className="w-4 h-2 bg-white/5 rounded-full" />
          </div>
        </div>

        {/* Map Area */}
        <div className="flex-1 rounded-[1.5rem] bg-white/5 border border-white/5 flex items-center justify-center relative overflow-hidden">
           {/* Fake Road Line */}
           <motion.div 
             className="absolute w-[150%] h-[2px] bg-brand/20 -rotate-12"
             animate={{ x: [-100, 100] }}
             transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
           />
           
           {/* Animated Shuttle */}
           <motion.div 
             className="absolute w-10 h-10 bg-brand rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.6)] border border-white/20 z-20"
             animate={{ 
                x: [-150, 150, 150, -150],
                y: [20, -40, 60, 20],
                rotate: [0, 10, -10, 0]
             }}
             transition={{ 
                duration: 8, 
                repeat: Infinity,
                ease: "easeInOut"
             }}
           >
              <Bus size={20} color="white" />
              <div className="absolute -inset-2 border border-brand rounded-xl opacity-40 animate-ping" />
           </motion.div>

           {/* Floating Info */}
           <motion.div 
             className="absolute top-6 right-6 glass-heavy p-3 rounded-xl border border-white/20 z-30 shadow-xl"
             initial={{ opacity: 0, y: 10 }}
             animate={{ opacity: 1, y: 0 }}
           >
              <p className="text-[9px] font-bold text-brand uppercase tracking-widest mb-1">Estimated Arrival</p>
              <p className="text-[11px] font-bold text-white">2.4 mins to North Hub</p>
           </motion.div>
        </div>

        {/* Footer Stats */}
        <div className="grid grid-cols-3 gap-2">
           {[1, 2, 3].map(i => (
             <div key={i} className="h-10 bg-white/5 rounded-lg border border-white/5" />
           ))}
        </div>
      </div>
    </div>
  );
};

const PublicPage = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showDemo, setShowDemo] = useState(false);

  return (
    <div className="min-h-screen relative selection:bg-brand/30 selection:text-brand font-sans overflow-x-hidden" style={{ background: 'var(--bg-base)', color: 'var(--text-1)' }}>
      
      {/* Background Overlay */}
      <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-0 -left-[10%] w-[50%] h-[50%] bg-brand/5 blur-[120px] rounded-full" />
          <div className="absolute bottom-0 -right-[10%] w-[50%] h-[50%] bg-indigo-500/5 blur-[120px] rounded-full" />
      </div>

      <Modal isOpen={showDemo} onClose={() => setShowDemo(false)} title="Operational Demo">
         <div className="space-y-6">
            <div className="aspect-video bg-[var(--glass-2)] border border-[var(--border-1)] rounded-xl flex items-center justify-center p-4 relative overflow-hidden group">
               <div className="relative z-10 flex flex-col items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center animate-pulse">
                     <Bus size={24} className="text-brand" />
                  </div>
                  <p className="text-xs font-bold uppercase tracking-widest opacity-60">Connecting to demo fleet...</p>
               </div>
            </div>
            <p className="text-sm opacity-60 font-medium leading-relaxed px-1" style={{ color: 'var(--text-3)' }}>
               Experience the real-time tracking interface as used by students and administrators worldwide.
            </p>
            <Button className="w-full" size="lg" onClick={() => setShowDemo(false)}>View Demo</Button>
         </div>
      </Modal>

      {/* NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-20 glass-md border-b border-[var(--border-1)] px-6 md:px-12 flex items-center justify-between">
         <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-brand flex items-center justify-center shadow-lg shadow-brand/20 group-hover:scale-105 transition-transform">
               <Bus size={20} color="white" />
            </div>
            <div>
               <h1 className="font-display font-bold text-xl tracking-tight">SHUTLIX</h1>
            </div>
         </Link>

         {/* Desktop Links */}
         <div className="hidden md:flex items-center gap-8">
            {['Features', 'Operations', 'How it Works', 'Pricing'].map(l => (
               <a key={l} href={`#${l.toLowerCase().replace(/ /g, '')}`} className="text-xs font-bold uppercase tracking-widest opacity-50 hover:opacity-100 hover:text-brand transition-all">{l}</a>
            ))}
            <div className="w-px h-6 mx-2" style={{ background: 'var(--border-1)' }} />
            <ThemeToggle />
            <Link to="/login" className="text-xs font-bold uppercase tracking-widest hover:text-brand transition-colors">Sign In</Link>
            <Button onClick={() => navigate('/login')} size="sm">Get Started</Button>
         </div>

         {/* Mobile Toggle */}
         <div className="md:hidden flex items-center gap-4">
            <ThemeToggle />
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2">
               {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
         </div>
      </nav>

      {/* MOBILE MENU */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-40 pt-28 px-8 flex flex-col gap-8"
            style={{ background: 'var(--bg-base)' }}
          >
             {['Features', 'Operations', 'How it Works', 'Pricing'].map(l => (
               <a key={l} href={`#${l.toLowerCase().replace(/ /g, '')}`} onClick={() => setMobileMenuOpen(false)} className="text-2xl font-bold tracking-tight">{l}</a>
             ))}
             <div className="pt-8 border-t flex flex-col gap-4" style={{ borderColor: 'var(--border-1)' }}>
                <Button onClick={() => navigate('/login')} size="lg" className="w-full">Sign In</Button>
                <Button onClick={() => navigate('/register')} variant="secondary" size="lg" className="w-full">Create Account</Button>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="relative z-10">
        
        {/* HERO SECTION */}
        <section className="relative pt-40 pb-32 px-6 md:px-12 max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
           <motion.div 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.8 }}
             className="flex-1 text-center lg:text-left"
           >
              <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border text-brand text-[10px] font-bold uppercase tracking-widest mb-10" style={{ background: 'var(--glass-2)', borderColor: 'var(--border-brand)' }}>
                 <div className="w-2 h-2 rounded-full bg-brand animate-pulse" />
                 Trusted by 150+ Organizations
              </div>
              <h1 className="text-5xl md:text-7xl font-display font-bold tracking-tight mb-8 leading-tight">
                 Smart Fleet <br />
                 <span className="text-brand">Management</span> for <br />
                 Modern Campus.
              </h1>
              <p className="text-lg md:text-xl opacity-60 font-medium leading-relaxed max-w-xl mx-auto lg:mx-0 mb-12" style={{ color: 'var(--text-3)' }}>
                 The simple and reliable platform for real-time shuttle tracking, route management, and passenger communication.
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                 <Button size="lg" className="w-full sm:w-auto h-16 px-10" onClick={() => setShowDemo(true)}>
                    Get Started Now <ArrowRight size={18} className="ml-1" />
                 </Button>
                 <Button variant="secondary" size="lg" className="w-full sm:w-auto h-16 px-10" onClick={() => setShowDemo(true)}>
                    Watch Demo
                 </Button>
              </div>
           </motion.div>

           <motion.div 
             initial={{ opacity: 0, scale: 0.95 }}
             animate={{ opacity: 1, scale: 1 }}
             transition={{ duration: 1, delay: 0.2 }}
             className="flex-1 w-full"
           >
              <DashboardMockup />
           </motion.div>
        </section>

        {/* FEATURES SECTION */}
        <section id="features" className="py-32 px-6 md:px-12 max-w-7xl mx-auto">
           <div className="text-center mb-20 max-w-2xl mx-auto">
              <p className="text-[10px] font-bold uppercase tracking-widest text-brand mb-4">Core Features</p>
              <h2 className="text-4xl md:text-5xl font-display font-bold tracking-tight mb-6">Everything you need to manage your fleet</h2>
              <p className="text-lg opacity-60 font-medium" style={{ color: 'var(--text-3)' }}>
                 A complete set of tools designed for the demands of modern transportation networks.
              </p>
           </div>

           <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {FEATURES.map((f, i) => (
                <motion.div 
                  key={f.title}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                   <GlassCard hover className="h-full flex flex-col p-8 border-[var(--border-1)]">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-8"
                        style={{ background: `${f.color}15` }}>
                        <f.icon size={24} style={{ color: f.color }} />
                      </div>
                      <h3 className="text-xl font-bold tracking-tight mb-3">{f.title}</h3>
                      <p className="text-sm opacity-60 font-medium leading-relaxed mb-6 flex-1" style={{ color: 'var(--text-3)' }}>{f.description}</p>
                      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-brand">
                         Learn More <ArrowRight size={14} />
                      </div>
                   </GlassCard>
                </motion.div>
              ))}
           </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="howitworks" className="py-32 border-y relative overflow-hidden" style={{ background: 'var(--glass-2)', borderColor: 'var(--border-1)' }}>
           <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
              <div className="flex flex-col lg:flex-row gap-20 items-center">
                 <div className="lg:w-1/2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-brand mb-6">Simple Setup</p>
                    <h2 className="text-4xl md:text-6xl font-display font-bold tracking-tight mb-12">How it Works</h2>
                    
                    <div className="space-y-10">
                       {STEPS.map((s, i) => (
                         <div key={i} className="flex gap-6 group">
                            <div className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 border-2 transition-all transition-all" style={{ background: 'var(--bg-base)', borderColor: 'var(--border-1)', color: 'var(--brand)' }}>
                               <s.icon size={24} />
                            </div>
                            <div>
                               <h4 className="text-lg font-bold tracking-tight mb-1">{s.title}</h4>
                               <p className="text-sm opacity-60 font-medium leading-relaxed" style={{ color: 'var(--text-3)' }}>{s.desc}</p>
                            </div>
                         </div>
                       ))}
                    </div>
                 </div>

                 <div className="lg:w-1/2">
                    <div className="glass-md rounded-[2.5rem] p-6 border border-[var(--border-1)] group overflow-hidden shadow-xl">
                       <img 
                        src="https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&q=80&w=1200" 
                        alt="Infrastructure" 
                        className="w-full aspect-video object-cover rounded-2xl mb-6 grayscale hover:grayscale-0 transition-opacity duration-700 opacity-80"
                        referrerPolicy="no-referrer"
                       />
                       <div className="flex items-center justify-between px-2">
                          <div>
                             <p className="text-xs font-bold leading-none mb-1">Fleet Management</p>
                             <p className="text-[10px] opacity-40 font-medium">Cloud-sync active</p>
                          </div>
                          <div className="px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-500 text-[10px] font-bold uppercase tracking-widest">
                             Connected
                          </div>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </section>

        {/* PRICING SECTION */}
        <section id="pricing" className="py-32 px-6 md:px-12 max-w-7xl mx-auto">
           <div className="text-center mb-20 max-w-2xl mx-auto">
              <p className="text-[10px] font-bold uppercase tracking-widest text-brand mb-4">Pricing Plans</p>
              <h2 className="text-4xl font-display font-bold tracking-tight mb-6">Simple, Transparent Pricing</h2>
              <p className="text-lg opacity-60 font-medium" style={{ color: 'var(--text-3)' }}>
                 Select the plan that best fits your organization's needs.
              </p>
           </div>

           <div className="grid md:grid-cols-3 gap-8">
              {PRICING.map((p, i) => (
                <motion.div 
                  key={p.name}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                   <GlassCard className={`relative h-full flex flex-col border-[var(--border-1)] ${p.highlight ? 'border-brand/30 shadow-2xl shadow-brand/5 scale-[1.02]' : ''}`}>
                      {p.highlight && (
                        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-brand text-white text-[10px] font-bold uppercase tracking-widest rounded-full shadow-lg">
                           MOST POPULAR
                        </div>
                      )}
                      <div className="mb-8 text-center pt-2">
                         <h3 className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-3">{p.name}</h3>
                         <div className="flex items-end justify-center gap-1">
                            <span className="text-5xl font-display font-bold">{p.price}</span>
                            {p.price !== 'Custom' && <span className="text-xs font-bold opacity-30 mb-2 pb-1">/ MONTH</span>}
                         </div>
                      </div>
                      <p className="text-sm opacity-60 font-medium mb-10 text-center px-4" style={{ color: 'var(--text-3)' }}>{p.desc}</p>
                      
                      <div className="space-y-4 mb-10 flex-1 px-2">
                         {p.features.map(f => (
                           <div key={f} className="flex items-center gap-3 text-xs font-medium">
                              <Check size={14} className="text-brand shrink-0" /> {f}
                           </div>
                         ))}
                      </div>

                      <Button onClick={() => navigate('/login')} variant={p.highlight ? 'primary' : 'secondary'} className="w-full text-center py-4">
                         {p.button}
                      </Button>
                   </GlassCard>
                </motion.div>
              ))}
           </div>
        </section>

        {/* FINAL CTA */}
        <section className="py-20 px-6 md:px-12 max-w-5xl mx-auto">
           <motion.div 
             initial={{ opacity: 0, scale: 0.98 }}
             whileInView={{ opacity: 1, scale: 1 }}
             viewport={{ once: true }}
             className="relative p-12 md:p-20 rounded-[3rem] bg-brand text-center overflow-hidden shadow-2xl shadow-brand/30 text-white"
           >
              <div className="relative z-10">
                 <h2 className="text-4xl md:text-6xl font-display font-bold tracking-tight mb-8">Ready to manage your fleet?</h2>
                 <p className="text-lg font-medium opacity-80 mb-12 max-w-xl mx-auto leading-relaxed">
                    Join the next generation of transportation logistics. Start tracking your fleet in minutes.
                 </p>
                 <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Button onClick={() => navigate('/register')} size="xl" className="bg-white text-brand w-full sm:w-auto h-16 px-10 shadow-xl hover:scale-105 transition-transform">
                       Get Started For Free
                    </Button>
                    <Button onClick={() => navigate('/login')} variant="ghost" size="xl" className="w-full sm:w-auto h-16 px-10 text-white border border-white/20 hover:bg-white/10">
                       Sign In
                    </Button>
                 </div>
              </div>
           </motion.div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="py-24 px-6 md:px-12 border-t mt-20 relative z-10" style={{ background: 'var(--glass-2)', borderColor: 'var(--border-1)' }}>
         <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16">
            <div className="lg:col-span-2">
               <Link to="/" className="flex items-center gap-2.5 mb-8 group w-fit">
                  <div className="w-9 h-9 rounded-xl bg-brand flex items-center justify-center shadow-lg shadow-brand/20">
                     <Bus size={20} color="white" />
                  </div>
                  <h3 className="font-display font-bold text-xl tracking-tight">SHUTLIX</h3>
               </Link>
               <p className="text-sm opacity-60 font-medium leading-relaxed max-w-sm mb-10" style={{ color: 'var(--text-3)' }}>
                  Empowering organizations with real-time transit intelligence and seamless fleet management.
               </p>
               <div className="flex gap-6 text-[10px] font-bold uppercase tracking-widest opacity-40">
                  <a href="#" className="hover:text-brand transition-colors">Privacy Policy</a>
                  <a href="#" className="hover:text-brand transition-colors">Terms of Service</a>
                  <a href="#" className="hover:text-brand transition-colors">Safety Guide</a>
               </div>
            </div>

            <div>
               <h4 className="text-[10px] font-bold uppercase tracking-widest text-brand mb-8">Product</h4>
               <ul className="space-y-5 text-xs font-bold uppercase tracking-widest opacity-60">
                  <li><Link to="/login" className="hover:text-brand transition-opacity">Admin Portal</Link></li>
                  <li><Link to="/login" className="hover:text-brand transition-opacity">Driver App</Link></li>
                  <li><Link to="/login" className="hover:text-brand transition-opacity">Student App</Link></li>
                  <li><Link to="/login" className="hover:text-brand transition-opacity">Fleet Tracking</Link></li>
               </ul>
            </div>

            <div>
               <h4 className="text-[10px] font-bold uppercase tracking-widest text-brand mb-8">Support</h4>
               <ul className="space-y-5 text-xs font-bold uppercase tracking-widest opacity-60">
                 <li><a href="#" className="hover:text-brand transition-opacity">Help Center</a></li>
                 <li><a href="#" className="hover:text-brand transition-opacity">Documentation</a></li>
                 <li><a href="#" className="hover:text-brand transition-opacity">Safety Protocol</a></li>
                 <li><a href="#" className="hover:text-brand transition-opacity">Contact Us</a></li>
               </ul>
            </div>
         </div>

         <div className="max-w-7xl mx-auto pt-12 mt-20 border-t flex flex-col md:flex-row justify-between items-center gap-6" style={{ borderColor: 'var(--border-1)' }}>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-30">© 2026 SHUTLIX MOBILITY CORPORATION</p>
            <div className="flex items-center gap-2">
               <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
               <span className="text-[10px] font-bold uppercase tracking-widest opacity-40 text-[var(--text-3)]">All Systems Operational</span>
            </div>
         </div>
      </footer>
    </div>
  );
};

export default PublicPage;
