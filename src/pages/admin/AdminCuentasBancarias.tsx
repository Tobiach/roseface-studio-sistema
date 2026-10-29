// src/pages/admin/AdminCuentasBancarias.tsx
//
// Las 3 cuentas bancarias que rotan según el día del turno, para la seña de
// Mili y Roma (29/10/2026, reemplaza el link de Mercado Pago — ver
// src/lib/cuentasBancarias.ts). Solo Yosy: son datos sensibles y no hace
// falta que una profesional los vea.
import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { CUENTAS_BANCARIAS } from '../../lib/cuentasBancarias';
import { Landmark, Calendar, Copy, Check } from 'lucide-react';

const Campo: React.FC<{ label: string; valor: string }> = ({ label, valor }) => {
  const [copiado, setCopiado] = useState(false);
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(valor);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      // Sin acceso al portapapeles: el dato ya está visible en pantalla para copiarlo a mano.
    }
  };
  return (
    <div className="flex items-center justify-between gap-2 py-1.5 border-b border-pink-50 last:border-0">
      <span className="text-[11px] text-rf-charcoal">{label}</span>
      <button
        type="button"
        onClick={copiar}
        className="flex items-center gap-1.5 font-semibold text-xs text-rf-black hover:text-rf-rose-deep cursor-pointer"
      >
        <span>{valor}</span>
        {copiado ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-gray-400" />}
      </button>
    </div>
  );
};

export const AdminCuentasBancarias: React.FC = () => {
  return (
    <div className="space-y-8 font-admin">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-pink-100">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="gold" icon={<Landmark className="w-3 h-3" />}>
              Cuentas de Banco
            </Badge>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-rf-black mt-1">
            Cuentas bancarias para la seña
          </h1>
        </div>
      </div>

      <Card className="bg-violet-50/60 border-violet-200 space-y-1.5">
        <p className="text-xs text-violet-950 leading-relaxed">
          Estas son las 3 cuentas que se usan, según el día del turno, en el recordatorio de seña (72hs y 48hs) de{' '}
          <strong>Mili y Roma</strong> — ya no se manda un link de Mercado Pago, se manda la cuenta que corresponda.
          El resto del equipo (Cris, Ari, etc.) sigue cobrando por transferencia a su propia cuenta, sin cambios acá.
        </p>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {CUENTAS_BANCARIAS.map((cuenta) => (
          <Card key={cuenta.alias} className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-pink-100">
              <h3 className="font-bold text-base text-rf-black">{cuenta.banco}</h3>
              <Badge variant="rose" icon={<Calendar className="w-3 h-3" />}>
                {cuenta.dias}
              </Badge>
            </div>
            <div className="text-xs">
              {cuenta.cuentaEnPesos && <Campo label="Cuenta en Pesos" valor={cuenta.cuentaEnPesos} />}
              <Campo label="CBU" valor={cuenta.cbu} />
              <Campo label="Alias" valor={cuenta.alias} />
              <Campo label="Titular" valor={cuenta.titular} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
