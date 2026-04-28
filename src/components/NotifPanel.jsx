import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../config";
import "./NotifPanel.css";

export default function NotifPanel({ usuarioId }) {
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!usuarioId) return;
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [usuarioId]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function fetchCount() {
    try {
      const res = await axios.get(`${API_URL}/api/notificaciones/count`, {
        params: { usuario_id: usuarioId }
      });
      setCount(res.data.count || 0);
    } catch (err) { console.error(err); }
  }

  async function fetchNotifs() {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/notificaciones`, {
        params: { usuario_id: usuarioId }
      });
      setNotifs(res.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function handleOpen() {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen) {
      await fetchNotifs();
      if (count > 0) marcarLeidas();
    }
  }

  async function marcarLeidas() {
    try {
      await axios.put(`${API_URL}/api/notificaciones/leer`, { usuario_id: usuarioId });
      setCount(0);
      setNotifs((prev) => prev.map((n) => ({ ...n, leida: true })));
    } catch (err) { console.error(err); }
  }

  async function eliminarNotif(id, e) {
    e.stopPropagation();
    try {
      await axios.delete(`${API_URL}/api/notificaciones/${id}`);
      setNotifs((prev) => prev.filter((n) => n.id !== id));
    } catch (err) { console.error(err); }
  }

  async function eliminarTodas() {
    try {
      await axios.delete(`${API_URL}/api/notificaciones`, {
        params: { usuario_id: usuarioId }
      });
      setNotifs([]);
      setCount(0);
    } catch (err) { console.error(err); }
  }

  function handleNotifClick(notif) {
    if (notif.tipo === "solicitud") navigate("/amigos");
    else if (notif.post_id) navigate("/feed");
    else if (notif.from_profile?.username) navigate(`/perfil/${notif.from_profile.username}`);
    setOpen(false);
  }

  function formatTime(ts) {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(mins / 60);
    const days = Math.floor(hrs / 24);
    if (mins < 1) return "ahora";
    if (mins < 60) return `${mins}m`;
    if (hrs < 24) return `${hrs}h`;
    return `${days}d`;
  }

  function getIcon(tipo) {
    return { like: "❤️", comentario: "💬", solicitud: "👋", aceptado: "🎉" }[tipo] || "🔔";
  }

  function Avatar({ profile }) {
    return (
      <div className="notif-avatar">
        {profile?.avatar_url
          ? <img src={profile.avatar_url} alt={profile.username} />
          : <span>{(profile?.nombre || profile?.username || "?")[0].toUpperCase()}</span>
        }
      </div>
    );
  }

  return (
    <div className="notif-wrap" ref={panelRef}>
      <button
        className={`notif-bell ${count > 0 ? "has-notifs" : ""}`}
        onClick={handleOpen}
        title="Notificaciones"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {count > 0 && <span className="notif-badge">{count > 9 ? "9+" : count}</span>}
      </button>

      {open && (
        <div className="notif-panel">
          <div className="notif-panel-header">
            <h3>Notificaciones</h3>
            {notifs.length > 0 && (
              <button className="notif-clear-all" onClick={eliminarTodas}>Limpiar todo</button>
            )}
          </div>

          <div className="notif-list">
            {loading ? (
              <div className="notif-loading">
                <div className="notif-dot"></div>
                <div className="notif-dot"></div>
                <div className="notif-dot"></div>
              </div>
            ) : notifs.length === 0 ? (
              <div className="notif-empty">
                <span>🔔</span>
                <p>Sin notificaciones</p>
              </div>
            ) : (
              notifs.map((n) => (
                <div
                  key={n.id}
                  className={`notif-item ${!n.leida ? "unread" : ""}`}
                  onClick={() => handleNotifClick(n)}
                >
                  <div className="notif-item-left">
                    <div className="notif-avatar-wrap">
                      <Avatar profile={n.from_profile} />
                      <span className="notif-tipo-icon">{getIcon(n.tipo)}</span>
                    </div>
                    <div className="notif-item-content">
                      <p className="notif-mensaje">{n.mensaje}</p>
                      <span className="notif-time">{formatTime(n.created_at)}</span>
                    </div>
                  </div>
                  <button className="notif-delete" onClick={(e) => eliminarNotif(n.id, e)}>✕</button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}