import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Bus, ArrowRight, AlertCircle, GraduationCap, Truck, Mail } from 'lucide-react';
import useAuthStore from '../store/authStore';
import api from '../services/api';
import toast from 'react-hot-toast';

const RegisterPage = () => {
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student',
    organizationId: searchParams.get('org') || '',
    studentId: '',
    licenseNumber: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1); // 1: request OTP, 2: verify OTP & register
  const [otp, setOtp] = useState('');
  const [tempToken, setTempToken] = useState('');

  const { register } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (searchParams.get('org')) {
      setForm(f => ({ ...f, organizationId: searchParams.get('org') }));
    }
  }, [searchParams]);

  const handleRequestOTP = async () => {
    if (!form.email) {
      setError('Email is required');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      await api.post('/auth/send-otp', { email: form.email });
      setStep(2);
      toast.success('OTP sent to your email');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyAndRegister = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (!form.organizationId) {
      setError('Organization ID is required. Use the QR code provided by your admin.');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      const verifyRes = await api.post('/auth/verify-otp', { email: form.email, otp });
      const tempToken = verifyRes.data.tempToken;

      const user = await register({
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
        organizationId: form.organizationId,
        studentId: form.studentId || undefined,
        licenseNumber: form.licenseNumber || undefined,
        tempToken,
      });
      toast.success('Account created! Welcome to ShutlliX.');
      navigate(form.role === 'driver' ? '/driver' : '/student', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--navy)' }}>
      <div className="w-full max-w-md animate-fade-in">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--brand)' }}>
            <Bus size={20} color="white" />
          </div>
          <span className="font-display font-bold text-lg" style={{ color: 'var(--text-1)' }}>ShutlliX</span>
        </div>

        <h1 className="font-display font-bold text-3xl mb-2" style={{ color: 'var(--text-1)' }}>
          {step === 1 ? 'Create account' : 'Verify email'}
        </h1>
        <p className="mb-8" style={{ color: 'var(--text-3)' }}>
          {step === 1 ? 'Join your organization' : 'Enter the OTP sent to your email'}
        </p>

        {step === 1 ? (
          <>
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button type="button" onClick={() => setForm(f => ({ ...f, role: 'student' }))}
                className="flex flex-col items-center gap-2 py-4 rounded-xl text-sm font-medium transition-all"
                style={{ background: form.role === 'student' ? 'rgba(26,86,219,0.15)' : 'var(--surface-3)', border: `1px solid ${form.role === 'student' ? 'var(--brand)' : 'var(--border)'}`, color: form.role === 'student' ? 'var(--brand)' : 'var(--text-3)' }}>
                <GraduationCap size={22} /> I am a Student
              </button>
              <button type="button" onClick={() => setForm(f => ({ ...f, role: 'driver' }))}
                className="flex flex-col items-center gap-2 py-4 rounded-xl text-sm font-medium transition-all"
                style={{ background: form.role === 'driver' ? 'rgba(26,86,219,0.15)' : 'var(--surface-3)', border: `1px solid ${form.role === 'driver' ? 'var(--brand)' : 'var(--border)'}`, color: form.role === 'driver' ? 'var(--brand)' : 'var(--text-3)' }}>
                <Truck size={22} /> I am a Driver
              </button>
            </div>

            <div className="space-y-4">
              {error && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#FCA5A5' }}>
                  <AlertCircle size={16} /> {error}
                </div>
              )}
              <div>
                <label className="label">Full name</label>
                <input className="input" type="text" placeholder="Your full name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
              <div>
                <label className="label">Email</label>
                <input className="input" type="email" placeholder="you@organization.edu" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
              </div>
              <div>
                <label className="label">Organization ID</label>
                <input className="input" type="text" placeholder="From your admin's QR code" value={form.organizationId} onChange={e => setForm(f => ({ ...f, organizationId: e.target.value }))} required />
                <p className="text-xs mt-1" style={{ color: 'var(--text-4)' }}>Use the QR code provided by your transport admin</p>
              </div>
              {form.role === 'student' && (
                <div>
                  <label className="label">Student ID <span style={{ color: 'var(--text-4)' }}>(optional)</span></label>
                  <input className="input" type="text" placeholder="e.g., IBA-2022-045" value={form.studentId} onChange={e => setForm(f => ({ ...f, studentId: e.target.value }))} />
                </div>
              )}
              {form.role === 'driver' && (
                <div>
                  <label className="label">Driving License Number</label>
                  <input className="input" type="text" placeholder="e.g., KHI-2020-11234" value={form.licenseNumber} onChange={e => setForm(f => ({ ...f, licenseNumber: e.target.value }))} />
                </div>
              )}
              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <input className="input pr-11" type={showPassword ? 'text' : 'password'} placeholder="Min. 8 characters, uppercase + number" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
                  <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 btn-ghost btn-icon p-1" style={{ color: 'var(--text-3)' }}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="label">Confirm password</label>
                <input className="input" type={showPassword ? 'text' : 'password'} placeholder="Repeat your password" value={form.confirmPassword} onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))} required />
              </div>
              <button onClick={handleRequestOTP} disabled={isLoading} className="btn-primary btn-lg w-full mt-2 gap-2">
                {isLoading ? <span className="dot-loader"><span /><span /><span /></span> : <><Mail size={16} /> Send OTP</>}
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={handleVerifyAndRegister} className="space-y-5">
            {error && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#FCA5A5' }}>
                <AlertCircle size={16} /> {error}
              </div>
            )}
            <div>
              <label className="label">Email</label>
              <input className="input" value={form.email} disabled style={{ opacity: 0.7 }} />
            </div>
            <div>
              <label className="label">Enter 6‑digit OTP</label>
              <input className="input" type="text" maxLength="6" placeholder="123456" value={otp} onChange={e => setOtp(e.target.value)} required />
            </div>
            <button type="submit" disabled={isLoading} className="btn-primary btn-lg w-full">
              {isLoading ? <span className="dot-loader"><span /><span /><span /></span> : <>Verify & Create Account <ArrowRight size={18} /></>}
            </button>
            <button type="button" onClick={() => setStep(1)} className="text-sm w-full" style={{ color: 'var(--text-3)' }}>
              ← Back
            </button>
          </form>
        )}

        <p className="text-sm text-center mt-6" style={{ color: 'var(--text-3)' }}>
          Already have an account?{' '}
          <Link to="/login" className="font-medium hover:underline" style={{ color: 'var(--brand)' }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;