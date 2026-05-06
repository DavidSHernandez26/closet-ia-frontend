import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, useAnimation } from "framer-motion";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./Navbar.css";
import UploadModal from "./UploadModal";
import { supabase } from "../supabase";
import NotifPanel from "./NotifPanel";
import { haptics } from "../hooks/useHaptics";
import { ThemeToggleButton } from "./ui/skiper-ui/skiper26";
import {
  Sparkles, LayoutGrid, Shirt, Calendar, Users, User, Camera,
} from "lucide-react";

// Icono con bounce "gota de agua" — la secuencia siempre termina en estado normal
// useAnimation garantiza que la animación corre hasta el final sin importar si el
// componente padre navega o re-renderiza (a diferencia de whileTap que pierde el
// evento touchend cuando hay navegación en iOS)
function DockIcon({ children }) {
  const controls = useAnimation();

  const bounce = () => {
    controls
      .start({ scale: 1.38, y: -11, transition: { duration: 0.08, ease: "easeOut" } })
      .then(() =>
        controls.start({
          scale: 1,
          y: 0,
          transition: { type: "spring", stiffness: 480, damping: 13 },
        })
      );
  };

  return (
    <motion.span className="navbar-mobile-icon" animate={controls} onTouchStart={bounce}>
      {children}
    </motion.span>
  );
}

export default function Navbar({ onUploaded, usuarioId }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [user, setUser] = useState(null);

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
    { path: "/",           label: "Asistente",  icon: <Sparkles  size={16} /> },
    { path: "/feed",       label: "Feed",        icon: <LayoutGrid size={16} /> },
    { path: "/closet",     label: "Closet",      icon: <Shirt      size={16} /> },
    { path: "/calendario", label: "Calendario",  icon: <Calendar   size={16} /> },
    { path: "/amigos",     label: "Comunidad",   icon: <Users      size={16} /> },
    { path: "/perfil",     label: "Perfil",      icon: <User       size={16} /> },
  ];

  // Magnificación tipo dock macOS al deslizar el dedo
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
            <ThemeToggleButton
              className="navbar-icon-btn"
              variant="circle"
              start="bottom-right"
            />

            {user && usuarioId && <NotifPanel usuarioId={usuarioId} />}

            {user ? (
              <>
                <button className="navbar-upload-btn" onClick={handleUploadClick}>
                  <Camera size={16} />
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
              onTouchEnd={resetDock}
            >
              <DockIcon>{l.icon}</DockIcon>
              <span className="navbar-mobile-label">{l.label}</span>
              {isActive(l.path) && <span className="navbar-mobile-dot" />}
            </Link>
          ))}
          <button
            ref={(el) => { dockItemRefs.current["__upload"] = el; }}
            className="navbar-mobile-item navbar-mobile-upload"
            onClick={() => { haptics.medium(); handleUploadClick(); }}
            onTouchEnd={resetDock}
          >
            <DockIcon><Camera size={18} /></DockIcon>
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
