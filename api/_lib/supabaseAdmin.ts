// api/_lib/supabaseAdmin.ts
//
// Cliente de Supabase para uso exclusivo en funciones serverless, con la
// service_role key (salta RLS). NUNCA importar esto desde src/ — es
// solo para /api/*. El archivo empieza con "_" a propósito: Vercel no lo
// trata como una ruta propia.
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let cliente: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  if (!cliente) cliente = createClient(url, key);
  return cliente;
}
