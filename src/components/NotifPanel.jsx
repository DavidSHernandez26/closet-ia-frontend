import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { API_URL } from "../config";
import { getAuthHeaders } from "../supabase";
import "./NotifPanel.css";

export default function NotifPanel({ usuarioId, topOffset = 12, onClose }) {
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const panelRef = useRef(null);

  const cargar = useCallback(async () => {
    if (!usuarioId) return;
    try {
      const headers = getAuthHeaders();
      const [listRes] = await Promise.all([
        axios.get(`${API_URL}/api/notificaciones`, { headers }),
        axios.put(`${API_URL}/api/notificaciones/leer`, {}, { headers }),
      ]);
      setNotifs(listRes.data || []);
    } catch {}
    setLoading(false);
  }, [usuarioId]);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        onClose?.();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_URL}/api/notificaciones/${id}`, { headers: getAuthHeaders() });
      setNotifs(prev => prev.filter(n => n.id !== id));
    } catch {}
  };

  const handleClearAll = async () => {
    try {
      await axios.delete(`${API_URL}/api/notificaciones`, { headers: getAuthHeaders() });
      setNotifs([]);
    } catch {}
  };

  function tiempoRelativo(iso) {
    const diff = Date.now() - new Date(iso).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1)  return "ahora";
    if (min < 60) return `${min}m`;
    const h = Math.floor(min / 60);
    if (h < 24)   return `${h}h`;
    return `${Math.floor(h / 24)}d`;
  }

  return (
    <div ref={panelRef} className="notif-panel" style={{ top: topOffset }}>
      <div className="notif-panel-header">
        <span className="notif-panel-title">Notificaciones</span>
        {notifs.length > 0 && (
          <button className="notif-clear-all" onClick={handleClearAll}>
            Limpiar todo
          </button>
        )}
      </div>

      <div className="notif-panel-body">
        {loading ? (
          <div className="notif-empty">
            <span className="notif-empty-dots">
              <span /><span /><span />
            </span>
          </div>
        ) : notifs.length === 0 ? (
          <div className="notif-empty">
            <span className="notif-empty-icon">🔔</span>
            <p>Sin notificaciones nuevas</p>
          </div>
        ) : (
          notifs.map(n => (
            <div key={n.id} className={`notif-item ${n.leida ? "leida" : "nueva"}`}>
              <div className="notif-item-body">
                {!n.leida && <span className="notif-dot" />}
                <p className="notif-mensaje">{n.mensaje}</p>
              </div>
              <div className="notif-item-meta">
                <span className="notif-tiempo">{tiempoRelativo(n.created_at)}</span>
                <button className="notif-delete" onClick={() => handleDelete(n.id)}>✕</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
