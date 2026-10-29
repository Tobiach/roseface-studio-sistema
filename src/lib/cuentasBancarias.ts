// src/lib/cuentasBancarias.ts
//
// Cuentas bancarias para la seña de Mili y Roma (29/10/2026, pedido de Tobias:
// ya no se manda el link de Mercado Pago — se manda la cuenta que corresponda
// según el día del turno, así Yosy reparte el ingreso entre 3 cuentas propias).
// Datos reales confirmados por Tobias (doc "día a día Rose Face", pestaña 1).
// Solo aplica al circuito "mercado_pago" (ver circuitoPago en src/types) — las
// de alquiler fijo (Cris, Ari, etc.) siguen con su propia cuenta y
// comprobante, sin cambios.
export interface CuentaBancaria {
  dias: string; // etiqueta para mostrar, ej. "Lunes a miércoles"
  banco: string;
  cuentaEnPesos?: string;
  cbu: string;
  alias: string;
  titular: string;
}

const GALICIA: CuentaBancaria = {
  dias: 'Lunes a miércoles',
  banco: 'Banco Galicia',
  cbu: '0070136130004034722155',
  alias: 'FRANJA.LIJA.BANCO',
  titular: 'Haidi Trinidad Beitia',
};

const LEMON: CuentaBancaria = {
  dias: 'Jueves y viernes',
  banco: 'Banco Lemon',
  cbu: '0000168300000020305972',
  alias: 'alemonaca.LEMON',
  titular: 'Alejandro José Hernández Monaca',
};

const SANTANDER: CuentaBancaria = {
  dias: 'Sábado y domingo',
  banco: 'Banco Santander',
  cuentaEnPesos: '480-027126/4',
  cbu: '0720480188000002712640',
  alias: 'RoseFace',
  titular: 'Yosainy Muñoz',
};

export const CUENTAS_BANCARIAS: CuentaBancaria[] = [GALICIA, LEMON, SANTANDER];

// Date.getDay(): 0=domingo..6=sábado. Miércoles se sumó a la de Galicia
// (29/10/2026, Tobias pidió sumarlo a la rotación de alguna de las 3 sin
// indicar cuál) — si prefiere otra, es un cambio de una línea acá.
const CUENTA_POR_DIA: Record<number, CuentaBancaria> = {
  0: SANTANDER,
  1: GALICIA,
  2: GALICIA,
  3: GALICIA,
  4: LEMON,
  5: LEMON,
  6: SANTANDER,
};

export function cuentaBancariaDelDia(fechaISO: string): CuentaBancaria {
  const dia = new Date(`${fechaISO}T12:00:00`).getDay();
  return CUENTA_POR_DIA[dia];
}
