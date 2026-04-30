import React, { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import axios from "axios";
import { supabase } from "./supabase";
import { API_URL } from "./config";
import "./App.css";

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
                <Routes>
                  <Route path="/" element={<PrivateRoute><Asistente usuarioId={usuarioId} /></PrivateRoute>} />
                  <Route path="/feed" element={<PrivateRoute><Feed usuarioId={usuarioId} /></PrivateRoute>} />
                  <Route path="/closet" element={<PrivateRoute><Closet refresh={refreshCloset} /></PrivateRoute>} />
                  <Route path="/calendario" element={<PrivateRoute><Calendario usuarioId={usuarioId} /></PrivateRoute>} />
                  <Route path="/perfil" element={<PrivateRoute><Perfil usuarioId={usuarioId} /></PrivateRoute>} />
                  <Route path="/perfil/:username" element={<PrivateRoute><Perfil usuarioId={usuarioId} /></PrivateRoute>} />
                  <Route path="/amigos" element={<PrivateRoute><Amigos usuarioId={usuarioId} /></PrivateRoute>} />
                  <Route path="*" element={<Navigate to="/" />} />
                </Routes>
              </main>
            } />
          </Routes>
        </React.Suspense>
      </div>
    </Router>
  );
}