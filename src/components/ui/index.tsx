import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { getCapacityStatus } from '../../services/maps';
import ThemeToggle from './ThemeToggle';

// ── BusLogo ──────────────────────────────────────────────
export function BusLogo({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="7" width="18" height="12" rx="3" fill="white"/>
      <rect x="5" y="3" width="14" height="6" rx="2" fill="rgba(255,255,255,0.75)"/>
      <rect x="4" y="10" width="4" height="3" rx="1" fill="rgba(124,58,237,0.5)"/>
      <rect x="10" y="10" width="4" height="3" rx="1" fill="rgba(124,58,237,0.5)"/>
      <rect x="16" y="10" width="3" height="3" rx="1" fill="rgba(124,58,237,0.5)"/>
      <circle cx="7"  cy="20" r="2" fill="#08050F" stroke="white" strokeWidth="1"/>
      <circle cx="17" cy="20" r="2" fill="#08050F" stroke="white" strokeWidth="1"/>
    </svg>
  );
}

// ── CapacityBadge ────────────────────────────────────────
export function CapacityBadge({ current = 0, total = 30, size = 'md', showBar = true }) {
  const status = getCapacityStatus(current, total);
  const pct = Math.min(100, status.percent);

  const colorMap: Record<string, any> = {
    green:  { bar: '#10B981', bg: 'rgba(16,185,129,0.12)', text: '#34D399', border: 'rgba(16,185,129,0.3)' },
    yellow: { bar: '#F59E0B', bg: 'rgba(245,158,11,0.12)', text: '#FBBF24', border: 'rgba(245,158,11,0.3)' },
    orange: { bar: '#F97316', bg: 'rgba(249,115,22,0.12)', text: '#FB923C', border: 'rgba(249,115,22,0.3)' },
    red:    { bar: '#EF4444', bg: 'rgba(239,68,68,0.12)',  text: '#F87171', border: 'rgba(239,68,68,0.3)'  },
    gray:   { bar: '#6B7280', bg: 'rgba(107,114,128,0.12)', text: '#9CA3AF', border: 'rgba(107,114,128,0.3)' },
  };

  const c = colorMap[status.color] || colorMap.gray;
  const isSmall = size === 'sm';

  if (!showBar) {
      return (
        <span
          className="inline-flex items-center gap-1.5 font-semibold rounded-full"
          style={{
            background: c.bg,
            color: c.text,
            border: `1px solid ${c.border}`,
            fontSize: isSmall ? '10px' : '11px',
            padding: isSmall ? '2px 8px' : '3px 10px',
          }}
        >
          <span style={{
            width: isSmall ? 5 : 6,
            height: isSmall ? 5 : 6,
            borderRadius: '50%',
            background: c.bar,
            display: 'inline-block',
            flexShrink: 0,
          }} />
          {status.label} {current}/{total}
        </span>
      );
  }

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <div className="flex items-center justify-between gap-3">
        <span
          className="inline-flex items-center gap-1.5 font-semibold rounded-full"
          style={{
            background: c.bg,
            color: c.text,
            border: `1px solid ${c.border}`,
            fontSize: isSmall ? '10px' : '11px',
            padding: isSmall ? '2px 8px' : '3px 10px',
          }}
        >
          <span style={{
            width: isSmall ? 5 : 6,
            height: isSmall ? 5 : 6,
            borderRadius: '50%',
            background: c.bar,
            display: 'inline-block',
            flexShrink: 0,
          }} />
          {status.label}
        </span>
        <span style={{ color: 'var(--text-3)', fontSize: isSmall ? '11px' : '12px' }}>
          {current}/{total}
        </span>
      </div>

      <div style={{
        width: '100%',
        height: isSmall ? 4 : 5,
        borderRadius: 99,
        background: 'var(--glass-1)',
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${pct}%`,
          height: '100%',
          borderRadius: 99,
          background: c.bar,
          transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
        }} />
      </div>
    </div>
  );
}

// ── LoadingScreen ────────────────────────────────────────
export function LoadingScreen({ message = 'Loading ShutliX...' }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6"
      style={{ background: 'var(--bg-base)' }}>
      <div className="relative">
        <div className="w-16 h-16 rounded-3xl flex items-center justify-center glow-violet"
          style={{ background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-light) 100%)' }}>
          <BusLogo size={32} />
        </div>
        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full dot-green" />
        <div className="absolute inset-0 rounded-2xl animate-ping"
            style={{ border: '2px solid rgba(26,86,219,0.4)' }} />
      </div>

      <div className="text-center">
        <h1 className="text-xl font-display font-semibold mb-1"
            style={{ color: 'var(--text-1)' }}>
            ShutliX
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-3)' }}>{message}</p>
      </div>

      <div className="loader"><span /><span /><span /></div>
    </div>
  );
}

// ── Avatar ────────────────────────────────────────────────
export function Avatar({ user, size = 36 }: { user: any, size?: number }) {
  const initials = user?.name?.split(' ').map((w: any) => w[0]).join('').slice(0, 2).toUpperCase() || '?';
  const palettes: Record<string, string[]> = {
    admin:      ['#4C1D95', '#7C3AED'],
    superadmin: ['#4C1D95', '#7C3AED'],
    driver:     ['#065F46', '#10B981'],
    student:    ['#1E3A5F', '#3B82F6'],
  };
  const [from, to] = palettes[user?.role] || ['#374151', '#6B7280'];

  return (
    <div className="rounded-full flex items-center justify-center font-bold text-white flex-shrink-0"
      style={{
        width: size, height: size,
        background: `linear-gradient(135deg, ${from}, ${to})`,
        fontSize: Math.floor(size * 0.36),
        boxShadow: `0 2px 8px ${from}60`,
      }}>
      {initials}
    </div>
  );
}

// ── Button ────────────────────────────────────────────────
export function Button({ children, className = "", variant = "primary", icon: Icon, size = "md", ...props }: any) {
  const base = "inline-flex items-center justify-center gap-2 font-bold uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none rounded-xl";
  const variants: any = {
    primary: "btn-primary",
    secondary: "btn-secondary",
    outline: "border-2 border-brand text-brand hover:bg-brand hover:text-white",
    ghost: "btn-ghost",
    danger: "bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/20",
  };
  const sizes: any = {
    sm: "px-4 py-2 text-[10px]",
    md: "px-6 py-3 text-xs",
    lg: "px-8 py-4 text-sm",
    xl: "px-10 py-5 text-base",
  };

  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {Icon && <Icon size={isSmall(size) ? 14 : 18} />}
      {children}
    </button>
  );
}
const isSmall = (s: string) => s === 'sm' || s === 'md';

// ── Input ────────────────────────────────────────────────
export function Input({ label, error, className = "", ...props }: any) {
  return (
    <div className={`flex flex-col gap-1.5 w-full ${className}`}>
      {label && <label className="text-[11px] font-bold uppercase tracking-widest opacity-60 ml-1" style={{ color: 'var(--text-2)' }}>{label}</label>}
      <input 
        className="w-full h-12 bg-[var(--glass-1)] border border-[var(--border-1)] rounded-xl px-4 text-sm font-medium focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all outline-none"
        style={{ color: 'var(--text-1)' }}
        {...props}
      />
      {error && <span className="text-[10px] font-bold text-red-500 ml-1">{error}</span>}
    </div>
  );
}

// ── GlassCard ─────────────────────────────────────────────
export function GlassCard({ children, className = "", hover = false }: any) {
  return (
    <div className={`glass-md border border-[var(--border-1)] rounded-3xl p-8 ${hover ? 'hover:border-brand/30 transition-all' : ''} ${className}`}>
      {children}
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────
export function Modal({ isOpen, onClose, title, children }: any) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg glass-heavy border border-[var(--border-1)] rounded-[2rem] p-10 animate-scale-up" style={{ color: 'var(--text-1)' }}>
        {title && <h3 className="text-2xl font-bold tracking-tight mb-8">{title}</h3>}
        {children}
      </div>
    </div>
  );
}

// ── PageHeader ──────────────────────────────────────────
export function PageHeader({ title, subtitle, showBack = true }: { title: string, subtitle?: string, showBack?: boolean }) {
  const navigate = useNavigate();
  return (
    <header className="flex-shrink-0 px-4 py-3 flex items-center justify-between sticky top-0 z-40"
      style={{ background: 'var(--glass-3)', borderBottom: '1px solid var(--border-1)', backdropFilter: 'blur(20px)' }}>
      <div className="flex items-center gap-3">
        {showBack && (
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-glass-2 transition-colors">
            <ChevronLeft size={20} />
          </button>
        )}
        <div>
          <h1 className="font-display font-bold text-lg leading-none" style={{ color: 'var(--text-1)' }}>{title}</h1>
          {subtitle && <p className="text-[11px] font-medium opacity-60" style={{ color: 'var(--text-3)' }}>{subtitle}</p>}
        </div>
      </div>
      <ThemeToggle />
    </header>
  );
}
