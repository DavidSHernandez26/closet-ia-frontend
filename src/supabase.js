import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("❌ Supabase env variables missing!");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Lee el token cacheado SOLO si aún no ha expirado (con 60s de margen).
// Si está expirado devuelve null para que las llamadas no se hagan con un
// token inválido — el interceptor de axios reintenará cuando llegue TOKEN_REFRESHED.
// Supabase v2 persiste la sesión en: sb-<project-ref>-auth-token
function _readCachedToken() {
  try {
    const ref = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
    if (!ref) return null;
    const raw = localStorage.getItem(`sb-${ref}-auth-token`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const token = parsed?.access_token;
    if (!token) return null;
    // expires_at es Unix timestamp en segundos; 60s de margen
    const exp = parsed?.expires_at;
    if (exp && Math.floor(Date.now() / 1000) > exp - 60) return null;
    return token;
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
