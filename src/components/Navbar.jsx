import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./Navbar.css";
import UploadModal from "./UploadModal";
import { supabase } from "../supabase";
import NotifPanel from "./NotifPanel";

export default function Navbar({ onUploaded, darkMode, onToggleTheme, usuarioId }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data?.session?.user || null);
    });
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });
    return () => authListener.subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    navigate("/");
  };

  const handleUploadClick = () => {
    if (!user) { navigate("/login"); return; }
    setShowModal(true);
  };

  const isActive = (path) => location.pathname === path;

  const navLinks = [
    { path: "/",           label: "Asistente",  icon: "✦" },
    { path: "/feed",       label: "Feed",        icon: "🏠" },
    { path: "/closet",     label: "Closet",      icon: "👔" },
    { path: "/calendario", label: "Calendario",  icon: "📅" },
    { path: "/amigos",     label: "Comunidad",   icon: "👥" },
    { path: "/perfil",     label: "Perfil",      icon: "👤" },
  ];

  return (
    <>
      {/* ── TOP BAR desktop ── */}
      <nav className="navbar">
        <div className="navbar-left">
          <h1
            className="navbar-title"
            onClick={() => navigate("/")}
            style={{ cursor: "pointer" }}
          >
            Closet IA
          </h1>
        </div>

        <div className="navbar-center">
          {navLinks.map((l) => (
            <Link
              key={l.path}
              className={isActive(l.path) ? "active" : ""}
              to={l.path}
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="navbar-right">
  <button className="theme-toggle-btn" onClick={onToggleTheme}>
    {darkMode ? "☀️" : "🌙"}
  </button>

  {user && usuarioId && (
    <NotifPanel usuarioId={usuarioId} />
  )}

  {user ? (
    <>
      <button className="upload-btn" onClick={handleUploadClick}>📸 Subir</button>
      <button className="logout-btn" onClick={handleLogout}>🔒</button>
    </>
  ) : (
    <button className="login-btn" onClick={() => navigate("/login")}>🔐 Login</button>
  )}
</div>
      </nav>

      {/* ── BOTTOM BAR móvil ── */}
      <div className="navbar-mobile">
        {navLinks.map((l) => (
          <Link
            key={l.path}
            to={l.path}
            className={`navbar-mobile-item ${isActive(l.path) ? "active" : ""}`}
          >
            <span className="navbar-mobile-icon">{l.icon}</span>
            <span className="navbar-mobile-label">{l.label}</span>
          </Link>
        ))}
        <button
          className={`navbar-mobile-item navbar-mobile-upload`}
          onClick={handleUploadClick}
        >
          <span className="navbar-mobile-icon">📸</span>
          <span className="navbar-mobile-label">Subir</span>
        </button>
      </div>

      {showModal && (
        <UploadModal
          onClose={() => setShowModal(false)}
          onUploaded={() => {
            if (onUploaded) onUploaded();
            setShowModal(false);
          }}
        />
      )}
    </>
  );
}