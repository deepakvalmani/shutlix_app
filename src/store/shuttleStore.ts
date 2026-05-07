import { create } from 'zustand';
import api from '../services/api';

interface ShuttleState {
  liveShuttles: Record<string, any>;
  shuttles: any[];
  routes: any[];
  stops: any[];
  bookings: any[];
  schedules: any[];
  selectedShuttle: any | null;
  fetchShuttles: () => Promise<void>;
  fetchRoutes: () => Promise<void>;
  fetchStops: () => Promise<void>;
  fetchAdminRoutes: () => Promise<void>;
  fetchAdminStops: () => Promise<void>;
  fetchAdminShuttles: () => Promise<void>;
  fetchBookings: () => Promise<void>;
  fetchSchedules: () => Promise<void>;
  selectShuttle: (shuttle: any | null) => void;
  updateLiveShuttle: (shuttle: any) => void;
  removeLiveShuttle: (shuttleId: string) => void;
  getLiveShuttlesArray: () => any[];
}

const useShuttleStore = create<ShuttleState>((set, get) => ({
  liveShuttles: {},
  shuttles: [],
  routes: [],
  stops: [],
  bookings: [],
  schedules: [],
  selectedShuttle: null,

  fetchRoutes: async () => {
    try {
        const { data } = await api.get('/student/routes');
        set({ routes: data.data || [] });
    } catch (err) {
        set({ routes: [] });
    }
  },

  fetchAdminRoutes: async () => {
    try {
        const { data } = await api.get('/admin/routes');
        set({ routes: data.data || [] });
    } catch (err) {
        set({ routes: [] });
    }
  },

  fetchShuttles: async () => {
    try {
        const { data } = await api.get('/student/shuttles');
        set({ shuttles: data.data || [] });
    } catch (err) {
        set({ shuttles: [] });
    }
  },

  fetchAdminShuttles: async () => {
    try {
        const { data } = await api.get('/admin/shuttles');
        set({ shuttles: data.data || [] });
    } catch (err) {
        set({ shuttles: [] });
    }
  },

  fetchStops: async () => {
    try {
        const { data } = await api.get('/student/stops');
        set({ stops: data.data || [] });
    } catch (err) {
        set({ stops: [] });
    }
  },

  fetchAdminStops: async () => {
    try {
        const { data } = await api.get('/admin/stops');
        set({ stops: data.data || [] });
    } catch (err) {
        set({ stops: [] });
    }
  },

  fetchBookings: async () => {
    try {
        const { data } = await api.get('/student/bookings');
        set({ bookings: data.data || [] });
    } catch (err) {
        set({ bookings: [] });
    }
  },

  fetchSchedules: async () => {
    try {
        const { data } = await api.get('/student/schedules');
        set({ schedules: data.data || [] });
    } catch (err) {
        set({ schedules: [] });
    }
  },

  selectShuttle: (shuttle) => set({ selectedShuttle: shuttle }),

  updateLiveShuttle: (shuttle) => {
    if (!shuttle.shuttleId) return;
    set((state) => ({
      liveShuttles: { 
        ...state.liveShuttles, 
        [shuttle.shuttleId]: {
            ...state.liveShuttles[shuttle.shuttleId],
            ...shuttle,
            lastUpdate: Date.now()
        } 
      }
    }));
  },

  removeLiveShuttle: (shuttleId) => {
    set((state) => {
      const newLiveShuttles = { ...state.liveShuttles };
      if (newLiveShuttles[shuttleId]) {
        newLiveShuttles[shuttleId] = { ...newLiveShuttles[shuttleId], isOnline: false };
      }
      return { liveShuttles: newLiveShuttles };
    });
  },

  getLiveShuttlesArray: () => Object.values(get().liveShuttles || {}).filter(Boolean),
}));

export default useShuttleStore;
