import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("❌ Supabase env variables missing!");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Token síncrono — se actualiza con onAuthStateChange sin hacer await
let _token = null;

// Inicializar desde la sesión en caché (sin bloquear)
supabase.auth.getSession().then(({ data }) => {
  if (data?.session?.access_token) _token = data.session.access_token;
}).catch(() => {});

// Mantenerse en sync con cualquier cambio de sesión
supabase.auth.onAuthStateChange((_event, session) => {
  _token = session?.access_token || null;
});

/** Devuelve el header de Authorization de forma síncrona, sin await */
export function getAuthHeaders() {
  return _token ? { Authorization: `Bearer ${_token}` } : {};
}
