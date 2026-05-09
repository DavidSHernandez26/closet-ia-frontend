import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("❌ Supabase env variables missing!");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Token síncrono — actualizado SOLO desde App.jsx mediante setAuthToken.
// NO registramos onAuthStateChange aquí: tener dos listeners en v2 con refresh
// tokens rotativos provoca que uno de los dos falle el refresh → SIGNED_OUT.
let _token = null;

export function setAuthToken(token) { _token = token; }
export function getAuthHeaders() {
  return _token ? { Authorization: `Bearer ${_token}` } : {};
}
