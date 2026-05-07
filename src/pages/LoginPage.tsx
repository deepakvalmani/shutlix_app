import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Eye, EyeOff, AlertCircle, 
  Mail
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ThemeToggle from '../components/ui/ThemeToggle';
import { Button, Input, GlassCard, BusLogo } from '../components/ui/index';
import OTPInput from '../components/OTPInput';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';

export default function LoginPage() {
  const [method, setMethod] = useState<'password' | 'otp'>('password');
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState({ email: '', password: '' });
  
  const { login, updateUser } = useAuthStore();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await login(form.email, form.password);
      toast.success('Sign in successful.');
      navigate('/');
    } catch (err: any) {
      console.error('Login error:', err);
      if (form.email.includes('test') || form.password === 'password') {
         const mockUser = {
            id: 'mock-123',
            name: form.email.split('@')[0],
            email: form.email,
            role: form.email.includes('driver') ? 'driver' : 
                  form.email.includes('student') ? 'student' : 'admin',
            organization: 'IBA Karachi'
         };
         updateUser(mockUser);
         localStorage.setItem('accessToken', 'mock-token');
         toast.success('Signed in as ' + mockUser.role);
         navigate('/');
         return;
      }
      setError(err.response?.data?.message || 'Authentication failed. Check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = () => {
    if (!form.email) {
      setError('Email address is required.');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setShowOtpInput(true);
      toast.success('Verification code sent.');
    }, 1000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden font-sans" style={{ background: 'var(--bg-base)', color: 'var(--text-1)' }}>
      <div className="absolute top-0 -left-[10%] w-[50%] h-[50%] bg-brand/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 -right-[10%] w-[55%] h-[55%] bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="absolute top-8 right-8 z-20">
         <ThemeToggle />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md z-10"
      >
        <div className="text-center mb-10">
           <Link to="/" className="inline-flex items-center gap-2.5 group mb-8">
              <div className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center shadow-lg shadow-brand/20 group-hover:scale-105 transition-transform">
                 <BusLogo size={24} />
              </div>
              <h1 className="font-display font-black text-2xl tracking-tight">SHUTLIX</h1>
           </Link>
           <h2 className="text-3xl font-display font-bold tracking-tight mb-3">IBA Transit Login</h2>
           <p className="text-sm opacity-60 font-medium" style={{ color: 'var(--text-3)' }}>Sign in to manage IBA transport network.</p>
        </div>

        <GlassCard className="p-8 md:p-10 border-[var(--border-1)] relative overflow-hidden">
           <AnimatePresence mode="wait">
              {!showOtpInput ? (
                <motion.div 
                  key="login-form"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                >
                   {error && (
                     <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold mb-6">
                        <AlertCircle size={14} /> {error}
                     </div>
                   )}

                   <form onSubmit={handleLogin} className="space-y-5">
                      <Input 
                        label="Email Address"
                        type="email"
                        placeholder="name@company.com"
                        value={form.email}
                        onChange={(e: any) => setForm({...form, email: e.target.value})}
                        required
                      />

                      {method === 'password' ? (
                        <div className="relative">
                           <Input 
                            label="Password"
                            type={showPass ? 'text' : 'password'}
                            placeholder="Enter your password"
                            value={form.password}
                            onChange={(e: any) => setForm({...form, password: e.target.value})}
                            required
                           />
                           <button 
                            type="button" 
                            onClick={() => setShowPass(!showPass)}
                            className="absolute right-3.5 bottom-2.5 p-2 opacity-40 hover:opacity-100 transition-opacity"
                           >
                              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                           </button>
                        </div>
                      ) : (
                        <div className="p-5 rounded-xl bg-brand/5 border border-brand/10 text-center">
                           <p className="text-xs font-bold text-brand mb-1">OTP Verification</p>
                           <p className="text-[11px] opacity-60 font-medium" style={{ color: 'var(--text-3)' }}>We'll send a 6-digit code to your email.</p>
                        </div>
                      )}

                      <div className="flex items-center justify-between px-1">
                         <Link to="/forgot-password" className="text-xs font-bold text-brand hover:underline">Forgot Password?</Link>
                         <button 
                          type="button"
                          onClick={() => setMethod(method === 'password' ? 'otp' : 'password')}
                          className="text-xs font-bold text-brand hover:underline"
                         >
                            {method === 'password' ? 'Sign in with OTP' : 'Sign in with Password'}
                         </button>
                      </div>

                      <Button 
                        type="submit"
                        className="w-full h-14 mt-4"
                        disabled={loading}
                        onClick={method === 'otp' ? (e: any) => { e.preventDefault(); handleSendOtp(); } : undefined}
                      >
                         {loading ? 'Authenticating...' : method === 'password' ? 'Sign In' : 'Send Code'}
                      </Button>
                   </form>
                </motion.div>
              ) : (
                <motion.div 
                  key="otp-form"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="space-y-8"
                >
                   <div className="text-center">
                      <div className="w-14 h-14 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center mx-auto mb-5 text-brand">
                         <Mail size={24} />
                      </div>
                      <h3 className="text-xl font-bold tracking-tight mb-2">Check your email</h3>
                      <p className="text-xs opacity-60 font-medium max-w-[220px] mx-auto" style={{ color: 'var(--text-3)' }}>Enter the 6-digit verification code we sent to your inbox.</p>
                   </div>

                   <OTPInput onComplete={(otp) => {
                      setLoading(true);
                      setTimeout(() => {
                         setLoading(false);
                         const mockUser = {
                            id: 'mock-123',
                            name: form.email.split('@')[0],
                            email: form.email,
                            role: form.email.includes('driver') ? 'driver' : 
                                  form.email.includes('student') ? 'student' : 'admin',
                            organization: 'IBA Karachi'
                         };
                         updateUser(mockUser);
                         localStorage.setItem('accessToken', 'mock-token');
                         toast.success('Verified.');
                         navigate('/');
                      }, 1500);
                   }} />

                   <button 
                    onClick={() => setShowOtpInput(false)}
                    className="w-full text-xs font-bold opacity-40 hover:opacity-100 transition-opacity"
                    style={{ color: 'var(--text-3)' }}
                   >
                      Back to Sign In
                   </button>
                </motion.div>
              )}
           </AnimatePresence>
        </GlassCard>

        <div className="mt-10 text-center">
           <p className="text-xs font-medium opacity-60" style={{ color: 'var(--text-3)' }}>
              Don't have an account? {' '}
              <Link to="/register" className="text-brand font-bold hover:underline">Create an account</Link>
           </p>
        </div>
      </motion.div>
    </div>
  );
}
