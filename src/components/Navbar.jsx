import React, { useState, useRef, useCallback, useEffect } from "react";
import axios from "axios";
import { API_URL } from "../config";
import { getAuthHeaders } from "../supabase";
import { motion, useAnimation } from "framer-motion";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./Navbar.css";
import UploadModal from "./UploadModal";
import { supabase } from "../supabase";
import NotifPanel from "./NotifPanel";
import { haptics } from "../hooks/useHaptics";
import { ThemeToggleButton } from "./ui/skiper-ui/skiper26";
import {
  Sparkles, LayoutGrid, Shirt, Calendar, Users, User,
  Camera, Bell, Pin, LogOut,
} from "lucide-react";

/* DockIcon — bounce "gota de agua" para mobile */
function DockIcon({ children }) {
  const controls = useAnimation();
  const bounce = () => {
    controls
      .start({ scale: 1.38, y: -11, transition: { duration: 0.08, ease: "easeOut" } })
      .then(() =>
        controls.start({
          scale: 1, y: 0,
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

export default function Navbar({ onUploaded, usuarioId, session }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [showModal,   setShowModal]   = useState(false);
  const [expanded,    setExpanded]    = useState(false);
  const [pinned,      setPinned]      = useState(false);
  const [showNotif,   setShowNotif]   = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const user = session?.user || null;

  useEffect(() => {
    if (!usuarioId) return;
    const fetchCount = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/notificaciones/count`, { headers: getAuthHeaders() });
        setUnreadCount(res.data.count || 0);
      } catch {}
    };
    fetchCount();
    const id = setInterval(fetchCount, 30000);
    return () => clearInterval(id);
  }, [usuarioId]);

  const sbRef = useRef(null);
  const sbItemRefs = useRef({});
  const dockRef = useRef(null);
  const dockItemRefs = useRef({});

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleUploadClick = () => {
    if (!user) { navigate("/login"); return; }
    setShowModal(true);
  };

  const isActive = (path) => location.pathname === path;

  const navLinks = [
    { path: "/",           label: "Asistente",  icon: <Sparkles   size={17} strokeWidth={1.7} /> },
    { path: "/feed",       label: "Feed",        icon: <LayoutGrid size={17} strokeWidth={1.7} /> },
    { path: "/closet",     label: "Closet",      icon: <Shirt      size={17} strokeWidth={1.7} /> },
    { path: "/calendario", label: "Calendario",  icon: <Calendar   size={17} strokeWidth={1.7} /> },
    { path: "/amigos",     label: "Comunidad",   icon: <Users      size={17} strokeWidth={1.7} /> },
    { path: "/perfil",     label: "Perfil",      icon: <User       size={17} strokeWidth={1.7} /> },
  ];

  /* ── Magnificación sidebar (eje Y) ── */
  const applySidebarMag = useCallback((clientY) => {
    Object.values(sbItemRefs.current).forEach((item) => {
      if (!item) return;
      const icon = item.querySelector(".sb-icon-wrap");
      if (!icon) return;
      const rect = icon.getBoundingClientRect();
      const center = rect.top + rect.height / 2;
      const distance = Math.abs(clientY - center);
      const maxDistance = 90;
      let scale = 1, liftX = 0;
      if (distance < maxDistance) {
        const t = 1 - distance / maxDistance;
        const eased = (1 - Math.cos(t * Math.PI)) / 2;
        scale = 1 + eased * 0.35;
        liftX = eased * 4;
      }
      icon.style.transform = `translateX(${liftX}px) scale(${scale})`;
    });
  }, []);

  const resetSidebarMag = useCallback(() => {
    Object.values(sbItemRefs.current).forEach((item) => {
      if (!item) return;
      const icon = item.querySelector(".sb-icon-wrap");
      if (icon) icon.style.transform = "";
    });
  }, []);

  /* ── Magnificación dock móvil (eje X) ── */
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

  const isOpen = expanded || pinned;

  return (
    <>
      {/* ── DESKTOP: Sidebar hover-expand ── */}
      <aside
        className={`navbar-sidebar ${isOpen ? "expanded" : ""}`}
        ref={sbRef}
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => { setExpanded(false); resetSidebarMag(); }}
        onMouseMove={(e) => applySidebarMag(e.clientY)}
      >
        <div className="sb-brand" onClick={() => navigate("/")}>
          <img src="/icon-192.png" alt="Be: Confident" className="sb-brand-logo" />
          <div className="sb-brand-text">
            <div className="sb-brand-name">Be: Confident</div>
            <div className="sb-brand-sub">v1.0 · closet IA</div>
          </div>
        </div>

        <nav className="sb-nav">
          <div className="sb-section">
            <div className="sb-section-label">Principal</div>
            {navLinks.slice(0, 3).map((l) => (
              <Link
                key={l.path}
                ref={(el) => { sbItemRefs.current[l.path] = el; }}
                to={l.path}
                className={`sb-item ${isActive(l.path) ? "active" : ""}`}
              >
                <span className="sb-icon-wrap">{l.icon}</span>
                <span className="sb-item-label">{l.label}</span>
                <span className="sb-item-tip">{l.label}</span>
              </Link>
            ))}
          </div>

          <div className="sb-section">
            <div className="sb-section-label">Social</div>
            {navLinks.slice(3, 5).map((l) => (
              <Link
                key={l.path}
                ref={(el) => { sbItemRefs.current[l.path] = el; }}
                to={l.path}
                className={`sb-item ${isActive(l.path) ? "active" : ""}`}
              >
                <span className="sb-icon-wrap">{l.icon}</span>
                <span className="sb-item-label">{l.label}</span>
                <span className="sb-item-tip">{l.label}</span>
              </Link>
            ))}
          </div>

          <div className="sb-section">
            <div className="sb-section-label">Cuenta</div>
            {navLinks.slice(5).map((l) => (
              <Link
                key={l.path}
                ref={(el) => { sbItemRefs.current[l.path] = el; }}
                to={l.path}
                className={`sb-item ${isActive(l.path) ? "active" : ""}`}
              >
                <span className="sb-icon-wrap">{l.icon}</span>
                <span className="sb-item-label">{l.label}</span>
                <span className="sb-item-tip">{l.label}</span>
              </Link>
            ))}
            {user && usuarioId && (
              <button
                ref={(el) => { sbItemRefs.current["__notif"] = el; }}
                className={`sb-item sb-item-notif ${showNotif ? "active" : ""}`}
                onClick={() => setShowNotif(v => !v)}
              >
                <span className="sb-icon-wrap" style={{ position: "relative" }}>
                  <Bell size={17} strokeWidth={1.7} />
                  {unreadCount > 0 && (
                    <span className="sb-notif-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>
                  )}
                </span>
                <span className="sb-item-label">Notificaciones</span>
                <span className="sb-item-tip">Notificaciones</span>
              </button>
            )}
          </div>
        </nav>

        <div className="sb-footer">
          {user ? (
            <button className="sb-upload" onClick={handleUploadClick}>
              <span className="sb-upload-icon"><Camera size={17} strokeWidth={1.8} /></span>
              <span className="sb-upload-label">Subir al closet</span>
              <span className="sb-item-tip">Subir al closet</span>
            </button>
          ) : (
            <button className="sb-upload" onClick={() => navigate("/login")}>
              <span className="sb-upload-icon">🔐</span>
              <span className="sb-upload-label">Iniciar sesión</span>
              <span className="sb-item-tip">Iniciar sesión</span>
            </button>
          )}

          <div className="sb-tools">
            <div className="sb-tool-theme">
              <ThemeToggleButton variant="circle" start="bottom-right" />
            </div>
            <button
              className={`sb-tool ${pinned ? "active" : ""}`}
              onClick={() => setPinned(!pinned)}
              title={pinned ? "Soltar" : "Anclar abierto"}
            >
              <Pin size={15} strokeWidth={1.8} />
            </button>
            {user && (
              <button className="sb-tool" onClick={handleLogout} title="Cerrar sesión">
                <LogOut size={15} strokeWidth={1.8} />
              </button>
            )}
          </div>
        </div>
      </aside>

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
            <DockIcon><Camera size={18} strokeWidth={1.8} /></DockIcon>
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

      {showNotif && usuarioId && (
        <NotifPanel
          usuarioId={usuarioId}
          onClose={() => { setShowNotif(false); setUnreadCount(0); }}
        />
      )}
    </>
  );
}
