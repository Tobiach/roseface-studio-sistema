// src/router.tsx
import React from 'react';
import { createBrowserRouter, Navigate, Outlet, useLocation } from 'react-router-dom';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { Sidebar } from './components/layout/Sidebar';
import { FloatingWhatsAppButton } from './components/ui/FloatingWhatsAppButton';
import { useApp } from './context/AppContext';

// Pages
import { Home } from './pages/Home';
import { Reserva } from './pages/Reserva';
import { ReservaConfirmacion } from './pages/ReservaConfirmacion';
import { Profesionales } from './pages/Profesionales';
import { PerfilProfesional } from './pages/PerfilProfesional';
import { AdminAgenda } from './pages/admin/AdminAgenda';
import { AdminComisiones } from './pages/admin/AdminComisiones';
import { AdminCaja } from './pages/admin/AdminCaja';
import { AdminVIP } from './pages/admin/AdminVIP';

// Public Layout with Header and Footer
const PublicLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-rf-cream text-rf-black">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <FloatingWhatsAppButton />
    </div>
  );
};

// Admin Layout with Sidebar
const AdminLayout: React.FC = () => {
  const { rolActivo } = useApp();
  const location = useLocation();

  // Un profesional solo puede ver su Agenda y sus Comisiones — Caja y VIP son exclusivos de la dueña
  const rutaRestringidaParaProfesional =
    rolActivo === 'profesional' &&
    (location.pathname.startsWith('/admin/caja') || location.pathname.startsWith('/admin/vip'));

  if (rutaRestringidaParaProfesional) {
    return <Navigate to="/admin/agenda" replace />;
  }

  return (
    <div className="min-h-screen flex bg-rf-cream text-rf-black">
      <Sidebar />
      <main className="flex-1 p-6 sm:p-10 overflow-y-auto max-w-7xl">
        <Outlet />
      </main>
    </div>
  );
};

export const router = createBrowserRouter([
  {
    path: '/',
    element: <PublicLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'reserva', element: <Reserva /> },
      { path: 'reserva/confirmacion', element: <ReservaConfirmacion /> },
      { path: 'profesionales', element: <Profesionales /> },
      { path: 'profesionales/:id', element: <PerfilProfesional /> },
    ],
  },
  {
    path: '/admin',
    element: <AdminLayout />,
    children: [
      { index: true, element: <Navigate to="/admin/agenda" replace /> },
      { path: 'agenda', element: <AdminAgenda /> },
      { path: 'comisiones', element: <AdminComisiones /> },
      { path: 'caja', element: <AdminCaja /> },
      { path: 'vip', element: <AdminVIP /> },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
