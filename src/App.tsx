import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import useAuthStore from './store/authStore';
import { LoadingScreen } from './components/ui/index';
import { PushInitializer } from './components/PushInitializer';
import { canAccess, getDashboardPath } from './utils/permissions';

// Lazy load all pages for better performance
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const StudentPage = lazy(() => import('./pages/StudentPage'));
const DriverPage = lazy(() => import('./pages/DriverPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const SuperAdminPage = lazy(() => import('./pages/SuperAdminPage'));
const PublicPage = lazy(() => import('./pages/PublicPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const ChatPage = lazy(() => import('./pages/ChatPage'));
const BillingSuccess = lazy(() => import('./pages/BillingSuccess'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const CookiePolicy = lazy(() => import('./pages/CookiePolicy'));

const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) => {
  const { isAuthenticated, user, isLoading } = useAuthStore();
  
  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  
  if (!canAccess(user, allowedRoles)) {
    // If authenticated but no access, redirect to their home or login
    if (!user?.role) return <Navigate to="/login" replace />; 
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

const DashboardRedirect = () => {
  const { isAuthenticated, user, logout } = useAuthStore();
  
  if (!isAuthenticated) return <PublicPage />;
  
  if (!user?.role) {
    console.error('Authenticated user has no role defined. Logging out.');
    logout();
    return <Navigate to="/login" replace />;
  }
  
  return <Navigate to={getDashboardPath(user.role)} replace />;
};

export default function App() {
  const { checkAuth, isLoading, isAuthenticated } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isLoading) return <LoadingScreen />;

  return (
    <BrowserRouter>
      <Toaster position="top-center" />
      <PushInitializer />
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="/" element={<DashboardRedirect />} />
          <Route path="/login" element={isAuthenticated ? <DashboardRedirect /> : <LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/cookies" element={<CookiePolicy />} />
          
          <Route path="/student" element={
            <ProtectedRoute allowedRoles={['student', 'admin', 'superadmin']}>
              <StudentPage />
            </ProtectedRoute>
          } />
          
          <Route path="/driver" element={
            <ProtectedRoute allowedRoles={['driver', 'admin', 'superadmin']}>
              <DriverPage />
            </ProtectedRoute>
          } />

          <Route path="/admin/*" element={
            <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
              <AdminPage />
            </ProtectedRoute>
          } />

          <Route path="/superadmin" element={
            <ProtectedRoute allowedRoles={['superadmin']}>
              <SuperAdminPage />
            </ProtectedRoute>
          } />

          <Route path="/profile" element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          } />

          <Route path="/chat" element={
            <ProtectedRoute>
              <ChatPage />
            </ProtectedRoute>
          } />

          <Route path="/billing/success" element={
            <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
              <BillingSuccess />
            </ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
