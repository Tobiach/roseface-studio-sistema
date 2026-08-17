// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseEnabled = !!(url && key);
export const supabase = supabaseEnabled ? createClient(url!, key!) : null;

// Headers patch para compatibilidad de producción
if (typeof Headers !== 'undefined' && !Headers.prototype.getSetCookie) {
  (Headers.prototype as any).getSetCookie = () => [];
}
