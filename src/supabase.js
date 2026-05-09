import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("❌ Supabase env variables missing!");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Lee el token cacheado de localStorage (puede estar expirado).
// El interceptor de axios en App.jsx reintenta con el token fresco cuando
// Supabase dispara TOKEN_REFRESHED tras un 401.
// Supabase v2 persiste la sesión en: sb-<project-ref>-auth-token
function _readCachedToken() {
  try {
    const ref = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
    if (!ref) return null;
    const raw = localStorage.getItem(`sb-${ref}-auth-token`);
    return raw ? JSON.parse(raw)?.access_token || null : null;
  } catch { return null; }
}

// Token síncrono — inicializado desde localStorage, actualizado desde App.jsx.
// NO registramos onAuthStateChange aquí: tener dos listeners en v2 con refresh
// tokens rotativos provoca que uno de los dos falle el refresh → SIGNED_OUT.
let _token = _readCachedToken();

export function setAuthToken(token) { _token = token; }
export function getAuthHeaders() {
  return _token ? { Authorization: `Bearer ${_token}` } : {};
}
