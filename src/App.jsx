import React, { useEffect, useState, useCallback, memo } from "react";
import { useTheme } from "next-themes";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import axios from "axios";
import { supabase, setAuthToken } from "./supabase";
import { API_URL } from "./config";
import "./App.css";
import "./styles/animations.css";
import { Capacitor } from "@capacitor/core";
import Navbar from "./components/Navbar";
import { UploadProvider } from "./context/UploadContext";
import UploadToast from "./components/UploadToast";

// Lazy load — cada página se descarga solo cuando el usuario la visita
const Asistente   = React.lazy(() => import("./pages/Asistente"));
const Closet      = React.lazy(() => import("./pages/Closet"));
const Calendario  = React.lazy(() => import("./pages/Calendario"));
const Perfil      = React.lazy(() => import("./pages/Perfil"));
const Amigos      = React.lazy(() => import("./pages/Amigos"));
const SetupPerfil = React.lazy(() => import("./pages/SetupPerfil"));
const Login       = React.lazy(() => import("./pages/Login"));
const Register    = React.lazy(() => import("./pages/Register"));
const Waitlist    = React.lazy(() => import("./pages/Waitlist"));
const Feed        = React.lazy(() => import("./pages/Feed"));

// Lee la sesión guardada en localStorage de forma síncrona.
// Supabase v2 persiste la sesión en: sb-<project-ref>-auth-token
function _readCachedSession() {
  try {
    const url = import.meta.env.VITE_SUPABASE_URL || "";
    const ref = url.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
    if (!ref) return null;
    const raw = localStorage.getItem(`sb-${ref}-auth-token`);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
const _cachedSession = _readCachedSession();

// Token cacheado — puede ser expirado; el interceptor reintenta tras TOKEN_REFRESHED
let _authToken = _cachedSession?.access_token || null;

axios.interceptors.request.use((config) => {
  config.headers = config.headers || {};
  if (_authToken) config.headers["Authorization"] = `Bearer ${_authToken}`;
  return config;
});

// Cuando se recibe un 401, NO llamamos refreshSession() manualmente porque
// Supabase ya refresca el token automáticamente vía onAuthStateChange (TOKEN_REFRESHED).
// Usamos polling cada 200ms durante hasta 8s para detectar el nuevo token en cuanto
// llega, sin depender de un setTimeout fijo que puede ser más corto que el refresh.
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      const failedToken = (originalRequest.headers?.Authorization || "").replace("Bearer ", "") || null;

      // Polling: verificar cada 200ms si _authToken cambió (máx 8s)
      const MAX_WAIT = 8000;
      const POLL_MS  = 200;
      const deadline = Date.now() + MAX_WAIT;
      while (Date.now() < deadline) {
        await new Promise(r => setTimeout(r, POLL_MS));
        if (_authToken && _authToken !== failedToken) {
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers["Authorization"] = `Bearer ${_authToken}`;
          return axios(originalRequest);
        }
      }
    }
    return Promise.reject(error);
  }
);

/* ─── Componentes estables (definidos fuera de App para evitar remounts) ─── */

function ThemeSyncer() {
  const { resolvedTheme } = useTheme();
  useEffect(() => {
    const isDark = resolvedTheme !== "light";
    document.body.classList.toggle("light-mode", !isDark);
    document.body.classList.toggle("dark-mode", isDark);
  }, [resolvedTheme]);
  return null;
}

const PageFallback = () => (
  <div className="loading-screen"><p>Cargando...</p></div>
);

function PrivateRoute({ children, isAuthenticated, perfilListo, usuarioId, onPerfilComplete }) {
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!perfilListo) return (
    <SetupPerfil usuarioId={usuarioId} onComplete={onPerfilComplete} />
  );
  return children;
}

