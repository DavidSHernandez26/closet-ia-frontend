import React, { useEffect, useState } from "react";
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
const Feed        = React.lazy(() => import("./pages/Feed"));

// Token cacheado — se actualiza sincrónicamente desde onAuthStateChange
let _authToken = null;

// Interceptor síncrono: nunca puede colgar la app
axios.interceptors.request.use((config) => {
  if (_authToken) config.headers["Authorization"] = `Bearer ${_authToken}`;
  return config;
});

export default function App() {
  const [session, setSession] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);

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
        const yaExiste = pending.notifications.some(n => n.id === 1001);
        if (yaExiste) return;

        const next8am = new Date();
        next8am.setHours(8, 0, 0, 0);
        if (next8am <= new Date()) {
          next8am.setDate(next8am.getDate() + 1);
        }

        await LocalNotifications.schedule({
          notifications: [{
            id: 1001,
            title: "✦ Closet IA",
            body: "¿Ya elegiste tu outfit para hoy? 👕",
            schedule: {
              at: next8am,
              repeats: true,
              allowWhileIdle: true,
            },
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
  const [refreshCloset, setRefreshCloset] = useState(0);
  const [darkMode, setDarkMode] = useState(localStorage.getItem("theme") !== "light");
  const [perfilListo, setPerfilListo] = useState(true);
  const [usuarioId, setUsuarioId] = useState(null);

  useEffect(() => {
    document.body.classList.toggle("light-mode", !darkMode);
    document.body.classList.toggle("dark-mode", darkMode);
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);

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
      const res = await axios.get(`${API_URL}/api/perfil/me`, {
        params: { usuario_id: uid }
      });
      setPerfilListo(res.data?.setup_completo === true);
    } catch {
      setPerfilListo(true);
    }
  }

  if (loadingSession) {
    return (
      <div className="loading-screen">
        <p>Cargando aplicación...</p>
      </div>
    );
  }

  function PrivateRoute({ children }) {
    if (!session) return <Navigate to="/login" replace />;
    if (!perfilListo) return (
      <SetupPerfil
        usuarioId={usuarioId}
        onComplete={() => setPerfilListo(true)}
      />
    );
    return children;
  }

  const PageFallback = () => (
    <div className="loading-screen"><p>Cargando...</p></div>
  );

  function AnimatedRoutes({ usuarioId, refreshCloset, PrivateRoute }) {
    const location = useLocation();
    return (
      <div key={location.pathname} className="page-enter" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
        <Routes location={location}>
          <Route path="/" element={<PrivateRoute><Asistente usuarioId={usuarioId} /></PrivateRoute>} />
          <Route path="/feed" element={<PrivateRoute><Feed usuarioId={usuarioId} /></PrivateRoute>} />
          <Route path="/closet" element={<PrivateRoute><Closet refresh={refreshCloset} /></PrivateRoute>} />
          <Route path="/calendario" element={<PrivateRoute><Calendario usuarioId={usuarioId} /></PrivateRoute>} />
          <Route path="/perfil" element={<PrivateRoute><Perfil usuarioId={usuarioId} /></PrivateRoute>} />
          <Route path="/perfil/:username" element={<PrivateRoute><Perfil usuarioId={usuarioId} /></PrivateRoute>} />
          <Route path="/amigos" element={<PrivateRoute><Amigos usuarioId={usuarioId} /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    );
  }

  return (
    <Router>
      <div className="app-container">
        {session && perfilListo && (
          <Navbar
            onUploaded={() => setRefreshCloset((prev) => prev + 1)}
            darkMode={darkMode}
            onToggleTheme={() => setDarkMode((prev) => !prev)}
            usuarioId={usuarioId}
          />
        )}

        <React.Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/login" element={!session ? <Login /> : <Navigate to="/" />} />
            <Route path="/register" element={!session ? <Register /> : <Navigate to="/" />} />

            <Route path="*" element={
              <main className="main-content">
                <AnimatedRoutes
                  usuarioId={usuarioId}
                  refreshCloset={refreshCloset}
                  PrivateRoute={PrivateRoute}
                />
              </main>
            } />
          </Routes>
        </React.Suspense>
      </div>
    </Router>
  );
}