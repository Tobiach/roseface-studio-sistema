// src/lib/formatters.ts
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Formats a number into Argentine Pesos (ARS)
 * Example: 40000 -> "$ 40.000"
 */
export function formatCurrency(amount: number): string {
  if (isNaN(amount)) return '$ 0';
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(amount).replace('ARS', '$');
}

/**
 * Formats ISO date string to readable Spanish format
 * Example: "2026-08-15" -> "Sábado, 15 de Agosto"
 */
export function formatDateReadable(dateString: string): string {
  try {
    const date = parseISO(dateString);
    if (!isValid(date)) return dateString;
    return format(date, "EEEE, d 'de' MMMM", { locale: es });
  } catch {
    return dateString;
  }
}

/**
 * Formats ISO date string to short Spanish format
 * Example: "2026-08-15" -> "15/08/2026"
 */
export function formatDateShort(dateString: string): string {
  try {
    const date = parseISO(dateString);
    if (!isValid(date)) return dateString;
    return format(date, 'dd/MM/yyyy', { locale: es });
  } catch {
    return dateString;
  }
}

/**
 * Formats time range
 * Example: "10:00", "11:30" -> "10:00 - 11:30 hs"
 */
export function formatTimeRange(start: string, end: string): string {
  return `${start} - ${end} hs`;
}
