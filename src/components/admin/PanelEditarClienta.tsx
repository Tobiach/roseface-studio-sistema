// src/components/admin/PanelEditarClienta.tsx
//
// Corregir los datos de contacto de la clienta de un turno (nombre, teléfono, mail)
// sin salir de la Agenda. El guardado pasa por api/editar-turno.ts (acción "clienta"),
// que exige PIN y deja anotado el cambio en el turno.
import React, { useState } from 'react';
import { Save } from 'lucide-react';
import { Button } from '../ui/Button';
import { normalizarTelefonoWhatsApp } from '../../lib/whatsapp';
import type { DatosClienta } from '../../context/AppContext';
import type { Clienta } from '../../types';

interface Props {
  clienta: Clienta;
  // Solo Yosy puede dejar a una clienta sin teléfono.
  puedeVaciarTelefono: boolean;
  onGuardar: (datos: DatosClienta) => Promise<boolean>;
  onCancelar: () => void;
}

const campo = 'w-full px-3 py-2 rounded-xl border border-pink-200 text-xs font-semibold bg-white';

export const PanelEditarClienta: React.FC<Props> = ({ clienta, puedeVaciarTelefono, onGuardar, onCancelar }) => {
  const [nombre, setNombre] = useState(clienta.nombre);
  const [telefono, setTelefono] = useState(clienta.telefono ?? '');
  const [email, setEmail] = useState(clienta.email ?? '');
  const [guardando, setGuardando] = useState(false);

  const nombreLimpio = nombre.trim().replace(/\s+/g, ' ');
  const telefonoLimpio = telefono.trim();
  const digitos = telefonoLimpio.replace(/\D/g, '').length;
  const emailLimpio = email.trim();

  const nombreOk = nombreLimpio.length >= 2 && nombreLimpio.length <= 80;
  const telefonoOk =
    telefonoLimpio === ''
      ? puedeVaciarTelefono
      : /^[0-9+()\-\s.]+$/.test(telefonoLimpio) && digitos >= 8 && digitos <= 15;
  const emailOk = emailLimpio === '' || (emailLimpio.length <= 120 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpio));

  // Solo se mandan los datos que cambiaron.
  const datos: DatosClienta = {};
  if (nombreLimpio !== clienta.nombre) datos.nombre = nombreLimpio;
  if (telefonoLimpio !== (clienta.telefono ?? '')) datos.telefono = telefonoLimpio;
  if (emailLimpio !== (clienta.email ?? '')) datos.email = emailLimpio;
  const hayCambios = Object.keys(datos).length > 0;

  const guardar = async () => {
    setGuardando(true);
    await onGuardar(datos);
    setGuardando(false);
  };

  return (
    <div className="space-y-2.5 rounded-xl border border-pink-200 bg-white p-3">
      <p className="text-xs font-bold text-rf-black">Datos de la clienta</p>
      <div>
        <label className="font-bold text-rf-black block mb-1 text-[11px]">Nombre</label>
        <input type="text" value={nombre} maxLength={80} onChange={(e) => setNombre(e.target.value)} className={campo} />
        {!nombreOk && <p className="text-[11px] text-red-700 mt-1 font-semibold">El nombre tiene que tener al menos 2 letras.</p>}
      </div>
      <div>
        <label className="font-bold text-rf-black block mb-1 text-[11px]">Teléfono (WhatsApp)</label>
        <input
          type="tel"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          placeholder="Ej: 11 2769 6736"
          className={campo}
        />
        {!telefonoOk ? (
          <p className="text-[11px] text-red-700 mt-1 font-semibold">
            {telefonoLimpio === ''
              ? 'Solo Yosy puede dejar una clienta sin teléfono.'
              : 'El teléfono tiene que tener entre 8 y 15 números (podés usar espacios, guiones o +).'}
          </p>
        ) : (
          digitos > 0 && (
            <p className="text-[11px] text-gray-500 mt-1">
              Se le escribe a: <strong>+{normalizarTelefonoWhatsApp(telefonoLimpio)}</strong> (con código de país, como lo pide WhatsApp)
            </p>
          )
        )}
      </div>
      <div>
        <label className="font-bold text-rf-black block mb-1 text-[11px]">Mail (opcional)</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={campo} />
        {!emailOk && <p className="text-[11px] text-red-700 mt-1 font-semibold">Ese mail no parece válido.</p>}
      </div>
      <div className="flex items-center justify-end gap-2 pt-1">
        <Button variant="ghost" size="sm" onClick={onCancelar} disabled={guardando}>
          Cancelar
        </Button>
        <Button variant="primary" size="sm" onClick={guardar} disabled={guardando || !hayCambios || !nombreOk || !telefonoOk || !emailOk}>
          <Save className="w-3.5 h-3.5" />
          <span>{guardando ? 'Guardando…' : 'Guardar datos'}</span>
        </Button>
      </div>
    </div>
  );
};
