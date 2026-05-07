import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Bus, ArrowRight, AlertCircle } from 'lucide-react';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';

const LoginPage = () => {
  const [form, setForm] = useState({ email: '', password: '', organizationCode: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || null;

  const getRoleRedirect = (role) => {
    if (from) return from;
    if (role === 'driver') return '/driver';
    if (role === 'admin' || role === 'superadmin') return '/admin';
    return '/student';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError('Please fill in all fields');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      const user = await login(form.email, form.password, form.organizationCode);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`);
      navigate(getRoleRedirect(user.role), { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--navy)' }}>
      {/* Left panel – branding */}
      <div className="hidden lg:flex flex-col justify-between w-[480px] flex-shrink-0 p-12 relative overflow-hidden"
        style={{ background: 'var(--surface-2)', borderRight: '1px solid var(--border)' }}>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 -left-20 w-64 h-64 rounded-full opacity-10" style={{ background: 'var(--brand)', filter: 'blur(60px)' }} />
          <div className="absolute bottom-1/4 -right-10 w-48 h-48 rounded-full opacity-10" style={{ background: 'var(--gold)', filter: 'blur(40px)' }} />
        </div>
        <div className="flex items-center gap-3 relative">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--brand)' }}>
            <Bus size={22} color="white" />
          </div>
          <span className="font-display font-bold text-xl" style={{ color: 'var(--text-1)' }}>ShutlliX</span>
        </div>
        <div className="relative">
          <div className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: 'var(--brand)' }}>
            Multi‑tenant Smart Shuttle Platform
          </div>
          <h2 className="font-display font-bold text-4xl leading-tight mb-6" style={{ color: 'var(--text-1)' }}>
            Know exactly where your bus is.{' '}
            <span style={{ color: 'var(--brand)' }}>Every second.</span>
          </h2>
          <p className="text-base leading-relaxed" style={{ color: 'var(--text-3)' }}>
            Real‑time GPS tracking, live seat capacity, smart notifications — for universities, corporations, and public transit.
          </p>
        </div>
        <p className="text-xs relative" style={{ color: 'var(--text-4)' }}>© 2025 ShutlliX</p>
      </div>

      {/* Right panel – form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md animate-fade-in">
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--brand)' }}>
              <Bus size={20} color="white" />
            </div>
            <span className="font-display font-bold text-lg" style={{ color: 'var(--text-1)' }}>ShutlliX</span>
          </div>
          <h1 className="font-display font-bold text-3xl mb-2" style={{ color: 'var(--text-1)' }}>Welcome back</h1>
          <p className="mb-8" style={{ color: 'var(--text-3)' }}>Sign in to your ShutlliX account</p>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm animate-slide-down"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#FCA5A5' }}>
                <AlertCircle size={16} className="flex-shrink-0" />
                {error}
              </div>
            )}
            <div>
              <label className="label">Email address</label>
              <input type="email" className="input" placeholder="you@organization.edu" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} autoComplete="email" required />
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} className="input pr-11" placeholder="Enter your password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} autoComplete="current-password" required />
                <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 btn-ghost btn-icon p-1" style={{ color: 'var(--text-3)' }}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="label">Organization code <span className="text-xs" style={{ color: 'var(--text-4)' }}>(required for admin)</span></label>
              <input type="text" className="input" placeholder="e.g., IBA123" value={form.organizationCode} onChange={e => setForm(f => ({ ...f, organizationCode: e.target.value }))} />
            </div>
            <button type="submit" disabled={isLoading} className="btn-primary btn-lg w-full">
              {isLoading ? <span className="dot-loader"><span /><span /><span /></span> : <>Sign in <ArrowRight size={18} /></>}
            </button>
          </form>
          <div className="mt-8 pt-6" style={{ borderTop: '1px solid var(--border)' }}>
            <p className="text-sm text-center" style={{ color: 'var(--text-3)' }}>
              New to ShutlliX?{' '}
              <Link to="/register" className="font-medium hover:underline" style={{ color: 'var(--brand)' }}>
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;