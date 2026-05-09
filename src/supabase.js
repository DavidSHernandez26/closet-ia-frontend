import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("❌ Supabase env variables missing!");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Token síncrono — se actualiza con onAuthStateChange sin hacer await ni getSession
let _token = null;

supabase.auth.onAuthStateChange((_event, session) => {
  _token = session?.access_token || null;
});

/** Devuelve el header de Authorization de forma síncrona, sin await */
export function getAuthHeaders() {
  return _token ? { Authorization: `Bearer ${_token}` } : {};
}
