// src/components/ui/PinModal.tsx
//
// Modal de PIN para entrar como Yosy (admin) o como una profesional. Se
// abre desde Header/Footer vía useApp().abrirPinModal(rol). No es
// autenticación real — ver la nota en api/verificar-pin.ts.
import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Button } from './Button';
import { KeyRound } from 'lucide-react';

export const PinModal: React.FC = () => {
  const { pinModalRol, cerrarPinModal, verificarPin } = useApp();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [verificando, setVerificando] = useState(false);

  if (!pinModalRol) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) return;
    setVerificando(true);
    setError(false);
    const ok = await verificarPin(pin.trim());
    setVerificando(false);
    if (!ok) {
      setError(true);
      return;
    }
    setPin('');
  };

  const handleCerrar = () => {
    setPin('');
    setError(false);
    cerrarPinModal();
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-xs w-full p-6 space-y-4 border border-pink-100 shadow-2xl animate-in fade-in zoom-in-95">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 mx-auto rounded-full bg-pink-50 flex items-center justify-center">
            <KeyRound className="w-5 h-5 text-rf-rose-deep" />
          </div>
          <h3 className="font-display font-bold text-lg text-rf-black">
            {pinModalRol === 'admin' ? 'Ingresá tu PIN de Yosy' : 'Ingresá tu PIN de profesional'}
          </h3>
          <p className="text-xs text-rf-charcoal">Es el código de 4 dígitos que te compartieron.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password"
            inputMode="numeric"
            autoFocus
            value={pin}
            onChange={(e) => {
              setPin(e.target.value);
              setError(false);
            }}
            placeholder="••••"
            className={`w-full px-4 py-3 rounded-xl border text-center text-xl tracking-[0.4em] font-bold focus:outline-none focus:ring-2 focus:ring-rf-rose-deep ${
              error ? 'border-rf-danger' : 'border-pink-200'
            }`}
          />
          {error && <p className="text-xs text-rf-danger text-center">PIN incorrecto — probá de nuevo.</p>}

          <Button variant="primary" fullWidth size="md" disabled={verificando || !pin.trim()}>
            {verificando ? 'Verificando...' : 'Entrar'}
          </Button>
          <Button type="button" variant="ghost" fullWidth size="sm" onClick={handleCerrar}>
            Cancelar
          </Button>
        </form>
      </div>
    </div>
  );
};
