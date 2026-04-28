import React, { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import axios from "axios";

import Navbar from "./components/Navbar";
import Asistente from "./pages/Asistente";
import Closet from "./pages/Closet";
import Calendario from "./pages/Calendario";
import Perfil from "./pages/Perfil";
import Amigos from "./pages/Amigos";
import SetupPerfil from "./pages/SetupPerfil";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Feed from "./pages/Feed";


import { supabase } from "./supabase";
import { API_URL } from "./config";
import "./App.css";

// Interceptor global: adjunta el JWT de Supabase a cada request de axios
axios.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (token) config.headers["Authorization"] = `Bearer ${token}`;
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
      </div>
    </Router>
  );
}