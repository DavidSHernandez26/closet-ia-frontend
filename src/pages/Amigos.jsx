import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./Amigos.css";
import { API_URL } from "../config";

export default function Amigos({ usuarioId }) {
  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);
  const [amigos, setAmigos] = useState([]);
  const [tab, setTab] = useState("amigos");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    cargarSolicitudes();
    cargarAmigos();
  }, [usuarioId]);

  useEffect(() => {
    if (busqueda.trim().length >= 2) buscarUsuarios();
    else setResultados([]);
  }, [busqueda]);

  async function cargarSolicitudes() {
    try {
      const res = await axios.get(`${API_URL}/api/amistad/solicitudes`, {
        params: { usuario_id: usuarioId }
      });
      setSolicitudes(res.data || []);
    } catch (err) { console.error(err); }
  }

  async function cargarAmigos() {
    try {
      const res = await axios.get(`${API_URL}/api/amistad/amigos`, {
        params: { usuario_id: usuarioId }
      });
      setAmigos(res.data || []);
    } catch (err) { console.error(err); }
  }

  async function buscarUsuarios() {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/usuarios/buscar`, {
        params: { q: busqueda, usuario_id: usuarioId }
      });
      setResultados(res.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function responderSolicitud(friendship_id, status) {
    try {
      await axios.put(`${API_URL}/api/amistad/responder`, {
        friendship_id, status, usuario_id: usuarioId,
      });
      await cargarSolicitudes();
      await cargarAmigos();
    } catch (err) { console.error(err); }
  }

  async function eliminarAmigo(friendship_id) {
    if (!window.confirm("¿Eliminar esta amistad?")) return;
    try {
      await axios.delete(`${API_URL}/api/amistad/${friendship_id}`);
      setAmigos((prev) => prev.filter((a) => a.friendship_id !== friendship_id));
    } catch (err) { console.error(err); }
  }

  function Avatar({ user, size = "md" }) {
    return (
      <div className={`amigos-avatar-${size}`}>
        {user.avatar_url
          ? <img src={user.avatar_url} alt={user.username} />
          : <span>{(user.nombre || user.username || "?")[0].toUpperCase()}</span>
        }
      </div>
    );
  }

  return (
    <div className="amigos-container">
      <header className="amigos-header">
        <h1>Comunidad</h1>
        <p>Encuentra y conecta con otros usuarios</p>
      </header>

      <div className="amigos-search-wrap">
        <div className="amigos-search">
          <span className="amigos-search-icon">🔍</span>
          <input
            type="text"
            placeholder="Buscar por @username..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="amigos-search-input"
          />
          {busqueda && (
            <button className="amigos-search-clear" onClick={() => setBusqueda("")}>✕</button>
          )}
        </div>

        {busqueda.length >= 2 && (
          <div className="amigos-resultados">
            {loading ? (
              <p className="amigos-loading-text">Buscando...</p>
            ) : resultados.length === 0 ? (
              <p className="amigos-no-results">No se encontraron usuarios con "@{busqueda}"</p>
            ) : (
              resultados.map((u) => (
                <div
                  key={u.id}
                  className="amigos-resultado-item"
                  onClick={() => { navigate(`/perfil/${u.username}`); setBusqueda(""); }}
                >
                  <Avatar user={u} size="sm" />
                  <div>
                    <p className="amigos-result-nombre">{u.nombre || u.username}</p>
                    <p className="amigos-result-username">@{u.username}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div className="amigos-tabs">
        <button className={`amigos-tab ${tab === "amigos" ? "activa" : ""}`} onClick={() => setTab("amigos")}>
          👫 Amigos
          {amigos.length > 0 && <span className="amigos-badge">{amigos.length}</span>}
        </button>
        <button className={`amigos-tab ${tab === "solicitudes" ? "activa" : ""}`} onClick={() => setTab("solicitudes")}>
          📩 Solicitudes
          {solicitudes.length > 0 && <span className="amigos-badge">{solicitudes.length}</span>}
        </button>
      </div>

      {tab === "amigos" && (
        <div className="amigos-lista">
          {amigos.length === 0 ? (
            <div className="amigos-empty">
              <span className="amigos-empty-icon">👥</span>
              <p className="amigos-empty-title">Aún no tienes amigos</p>
              <p className="amigos-empty-sub">Busca usuarios por su @username para conectar con ellos</p>
            </div>
          ) : (
            amigos.map((a) => (
              <div key={a.friendship_id} className="amigos-item">
                <div className="amigos-item-left" onClick={() => navigate(`/perfil/${a.username}`)}>
                  <Avatar user={a} />
                  <div className="amigos-item-info">
                    <p className="amigos-item-nombre">{a.nombre || a.username}</p>
                    <p className="amigos-item-username">@{a.username}</p>
                  </div>
                </div>
                <div className="amigos-item-actions">
                  <button className="amigos-btn-ver" onClick={() => navigate(`/perfil/${a.username}`)}>
                    Ver closet
                  </button>
                  <button className="amigos-btn-eliminar" onClick={() => eliminarAmigo(a.friendship_id)} title="Eliminar">
                    ✕
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "solicitudes" && (
        <div className="amigos-lista">
          {solicitudes.length === 0 ? (
            <div className="amigos-empty">
              <span className="amigos-empty-icon">📩</span>
              <p className="amigos-empty-title">Sin solicitudes pendientes</p>
              <p className="amigos-empty-sub">Cuando alguien te envíe una solicitud aparecerá aquí</p>
            </div>
          ) : (
            solicitudes.map((s) => (
              <div key={s.id} className="amigos-item">
                <div className="amigos-item-left" onClick={() => navigate(`/perfil/${s.requester.username}`)}>
                  <Avatar user={s.requester} />
                  <div className="amigos-item-info">
                    <p className="amigos-item-nombre">{s.requester.nombre || s.requester.username}</p>
                    <p className="amigos-item-username">@{s.requester.username}</p>
                  </div>
                </div>
                <div className="amigos-item-actions">
                  <button className="amigos-btn-aceptar" onClick={() => responderSolicitud(s.id, "accepted")}>
                    ✓ Aceptar
                  </button>
                  <button className="amigos-btn-rechazar" onClick={() => responderSolicitud(s.id, "rejected")} title="Rechazar">
                    ✕
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}