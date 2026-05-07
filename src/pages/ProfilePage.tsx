import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  User, Mail, Shield, LogOut, ChevronRight, Bell, 
  Moon, Sun, Lock, Trash2, Camera, ShieldCheck, 
  Truck, GraduationCap, Check, Save, Smartphone, Globe, X
} from 'lucide-react';
import useAuthStore from '../store/authStore';
import useThemeStore from '../store/themeStore';
import { Avatar, PageHeader } from '../components/ui/index';
import { usePushNotifications } from '../hooks/usePushNotifications';
import toast from 'react-hot-toast';
import api from '../services/api';

const ProfilePage = () => {
  const { user, logout, updateUser } = useAuthStore();
  const { isSubscribed, subscribeUser, unsubscribeUser } = usePushNotifications();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // Settings State
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [emailUpdates, setEmailUpdates] = useState(false);

  // Password Update State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const handlePushToggle = () => {
    if (isSubscribed) {
        unsubscribeUser();
    } else {
        subscribeUser();
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    toast.success('Signed out');
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      const response = await api.patch('/auth/me/profile', { name, email, phone });
      updateUser(response.data.data);
      setEditMode(false);
      toast.success('Profile updated successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) return toast.error('New passwords do not match');
    if (newPassword.length < 8) return toast.error('Password must be at least 8 characters');

    setLoading(true);
    try {
      await api.patch('/auth/me/password', { currentPassword, newPassword });
      toast.success('Password updated successfully');
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('This is permanent. Are you absolutely sure?')) return;
    setLoading(true);
    try {
      await api.delete('/auth/me');
      toast.success('Account deleted');
      logout();
      navigate('/login');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete account');
    } finally {
      setLoading(false);
    }
  };

  const roleInfo = (role: string) => {
    switch (role) {
      case 'admin': return { icon: ShieldCheck, color: '#7C3AED', label: 'Organization Admin' };
      case 'driver': return { icon: Truck, color: '#10B981', label: 'Verified Driver' };
      default: return { icon: GraduationCap, color: '#3B82F6', label: 'Member' };
    }
  };

  const currentRole = roleInfo(user?.role);
  const RoleIcon = currentRole.icon;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-base)' }}>
      <PageHeader title="Settings" subtitle="Manage your account and preferences" />

      <main className="flex-1 overflow-y-auto pb-32">
        {/* Profile Section */}
        <div className="px-6 py-10 flex flex-col items-center text-center">
          <div className="relative mb-6">
              <Avatar user={user} size={110} />
              <button className="absolute bottom-1 right-1 w-9 h-9 rounded-full bg-brand text-white flex items-center justify-center border-4 border-[var(--bg-base)] shadow-lg hover:scale-110 transition-transform">
                  <Camera size={16} />
              </button>
          </div>
          
          {editMode ? (
            <div className="w-full max-w-sm space-y-4 animate-fade-in">
                <input 
                    className="input text-center text-xl font-bold font-display" 
                    value={name} 
                    onChange={e => setName(e.target.value)}
                    placeholder="Full Name"
                />
                <input 
                    className="input text-center" 
                    value={phone} 
                    onChange={e => setPhone(e.target.value)}
                    placeholder="Phone Number"
                />
                <div className="flex gap-3">
                    <button onClick={() => setEditMode(false)} className="btn-secondary flex-1">Cancel</button>
                    <button onClick={handleSaveProfile} disabled={loading} className="btn-primary flex-1 gap-2">
                        {loading ? '...' : <><Save size={16} /> Save</>}
                    </button>
                </div>
            </div>
          ) : (
            <>
                <h1 className="font-display font-bold text-3xl mb-1" style={{ color: 'var(--text-1)' }}>{user?.name}</h1>
                <p className="text-sm opacity-60 mb-6" style={{ color: 'var(--text-3)' }}>{user?.email}</p>

                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider"
                style={{ background: `${currentRole.color}15`, color: currentRole.color, border: `1px solid ${currentRole.color}30` }}>
                <RoleIcon size={14} /> {currentRole.label}
                </div>
            </>
          )}
        </div>

        <div className="px-6 max-w-lg mx-auto space-y-8">
            {/* Main Settings Group */}
            <section className="space-y-3">
                <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] ml-1 mb-2 opacity-50">Identity</h3>
                <div className="glass-md rounded-3xl overflow-hidden divide-y divide-white/5 border border-white/5">
                    <button onClick={() => setEditMode(true)} className="w-full p-5 flex items-center justify-between hover:bg-white/5 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                                <User size={20} />
                            </div>
                            <span className="font-semibold">Edit Profile Information</span>
                        </div>
                        <ChevronRight size={18} className="opacity-30" />
                    </button>
                    
                    {user?.organizationId && (
                        <div className="w-full p-5 flex items-center justify-between">
                            <div className="flex items-center gap-4 text-left">
                                <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-500">
                                    <Shield size={20} />
                                </div>
                                <div>
                                    <p className="font-semibold">{user.organizationName || 'Organization'}</p>
                                    <p className="text-xs opacity-50">Enterprise Verified Account</p>
                                </div>
                            </div>
                            <Check size={18} className="text-green-500" />
                        </div>
                    )}
                </div>
            </section>

            {/* Preferences */}
            <section className="space-y-3">
                <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] ml-1 mb-2 opacity-50">Preferences</h3>
                <div className="glass-md rounded-3xl p-6 space-y-6 border border-white/5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                                <Bell size={20} />
                            </div>
                            <div>
                                <p className="font-semibold">Push Notifications</p>
                                <p className="text-xs opacity-50">Trip status and delay alerts</p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" checked={isSubscribed} onChange={handlePushToggle} />
                            <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand"></div>
                        </label>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                                <Mail size={20} />
                            </div>
                            <div>
                                <p className="font-semibold">Email Updates</p>
                                <p className="text-xs opacity-50">Weekly ridership summaries</p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" checked={emailUpdates} onChange={() => setEmailUpdates(!emailUpdates)} />
                            <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand"></div>
                        </label>
                    </div>
                </div>
            </section>

            {/* Security */}
            <section className="space-y-3">
                <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] ml-1 mb-2 opacity-50">Privacy & Security</h3>
                <div className="glass-md rounded-3xl overflow-hidden divide-y divide-white/5 border border-white/5">
                    <button onClick={() => setShowPasswordModal(true)} className="w-full p-5 flex items-center justify-between hover:bg-white/5 transition-colors text-left">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">
                                <Lock size={20} />
                            </div>
                            <div>
                                <p className="font-semibold">Change Password</p>
                                <p className="text-xs opacity-50">Keep your account secure</p>
                            </div>
                        </div>
                        <ChevronRight size={18} className="opacity-30" />
                    </button>
                    
                    <button onClick={() => setShowDeleteModal(true)} className="w-full p-5 flex items-center justify-between hover:bg-red-500/5 transition-colors text-left">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center text-red-500">
                                <Trash2 size={20} />
                            </div>
                            <div>
                                <p className="font-semibold text-red-500">Delete Account</p>
                                <p className="text-xs text-red-500/60">This action is irreversible</p>
                            </div>
                        </div>
                    </button>
                </div>
            </section>

            {/* Sign Out */}
            <button onClick={handleLogout} className="w-full py-5 rounded-3xl font-bold flex items-center justify-center gap-3 mt-10 shadow-xl transition-all active:scale-95 bg-glass-2 border border-border-1 text-red-500 hover:bg-red-500/5">
                <LogOut size={20} /> Sign Out
            </button>

            <div className="flex flex-col items-center gap-4 py-12">
                <div className="flex items-center gap-6 opacity-40">
                    <Link to="/privacy" className="text-[10px] font-bold uppercase tracking-widest hover:text-brand">Privacy</Link>
                    <div className="w-1 h-1 rounded-full bg-current" />
                    <Link to="/cookies" className="text-[10px] font-bold uppercase tracking-widest hover:text-brand">Cookies</Link>
                    <div className="w-1 h-1 rounded-full bg-current" />
                    <a href="#" className="text-[10px] font-bold uppercase tracking-widest hover:text-brand">Terms</a>
                </div>
                <p className="text-[10px] uppercase tracking-[0.3em] font-bold opacity-30">
                    ShutliX v2.0.4 • AI Powered Transit
                </p>
            </div>
        </div>
      </main>

      {/* Change Password Modal */}
      {showPasswordModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="bg-glass-3 rounded-3xl w-full max-w-md p-6 shadow-2xl border border-border-1">
                  <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-display font-bold">Change Password</h2>
                      <button onClick={() => setShowPasswordModal(false)} className="btn-ghost btn-icon"><X size={20}/></button>
                  </div>

                  <form onSubmit={handleChangePassword} className="space-y-4">
                      <div>
                          <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-1.5 block">Current Password</label>
                          <input 
                            type="password" 
                            className="input" 
                            required 
                            value={currentPassword}
                            onChange={e => setCurrentPassword(e.target.value)}
                          />
                      </div>
                      <div className="pt-2 border-t border-white/5">
                          <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-1.5 block">New Password</label>
                          <input 
                            type="password" 
                            className="input" 
                            required 
                            minLength={8}
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                          />
                      </div>
                      <div>
                          <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-1.5 block">Confirm New Password</label>
                          <input 
                            type="password" 
                            className="input" 
                            required 
                            value={confirmNewPassword}
                            onChange={e => setConfirmNewPassword(e.target.value)}
                          />
                      </div>
                      <button type="submit" disabled={loading} className="btn-primary w-full py-4 mt-2">
                          {loading ? 'Updating...' : 'Update Password'}
                      </button>
                  </form>
              </div>
          </div>
      )}

      {/* Delete Account Modal */}
      {showDeleteModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="bg-glass-3 rounded-3xl w-full max-w-md p-8 shadow-2xl border border-red-500/20 text-center">
                  <div className="w-20 h-20 rounded-[2.5rem] bg-red-500/10 flex items-center justify-center mx-auto mb-6 text-red-500">
                      <Trash2 size={40} />
                  </div>
                  <h2 className="text-2xl font-display font-bold mb-2">Delete Account?</h2>
                  <p className="text-sm opacity-60 mb-8">
                      This will permanently remove your account, rid history, and preferences. This action cannot be undone.
                  </p>
                  <div className="flex flex-col gap-3">
                      <button onClick={handleDeleteAccount} disabled={loading} className="py-4 rounded-2xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors">
                          {loading ? 'Deleting...' : 'Yes, Delete My Account'}
                      </button>
                      <button onClick={() => setShowDeleteModal(false)} className="py-4 rounded-2xl bg-glass-2 font-bold hover:bg-glass-3 transition-colors">
                          Keep Account
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default ProfilePage;
