// src/lib/clienteRecordado.ts
//
// Recuerda los datos de contacto de la clienta en este navegador (nombre,
// teléfono, mail) para no pedírselos de nuevo la próxima vez que entra a
// reservar. Es local al dispositivo/navegador — no hay login de clienta,
// así que no hay forma de reconocerla entre dispositivos distintos.
const CLAVE = 'roseface_clienta';

export interface ClienteRecordado {
  nombre: string;
  telefono: string;
  email: string;
}

export function leerClienteRecordado(): ClienteRecordado | null {
  try {
    const raw = localStorage.getItem(CLAVE);
    if (!raw) return null;
    return JSON.parse(raw) as ClienteRecordado;
  } catch {
    return null;
  }
}

export function guardarClienteRecordado(data: ClienteRecordado): void {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(data));
  } catch {
    // localStorage puede fallar (modo privado, storage lleno) — no es crítico
  }
}