const AnimatedRoutes = memo(function AnimatedRoutes({ usuarioId, refreshCloset, isAuthenticated, perfilListo, onPerfilComplete }) {
  const location = useLocation();
  const isFixed = location.pathname === "/" || location.pathname === "/closet";

  useEffect(() => {
    document.body.classList.toggle("page-overflow-hidden", isFixed);
    return () => document.body.classList.remove("page-overflow-hidden");
  }, [isFixed]);

  const guard = (children) => (
    <PrivateRoute
      isAuthenticated={isAuthenticated}
      perfilListo={perfilListo}
      usuarioId={usuarioId}
      onPerfilComplete={onPerfilComplete}
    >
      {children}
    </PrivateRoute>
  );

  return (
    <div
      key={location.pathname}
      className="page-enter"
      style={{ [isFixed ? "height" : "minHeight"]: "100%", display: "flex", flexDirection: "column" }}
    >
      <Routes location={location}>
        <Route path="/"                  element={guard(<Asistente  usuarioId={usuarioId} />)} />
        <Route path="/feed"              element={guard(<Feed       usuarioId={usuarioId} />)} />
        <Route path="/closet"            element={guard(<Closet     refresh={refreshCloset} usuarioId={usuarioId} />)} />
        <Route path="/calendario"        element={guard(<Calendario usuarioId={usuarioId} />)} />
        <Route path="/perfil"            element={guard(<Perfil     usuarioId={usuarioId} />)} />
        <Route path="/perfil/:username"  element={guard(<Perfil     usuarioId={usuarioId} />)} />
        <Route path="/amigos"            element={guard(<Amigos     usuarioId={usuarioId} />)} />
        <Route path="*"                  element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
});

/* ─── App principal ─── */

export default function App() {
  // Inicializar desde localStorage síncrono para evitar el flash de login en reload.
  // onAuthStateChange reemplazará estos valores con la sesión refrescada cuando llegue.
  const [session,        setSession]        = useState(_cachedSession);
  const [loadingSession, setLoadingSession] = useState(!_cachedSession);
  const [refreshCloset,  setRefreshCloset]  = useState(0);
  const [perfilListo,    setPerfilListo]    = useState(true);
  // usuarioId arranca null aunque haya caché — se confirma cuando onAuthStateChange
  // dispara INITIAL_SESSION o TOKEN_REFRESHED con sesión válida.
  // Esto evita que los componentes hagan llamadas API con token potencialmente expirado
  // antes de que Supabase haya refrescado la sesión.
  const [usuarioId,      setUsuarioId]      = useState(null);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let cleanup = () => {};

    async function initNative() {
      const [
        { StatusBar, Style },
        { App: CapApp },
        { LocalNotifications },
        { SplashScreen },
        { Keyboard },
      ] = await Promise.all([
        import("@capacitor/status-bar"),
        import("@capacitor/app"),
        import("@capacitor/local-notifications"),
        import("@capacitor/splash-screen"),
        import("@capacitor/keyboard"),
      ]);

      StatusBar.setOverlaysWebView({ overlay: true });
      StatusBar.setStyle({ style: Style.Dark });
      SplashScreen.hide({ fadeOutDuration: 300 });
      Keyboard.setAccessoryBarVisible({ isVisible: false });
      Keyboard.setScroll({ isDisabled: false });

      const listenerHandle = CapApp.addListener("appStateChange", ({ isActive }) => {
        if (isActive) StatusBar.setStyle({ style: Style.Dark });
      });

      // iOS: fijar la altura del teclado como variable CSS para que el layout
      // se ajuste manualmente (resize:'none' en capacitor.config evita que el
      // WebView se encoja, previniendo que el navbar "suba" con el teclado)
      let kbShowHandle = null;
      let kbHideHandle = null;
      if (Capacitor.getPlatform() === 'ios') {
        document.documentElement.classList.add('ios-native');
        kbShowHandle = Keyboard.addListener('keyboardWillShow', ({ keyboardHeight }) => {
          document.documentElement.style.setProperty('--keyboard-height', `${keyboardHeight}px`);
        });
        kbHideHandle = Keyboard.addListener('keyboardWillHide', () => {
          document.documentElement.style.setProperty('--keyboard-height', '0px');
        });
      }

      async function setupNotifications() {
        const perm = await LocalNotifications.requestPermissions();
        if (perm.display !== "granted") return;
        const pending = await LocalNotifications.getPending();
        if (pending.notifications.some(n => n.id === 1001)) return;
        const next8am = new Date();
        next8am.setHours(8, 0, 0, 0);
        if (next8am <= new Date()) next8am.setDate(next8am.getDate() + 1);
        await LocalNotifications.schedule({
          notifications: [{
            id: 1001,
            title: "✦ Closet IA",
            body: "¿Ya elegiste tu outfit para hoy? 👕",
            schedule: { at: next8am, repeats: true, allowWhileIdle: true },
            sound: undefined,
            smallIcon: "ic_stat_icon_config_sample",
          }],
        });
      }
      setupNotifications();
      cleanup = () => {
        listenerHandle.then(h => h.remove());
        kbShowHandle?.then(h => h.remove());
        kbHideHandle?.then(h => h.remove());
      };
    }

    initNative();
    return () => cleanup();
  }, []);

  useEffect(() => {
    // Si ya teníamos sesión cacheada, la pantalla de carga ya está oculta.
    // initialDone arranca en true para que el primer INITIAL_SESSION no llame a
    // setLoadingSession(false) de nuevo (no rompe nada, pero es innecesario).
    let initialDone = !!_cachedSession;

    // Fallback por si onAuthStateChange no dispara en 3s (sin caché + red lenta)
    const safetyTimer = !initialDone ? setTimeout(() => {
      if (!initialDone) { initialDone = true; setLoadingSession(false); }
    }, 3000) : null;

    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      // INITIAL_SESSION puede llegar con session=null cuando el access_token está
      // expirado y Supabase aún está esperando el refresh de red. Conservamos la
      // sesión cacheada para no hacer flash a /login, y seteamos usuarioId desde el
      // caché para que los componentes puedan hacer sus llamadas API (el interceptor
      // reintentará si reciben 401 hasta que llegue TOKEN_REFRESHED).
      if (event === 'INITIAL_SESSION' && !newSession && _cachedSession) {
        const cachedUid = _cachedSession.user?.id;
        if (cachedUid) {
          setUsuarioId(cachedUid);
          localStorage.setItem("usuarioId", cachedUid);
        }
        if (!initialDone) {
          initialDone = true;
          if (safetyTimer) clearTimeout(safetyTimer);
          setLoadingSession(false);
        }
        return;
      }

      const token = newSession?.access_token || null;
      _authToken = token;
      setAuthToken(token);
      setSession(newSession);

      if (newSession?.user) {
        const uid = newSession.user.id;
        setUsuarioId(uid);
        localStorage.setItem("usuarioId", uid);
        verificarPerfil(uid);
      } else {
        setUsuarioId(null);
        setPerfilListo(true);
      }

      if (!initialDone) {
        initialDone = true;
        if (safetyTimer) clearTimeout(safetyTimer);
        setLoadingSession(false);
      }
    });

    return () => {
      if (safetyTimer) clearTimeout(safetyTimer);
      listener.subscription.unsubscribe();
    };
  }, []);

  async function verificarPerfil(_uid) {
    try {
      const res = await axios.get(`${API_URL}/api/perfil/me`, { timeout: 6000 });
      setPerfilListo(res.data?.setup_completo === true);
    } catch {
      setPerfilListo(true);
    }
  }

  const handlePerfilComplete = useCallback(() => setPerfilListo(true), []);
  const handleUploaded = useCallback(() => setRefreshCloset((prev) => prev + 1), []);
  const isAuthenticated = !!session;

  if (loadingSession) {
    return <div className="loading-screen"><p>Cargando aplicación...</p></div>;
  }

  return (
    <UploadProvider>
      <Router>
        <ThemeSyncer />
        <div className="app-container">
          {isAuthenticated && perfilListo && (
            <Navbar
              onUploaded={handleUploaded}
              usuarioId={usuarioId}
              session={session}
            />
          )}

          <React.Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/waitlist" element={!isAuthenticated ? <Waitlist />  : <Navigate to="/" />} />
              <Route path="/login"    element={!isAuthenticated ? <Login />     : <Navigate to="/" />} />
              <Route path="/register" element={!isAuthenticated ? <Register />  : <Navigate to="/" />} />

              <Route path="*" element={
                <main className="main-content">
                  <AnimatedRoutes
                    usuarioId={usuarioId}
                    refreshCloset={refreshCloset}
                    isAuthenticated={isAuthenticated}
                    perfilListo={perfilListo}
                    onPerfilComplete={handlePerfilComplete}
                  />
                </main>
              } />
            </Routes>
          </React.Suspense>

          <UploadToast />
        </div>
      </Router>
    </UploadProvider>
  );
}
