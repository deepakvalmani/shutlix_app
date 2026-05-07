import { create } from 'zustand';
import api from '../services/api';

interface AuthState {
  user: any;
  isAuthenticated: boolean;
  isLoading: boolean;
  lastChecked: number | null;
  checkAuth: (force?: boolean) => Promise<void>;
  login: (email: string, password: string, organizationCode?: string) => Promise<any>;
  register: (payload: any) => Promise<any>;
  sendOTP: (email: string) => Promise<void>;
  updateUser: (user: any) => void;
  logout: () => void;
}

const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: !!localStorage.getItem('accessToken'),
  isLoading: true,
  lastChecked: null,

  checkAuth: async (force = false) => {
    const { lastChecked, isAuthenticated } = get();
    
    // Skip if checked in last 2 minutes and already authenticated
    if (!force && isAuthenticated && lastChecked && Date.now() - lastChecked < 120000) {
      set({ isLoading: false });
      return;
    }

    const token = localStorage.getItem('accessToken');
    if (!token) {
        set({ isAuthenticated: false, isLoading: false, user: null, lastChecked: Date.now() });
        return;
    }
    
    set({ isLoading: true });
    try {
      const { data } = await api.get('/auth/me');
      set({ user: data.data, isAuthenticated: true, lastChecked: Date.now() });
    } catch (err) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      set({ user: null, isAuthenticated: false, lastChecked: Date.now() });
    } finally {
      set({ isLoading: false });
    }
  },

  updateUser: (user) => set({ user, isAuthenticated: true }),

  login: async (email, password, organizationCode) => {
    const { data: response } = await api.post('/auth/login', { email, password, organizationCode });
    const { accessToken, refreshToken, user } = response.data;
    
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    set({ user, isAuthenticated: true });
    return user;
  },

  register: async (payload) => {
    const { data: response } = await api.post('/auth/register', payload);
    const { accessToken, refreshToken, user } = response.data;

    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    set({ user, isAuthenticated: true });
    return user;
  },

  sendOTP: async (email) => {
    await api.post('/auth/send-otp', { email });
  },

  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    // We cannot easily import disconnectSocket here without circular dependency if not careful
    // But since it's a small function we can just do it or use a callback
    import('../services/socket').then(m => m.disconnectSocket());
    set({ user: null, isAuthenticated: false });
  },
}));

export default useAuthStore;
