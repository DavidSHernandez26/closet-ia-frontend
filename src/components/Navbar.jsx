import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./Navbar.css";
import UploadModal from "./UploadModal";
import { supabase } from "../supabase";
import NotifPanel from "./NotifPanel";
import { haptics } from "../hooks/useHaptics";

export default function Navbar({ onUploaded, darkMode, onToggleTheme, usuarioId }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [user, setUser] = useState(null);

  // Dock magnification refs (mobile)
  const dockRef = useRef(null);
  const dockItemRefs = useRef({});

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

  // Dock magnification (mobile)
  const applyDockScale = useCallback((clientX) => {
    Object.values(dockItemRefs.current).forEach((item) => {
      if (!item) return;
      const rect = item.getBoundingClientRect();
      const center = rect.left + rect.width / 2;
      const distance = Math.abs(clientX - center);
      const maxDistance = 110;
      let scale = 1;
      if (distance < maxDistance) {
        const t = 1 - distance / maxDistance;
        const eased = (1 - Math.cos(t * Math.PI)) / 2;
        scale = 1 + eased * 0.4;
      }
      const lift = -(scale - 1) * 16;
      item.style.transform = `translateY(${lift}px) scale(${scale})`;
    });
  }, []);

  const resetDock = useCallback(() => {
    Object.values(dockItemRefs.current).forEach((item) => {
      if (item) item.style.transform = "";
    });
  }, []);

  const bounceItem = useCallback((el) => {
    if (!el) return;
    const icon = el.querySelector(".navbar-mobile-icon");
    if (!icon) return;
    icon.classList.remove("dock-bounce");
    void icon.offsetWidth; // fuerza reflow para reiniciar animación
    icon.classList.add("dock-bounce");
    icon.addEventListener("animationend", () => icon.classList.remove("dock-bounce"), { once: true });
  }, []);

  return (
    <>
      {/* ── DESKTOP: Floating Capsule ── */}
      <nav className="navbar">
        <div className="navbar-capsule">
          <div className="navbar-brand" onClick={() => navigate("/")}>
            <img src="/icon-192.png" alt="Be: Confident" className="navbar-logo-icon" />
            <span className="navbar-title-text">Be: Confident</span>
          </div>

          <div className="navbar-links">
            {navLinks.map((l) => (
              <Link
                key={l.path}
                to={l.path}
                className={`navbar-link ${isActive(l.path) ? "active" : ""}`}
              >
                <span className="navbar-link-icon" aria-hidden="true">{l.icon}</span>
                <span className="navbar-link-label">{l.label}</span>
              </Link>
            ))}
          </div>

          <div className="navbar-actions">
            <button
              className="navbar-icon-btn"
              onClick={onToggleTheme}
              title={darkMode ? "Modo claro" : "Modo oscuro"}
            >
              {darkMode ? "☀️" : "🌙"}
            </button>

            {user && usuarioId && <NotifPanel usuarioId={usuarioId} />}

            {user ? (
              <>
                <button className="navbar-upload-btn" onClick={handleUploadClick}>
                  <span>📸</span>
                  <span className="navbar-upload-label">Subir</span>
                </button>
                <button className="navbar-icon-btn navbar-logout" onClick={handleLogout} title="Cerrar sesión">🔒</button>
              </>
            ) : (
              <button className="navbar-upload-btn" onClick={() => navigate("/login")}>
                <span>🔐</span>
                <span className="navbar-upload-label">Login</span>
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* ── MOBILE: Floating bottom dock ── */}
      <div className="navbar-mobile">
        <div
          className="navbar-mobile-inner"
          ref={dockRef}
          onMouseMove={(e) => applyDockScale(e.clientX)}
          onMouseLeave={resetDock}
          onTouchMove={(e) => { if (e.touches[0]) applyDockScale(e.touches[0].clientX); }}
          onTouchEnd={resetDock}
        >
          {navLinks.map((l) => (
            <Link
              key={l.path}
              ref={(el) => { dockItemRefs.current[l.path] = el; }}
              to={l.path}
              className={`navbar-mobile-item ${isActive(l.path) ? "active" : ""}`}
              onClick={() => haptics.light()}
              onTouchStart={(e) => bounceItem(e.currentTarget)}
              onTouchEnd={resetDock}
            >
              <span className="navbar-mobile-icon">{l.icon}</span>
              <span className="navbar-mobile-label">{l.label}</span>
              {isActive(l.path) && <span className="navbar-mobile-dot" />}
            </Link>
          ))}
          <button
            ref={(el) => { dockItemRefs.current["__upload"] = el; }}
            className="navbar-mobile-item navbar-mobile-upload"
            onClick={() => { haptics.medium(); handleUploadClick(); }}
            onTouchStart={(e) => bounceItem(e.currentTarget)}
            onTouchEnd={resetDock}
          >
            <span className="navbar-mobile-icon">📸</span>
            <span className="navbar-mobile-label">Subir</span>
          </button>
        </div>
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
