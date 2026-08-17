// src/components/layout/Sidebar.tsx
import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Logo } from '../ui/Logo';
import { useApp } from '../../context/AppContext';
import {
  CalendarDays,
  CircleDollarSign,
  TrendingUp,
  Crown,
  Eye,
  LogOut,
  Sparkles,
  X,
} from 'lucide-react';

interface SidebarProps {
  abierta?: boolean;
  onCerrar?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ abierta = false, onCerrar }) => {
  const { rolActivo, setRolActivo, profesionales, profesionalActivoId } = useApp();
  const esProfesional = rolActivo === 'profesional';
  const profesionalActivo = profesionales.find((p) => p.id === profesionalActivoId);

  const navItemsCompletos = [
    {
      label: esProfesional ? 'Mi Agenda' : 'Agenda',
      path: '/admin/agenda',
      icon: CalendarDays,
      description: 'Gestión diaria y turnos',
    },
    {
      label: esProfesional ? 'Mis Comisiones' : 'Comisiones',
      path: '/admin/comisiones',
      icon: CircleDollarSign,
      description: 'Cierre semanal del equipo',
    },
    {
      label: 'Caja & KPIs',
      path: '/admin/caja',
      icon: TrendingUp,
      description: 'Facturación y finanzas',
    },
    {
      label: 'Fidelización VIP',
      path: '/admin/vip',
      icon: Crown,
      description: 'Clientas VIP y recuperación',
    },
  ];

  // Un profesional ve solo su agenda y sus comisiones — Caja y VIP son vista exclusiva de la dueña
  const navItems = esProfesional
    ? navItemsCompletos.filter((item) => item.path === '/admin/agenda' || item.path === '/admin/comisiones')
    : navItemsCompletos;

  return (
    <>
      {/* Fondo oscuro — solo mientras el drawer está abierto en mobile */}
      {abierta && (
        <div
          onClick={onCerrar}
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
        />
      )}

      <aside
        className={`fixed md:sticky top-0 left-0 h-screen w-72 md:w-64 bg-white border-r border-pink-100 flex flex-col justify-between shrink-0 shadow-2xl md:shadow-xs z-50 md:z-30 transition-transform duration-300 ${
          abierta ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
      >
        <div>
        <div className="p-6 border-b border-pink-100/60 space-y-3">
          {/* Header Logo */}
          <div className="flex items-center justify-between">
            <Link to="/">
              <Logo size="sm" />
            </Link>
            <button
              onClick={onCerrar}
              aria-label="Cerrar menú"
              className="md:hidden p-1.5 text-rf-charcoal hover:text-rf-black cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center justify-between bg-rf-blush/40 px-3 py-1.5 rounded-lg border border-pink-200/50">
            <span className="text-[11px] font-semibold text-rf-rose-deep tracking-wide uppercase">
              {esProfesional ? 'Panel de Profesional' : 'Panel Administrativo'}
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="p-4 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all font-medium text-sm group ${
                    isActive
                      ? 'bg-rf-rose-deep text-white shadow-sm font-semibold'
                      : 'text-rf-charcoal hover:bg-rf-cream hover:text-rf-black'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={`w-5 h-5 transition-transform group-hover:scale-110 ${
                        isActive ? 'text-white' : 'text-rf-rose-deep'
                      }`}
                    />
                    <div className="flex flex-col">
                      <span>{item.label}</span>
                    </div>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
        </div>

      {/* Footer User Info & Role Switch */}
      <div className="p-4 border-t border-pink-100/80 bg-rf-cream/50 space-y-3">
        {/* Active Profile Badge */}
        <div className="flex items-center gap-3 p-2 rounded-xl bg-white border border-pink-100">
          {esProfesional && profesionalActivo ? (
            <img
              src={profesionalActivo.fotoUrl}
              alt={profesionalActivo.nombre}
              className="w-9 h-9 rounded-full object-cover border border-white shadow-xs"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-rf-gold to-rf-gold-bright flex items-center justify-center text-rf-black font-bold text-sm shadow-xs border border-white">
              Y
            </div>
          )}
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-bold text-rf-black truncate">
              {esProfesional && profesionalActivo ? profesionalActivo.nombre : 'Yosy Studio'}
            </span>
            <span className="text-[10px] text-rf-charcoal flex items-center gap-1 font-medium">
              <Sparkles className="w-2.5 h-2.5 text-rf-gold" />
              {esProfesional ? 'Profesional' : 'Dueña & Admin'}
            </span>
          </div>
        </div>

        {/* Switch back to Client View */}
        <button
          onClick={() => setRolActivo('clienta')}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rf-rose-deep bg-rf-blush/60 hover:bg-rf-blush transition-colors cursor-pointer"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Ver como Clienta</span>
        </button>
      </div>
    </aside>
    </>
  );
};
