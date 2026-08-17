// src/router.tsx
import React, { useEffect, useState } from 'react';
import { createBrowserRouter, Navigate, Outlet, ScrollRestoration, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { Sidebar } from './components/layout/Sidebar';
import { Logo } from './components/ui/Logo';
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

// Después de cada navegación, si la URL trae #ancla (ej. /#servicios) hace
// scroll suave hasta esa sección, descontando el alto del header sticky.
function useScrollAHash() {
  const location = useLocation();
  useEffect(() => {
    if (!location.hash) return;
    const id = location.hash.slice(1);
    const el = document.getElementById(id);
    if (!el) return;
    requestAnimationFrame(() => {
      const HEADER_OFFSET = 96;
      const top = el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  }, [location.pathname, location.hash]);
}

// Public Layout with Header and Footer
const PublicLayout: React.FC = () => {
  useScrollAHash();
  return (
    <div className="min-h-screen flex flex-col bg-rf-cream text-rf-black">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <FloatingWhatsAppButton />
      <ScrollRestoration />
    </div>
  );
};

// Admin Layout with Sidebar — la sidebar es un drawer que se desliza en
// mobile (con hamburguesa + fondo oscuro) y queda fija como antes en desktop.
const AdminLayout: React.FC = () => {
  const { rolActivo } = useApp();
  const location = useLocation();
  const [sidebarAbierta, setSidebarAbierta] = useState(false);

  useEffect(() => {
    setSidebarAbierta(false);
  }, [location.pathname]);

  // Un profesional solo puede ver su Agenda y sus Comisiones — Caja y VIP son exclusivos de la dueña
  const rutaRestringidaParaProfesional =
    rolActivo === 'profesional' &&
    (location.pathname.startsWith('/admin/caja') || location.pathname.startsWith('/admin/vip'));

  if (rutaRestringidaParaProfesional) {
    return <Navigate to="/admin/agenda" replace />;
  }

  return (
    <div className="min-h-screen flex bg-rf-cream text-rf-black">
      <Sidebar abierta={sidebarAbierta} onCerrar={() => setSidebarAbierta(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Barra superior — solo mobile */}
        <div className="md:hidden sticky top-0 z-20 bg-white border-b border-pink-100 px-4 h-16 flex items-center justify-between">
          <button
            onClick={() => setSidebarAbierta(true)}
            aria-label="Abrir menú"
            className="p-2 -ml-2 text-rf-rose-deep cursor-pointer"
          >
            <Menu className="w-6 h-6" />
          </button>
          <Logo size="sm" />
          <span className="w-10" />
        </div>
        <main className="flex-1 p-4 sm:p-6 md:p-10 overflow-y-auto max-w-7xl w-full min-w-0">
          <Outlet />
        </main>
      </div>
      <ScrollRestoration />
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
