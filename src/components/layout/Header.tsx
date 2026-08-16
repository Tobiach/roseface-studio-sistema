// src/components/layout/Header.tsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Logo } from '../ui/Logo';
import { Button } from '../ui/Button';
import { useApp } from '../../context/AppContext';
import { Calendar, Shield, Sparkles, UserCog } from 'lucide-react';

export const Header: React.FC = () => {
  const { rolActivo, setRolActivo, profesionales, profesionalActivoId, setProfesionalActivoId } = useApp();
  const location = useLocation();

  const entrarComoProfesional = () => {
    setRolActivo('profesional');
    if (!profesionalActivoId && profesionales[0]) {
      setProfesionalActivoId(profesionales[0].id);
    }
  };

  const navLinks = [
    { label: 'Inicio', path: '/' },
    { label: 'Servicios', path: '/#servicios' },
    { label: 'Equipo', path: '/profesionales' },
    { label: 'Fidelización VIP', path: '/#vip' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-white/90 backdrop-blur-md border-b border-pink-100/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <Logo size="md" />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.path}
              className="text-sm font-medium text-rf-charcoal hover:text-rf-rose-deep transition-colors"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Actions & Role Switcher */}
        <div className="flex items-center gap-3">
          {/* Quick Role Toggle Switcher */}
          <div className="hidden sm:flex items-center bg-rf-cream p-1 rounded-xl border border-pink-200/60 text-xs">
            <button
              onClick={() => setRolActivo('clienta')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                rolActivo === 'clienta'
                  ? 'bg-white text-rf-rose-deep shadow-xs font-semibold'
                  : 'text-rf-charcoal hover:text-rf-black'
              }`}
            >
              Clienta
            </button>
            <button
              onClick={entrarComoProfesional}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1 ${
                rolActivo === 'profesional'
                  ? 'bg-white text-rf-rose-deep shadow-xs font-semibold'
                  : 'text-rf-charcoal hover:text-rf-black'
              }`}
            >
              <UserCog className="w-3 h-3" />
              Profesional
            </button>
            <button
              onClick={() => setRolActivo('admin')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1 ${
                rolActivo === 'admin'
                  ? 'bg-rf-rose-deep text-white shadow-xs font-semibold'
                  : 'text-rf-charcoal hover:text-rf-black'
              }`}
            >
              <Shield className="w-3 h-3" />
              Admin
            </button>
          </div>

          {/* Professional picker — only visible in Profesional role */}
          {rolActivo === 'profesional' && (
            <select
              value={profesionalActivoId ?? ''}
              onChange={(e) => setProfesionalActivoId(e.target.value)}
              className="hidden sm:block px-2.5 py-2 rounded-xl border border-pink-200 text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-rf-rose-deep"
            >
              {profesionales.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          )}

          {/* Conditional Admin/Profesional Quick Access or Booking CTA */}
          {rolActivo === 'admin' ? (
            <Link to="/admin/agenda">
              <Button variant="gold" size="sm" className="gap-1.5">
                <Shield className="w-4 h-4" />
                <span>Panel Yosy</span>
              </Button>
            </Link>
          ) : rolActivo === 'profesional' ? (
            <Link to="/admin/agenda">
              <Button variant="gold" size="sm" className="gap-1.5">
                <UserCog className="w-4 h-4" />
                <span>Mi Panel</span>
              </Button>
            </Link>
          ) : (
            <Link to="/reserva">
              <Button variant="primary" size="md" className="shadow-sm">
                <Calendar className="w-4 h-4" />
                <span>Reservar turno</span>
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
