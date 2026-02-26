import React from 'react';
import { useAuth, AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Toaster } from 'react-hot-toast';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/Layout/MainLayout';
import DashboardVacunas from './pages/DashboardVacunas';
import RegistroDosis from './pages/RegistroDosis';
import Login from './pages/Login';
import CentroReportes from './pages/CentroReportes';

const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles: string[] }) => {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(role)) {
    const defaultRoute = role === 'SUPER_USUARIO' || role === 'USUARIO_LECTOR' ? '/dashboard' : '/registro';
    return <Navigate to={defaultRoute} replace />;
  }

  return <>{children}</>;
};

const AppRoutes = () => {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />

      <Route path="/" element={<MainLayout />}>
        <Route index element={<Navigate to={(role === 'SUPER_USUARIO' || role === 'USUARIO_LECTOR') ? '/dashboard' : '/registro'} replace />} />

        <Route path="dashboard" element={
          <ProtectedRoute allowedRoles={['SUPER_USUARIO', 'USUARIO_LECTOR']}>
            <DashboardVacunas />
          </ProtectedRoute>
        } />

        <Route path="registro" element={
          <ProtectedRoute allowedRoles={['SUPER_USUARIO', 'USUARIO_OPS']}>
            <RegistroDosis />
          </ProtectedRoute>
        } />


        <Route path="reportes" element={
          <ProtectedRoute allowedRoles={['SUPER_USUARIO']}>
            <CentroReportes />
          </ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
          <Toaster position="top-right" />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
