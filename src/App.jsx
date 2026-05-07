import React, { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import axios from "axios";
import { supabase } from "./supabase";
import { API_URL } from "./config";
import "./App.css";
import "./styles/animations.css";
import { Capacitor } from "@capacitor/core";
import Navbar from "./components/Navbar";

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

// Token cacheado — se actualiza sincrónicamente desde onAuthStateChange
let _authToken = null;

axios.interceptors.request.use((config) => {
  if (_authToken) config.headers["Authorization"] = `Bearer ${_authToken}`;
  return config;
});

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

function PrivateRoute({ children, session, perfilListo, usuarioId, onPerfilComplete }) {
  if (!session) return <Navigate to="/waitlist" replace />;
  if (!perfilListo) return (
    <SetupPerfil usuarioId={usuarioId} onComplete={onPerfilComplete} />
  );
  return children;
}

function AnimatedRoutes({ usuarioId, refreshCloset, session, perfilListo, onPerfilComplete }) {
  const location = useLocation();
  const isFixed = location.pathname === "/" || location.pathname === "/closet";

  useEffect(() => {
    document.body.classList.toggle("page-overflow-hidden", isFixed);
    return () => document.body.classList.remove("page-overflow-hidden");
  }, [isFixed]);

  const guard = (children) => (
    <PrivateRoute
      session={session}
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
        <Route path="/closet"            element={guard(<Closet     refresh={refreshCloset} />)} />
        <Route path="/calendario"        element={guard(<Calendario usuarioId={usuarioId} />)} />
        <Route path="/perfil"            element={guard(<Perfil     usuarioId={usuarioId} />)} />
        <Route path="/perfil/:username"  element={guard(<Perfil     usuarioId={usuarioId} />)} />
        <Route path="/amigos"            element={guard(<Amigos     usuarioId={usuarioId} />)} />
        <Route path="*"                  element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
}

/* ─── App principal ─── */

export default function App() {
  const [session,        setSession]        = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [refreshCloset,  setRefreshCloset]  = useState(0);
  const [perfilListo,    setPerfilListo]    = useState(true);
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
      cleanup = () => { listenerHandle.then(h => h.remove()); };
    }

    initNative();
    return () => cleanup();
  }, []);

  useEffect(() => {
    async function getSession() {
      const { data } = await supabase.auth.getSession();
      _authToken = data?.session?.access_token || null;
      setSession(data?.session || null);
      if (data?.session?.user) {
        const uid = data.session.user.id;
        setUsuarioId(uid);
        localStorage.setItem("usuarioId", uid);
        await verificarPerfil(uid);
      }
      setLoadingSession(false);
    }

    getSession();

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      _authToken = session?.access_token || null;
      setSession(session);
      if (session?.user) {
        const uid = session.user.id;
        setUsuarioId(uid);
        localStorage.setItem("usuarioId", uid);
        await verificarPerfil(uid);
      } else {
        setUsuarioId(null);
        setPerfilListo(true);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function verificarPerfil(uid) {
    try {
      const res = await axios.get(`${API_URL}/api/perfil/me`, { params: { usuario_id: uid } });
      setPerfilListo(res.data?.setup_completo === true);
    } catch {
      setPerfilListo(true);
    }
  }

  if (loadingSession) {
    return <div className="loading-screen"><p>Cargando aplicación...</p></div>;
  }

  return (
    <Router>
      <ThemeSyncer />
      <div className="app-container">
        {session && perfilListo && (
          <Navbar
            onUploaded={() => setRefreshCloset((prev) => prev + 1)}
            usuarioId={usuarioId}
          />
        )}

        <React.Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/waitlist" element={!session ? <Waitlist />  : <Navigate to="/" />} />
            <Route path="/login"    element={!session ? <Login />     : <Navigate to="/" />} />
            <Route path="/register" element={!session ? <Register />  : <Navigate to="/" />} />

            <Route path="*" element={
              <main className="main-content">
                <AnimatedRoutes
                  usuarioId={usuarioId}
                  refreshCloset={refreshCloset}
                  session={session}
                  perfilListo={perfilListo}
                  onPerfilComplete={() => setPerfilListo(true)}
                />
              </main>
            } />
          </Routes>
        </React.Suspense>
      </div>
    </Router>
  );
}
