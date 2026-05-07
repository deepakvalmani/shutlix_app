import { useEffect, useState } from 'react';
import { Bus, MapPin } from 'lucide-react';
import api from '../services/api';

const PublicPage = () => {
  const [routes, setRoutes] = useState([]);
  const [stops, setStops] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [routesRes, stopsRes] = await Promise.all([
          api.get('/public/routes'),
          api.get('/public/stops'),
        ]);
        setRoutes(routesRes.data.data || []);
        setStops(stopsRes.data.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="min-h-screen p-6" style={{ background: 'var(--navy)' }}>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--brand)' }}>
            <Bus size={22} color="white" />
          </div>
          <span className="font-display font-bold text-2xl" style={{ color: 'var(--text-1)' }}>ShutlliX Public</span>
        </div>

        <div className="mb-6">
          <p className="text-lg mb-2" style={{ color: 'var(--text-2)' }}>Public shuttle information</p>
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>View routes and stops – live tracking requires login.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="dot-loader"><span /><span /><span /></div></div>
        ) : (
          <div className="space-y-8">
            {/* Routes */}
            <div>
              <h2 className="font-display font-semibold text-xl mb-4" style={{ color: 'var(--text-1)' }}>Active Routes</h2>
              <div className="grid gap-4">
                {routes.map(route => (
                  <div key={route._id} className="rounded-2xl p-4" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-8 rounded-full" style={{ background: route.color || 'var(--brand)' }} />
                      <div>
                        <h3 className="font-bold text-lg" style={{ color: 'var(--text-1)' }}>{route.name}</h3>
                        <p className="text-xs" style={{ color: 'var(--text-3)' }}>{route.shortCode} · {route.stops?.length || 0} stops</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Stops */}
            <div>
              <h2 className="font-display font-semibold text-xl mb-4" style={{ color: 'var(--text-1)' }}>Stops</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {stops.map(stop => (
                  <div key={stop._id} className="rounded-xl p-3 flex items-center gap-2" style={{ background: 'var(--surface-3)', border: '1px solid var(--border)' }}>
                    <MapPin size={16} style={{ color: '#D97706' }} />
                    <span style={{ color: 'var(--text-1)' }}>{stop.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 text-center">
          <a href="/login" className="btn-primary inline-flex gap-2">Sign in for live tracking</a>
        </div>
      </div>
    </div>
  );
};

export default PublicPage;