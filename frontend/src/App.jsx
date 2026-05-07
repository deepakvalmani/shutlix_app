import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import useAuthStore from './store/authStore';
import useSocket from './hooks/useSocket';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import StudentPage from './pages/StudentPage';
import DriverPage from './pages/DriverPage';
import AdminPage from './pages/AdminPage';
import PublicPage from './pages/PublicPage';
import { NotFoundPage } from './pages/NotFoundPage';
import QRScanPage from './pages/QRScanPage';
import ProfilePage from './pages/ProfilePage';
import RouteEditorPage from './pages/RouteEditorPage';
import StopManagerPage from './pages/StopManagerPage';
import LoadingScreen from './components/ui/LoadingScreen';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user, isLoading } = useAuthStore();
  const location = useLocation();
  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to={getRoleHome(user?.role)} replace />;
  }
  return children;
};

const PublicRoute = ({ children }) => {
  const { isAuthenticated, user, isLoading } = useAuthStore();
  if (isLoading) return <LoadingScreen />;
  if (isAuthenticated) return <Navigate to={getRoleHome(user?.role)} replace />;
  return children;
};

const getRoleHome = (role) => {
  if (role === 'driver') return '/driver';
  if (role === 'admin' || role === 'superadmin') return '/admin';
  return '/student';
};

const SocketInitializer = () => {
  useSocket();
  return null;
};

const App = () => {
  const { init, isAuthenticated } = useAuthStore();
  useEffect(() => { init(); }, [init]);

  return (
    <>
      {isAuthenticated && <SocketInitializer />}
      <Routes>
        {/* Public (non‑auth) */}
        <Route path="/" element={<Navigate to="/public" replace />} />
        <Route path="/public" element={<PublicPage />} />
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

        {/* Student */}
        <Route path="/student/*" element={<ProtectedRoute allowedRoles={['student']}><StudentPage /></ProtectedRoute>} />
        <Route path="/driver/*" element={<ProtectedRoute allowedRoles={['driver']}><DriverPage /></ProtectedRoute>} />
        <Route path="/admin/*" element={<ProtectedRoute allowedRoles={['admin', 'superadmin']}><AdminPage /></ProtectedRoute>} />
        <Route path="/checkin/:token" element={<ProtectedRoute allowedRoles={['student']}><QRScanPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute allowedRoles={['student']}><ProfilePage /></ProtectedRoute>} />
        <Route path="/admin/routes/new" element={<ProtectedRoute allowedRoles={['admin', 'superadmin']}><RouteEditorPage /></ProtectedRoute>} />
        <Route path="/admin/routes/:routeId/edit" element={<ProtectedRoute allowedRoles={['admin', 'superadmin']}><RouteEditorPage /></ProtectedRoute>} />
        <Route path="/admin/stops" element={<ProtectedRoute allowedRoles={['admin', 'superadmin']}><StopManagerPage /></ProtectedRoute>} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
};

export default App;