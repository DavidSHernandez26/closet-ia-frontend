import React, { useState, useEffect } from "react";
import { Users, Mail, Sparkles, Search, UserPlus, Check } from "lucide-react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./Perfil.css";   // ← cambia Amigos.css por Perfil.css (archivo unificado)
import { API_URL } from "../config";
import { getAuthHeaders } from "../supabase";

export default function Amigos({ usuarioId }) {
  const [busqueda,           setBusqueda]           = useState("");
  const [resultados,         setResultados]         = useState([]);
  const [solicitudes,        setSolicitudes]        = useState([]);
  const [amigos,             setAmigos]             = useState([]);
  const [sugeridos,          setSugeridos]          = useState([]);
  const [solicitudesEnviadas,setSolicitudesEnviadas]= useState(new Set());
  const [tab,                setTab]                = useState("amigos");
  const [loading,            setLoading]            = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    cargarSolicitudes();
    cargarAmigos();
    cargarSugeridos();
  }, [usuarioId]);

  useEffect(() => {
    if (busqueda.trim().length >= 2) buscarUsuarios();
    else setResultados([]);
  }, [busqueda]);

  async function cargarSolicitudes() {
    try {
      const headers = getAuthHeaders();
      const res = await axios.get(`${API_URL}/api/amistad/solicitudes`, { headers });
      setSolicitudes(res.data || []);
    } catch (err) { console.error(err); }
  }

  async function cargarAmigos() {
    try {
      const headers = getAuthHeaders();
      const res = await axios.get(`${API_URL}/api/amistad/amigos`, { headers });
      setAmigos(res.data || []);
    } catch (err) { console.error(err); }
  }

  async function cargarSugeridos() {
    try {
      const res = await axios.get(`${API_URL}/api/usuarios/sugeridos`, { params: { usuario_id: usuarioId } });
      setSugeridos(res.data || []);
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
      const headers = getAuthHeaders();
      await axios.put(`${API_URL}/api/amistad/responder`, { friendship_id, status }, { headers });
      await cargarSolicitudes();
      await cargarAmigos();
    } catch (err) { console.error(err); }
  }

  async function eliminarAmigo(friendship_id) {
    if (!window.confirm("¿Eliminar esta amistad?")) return;
    try {
      const headers = getAuthHeaders();
      await axios.delete(`${API_URL}/api/amistad/${friendship_id}`, { headers });
      setAmigos(prev => prev.filter(a => a.friendship_id !== friendship_id));
    } catch (err) { console.error(err); }
  }

  async function enviarSolicitud(usuario) {
    try {
      const headers = getAuthHeaders();
      await axios.post(`${API_URL}/api/amistad/solicitar`, { addressee_id: usuario.id }, { headers });
      setSolicitudesEnviadas(prev => new Set([...prev, usuario.id]));
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

  const tabs = [
    { id: "amigos",      label: "Amigos",      Icon: Users,    badge: amigos.length      },
    { id: "solicitudes", label: "Solicitudes",  Icon: Mail,     badge: solicitudes.length },
    { id: "sugeridos",   label: "Sugeridos",    Icon: Sparkles, badge: 0                  },
  ];

  return (
    <div className="amigos-container">
      <header className="amigos-header">
        <h1>Comunidad</h1>
        <p>Encuentra y conecta con otros usuarios</p>
      </header>

      {/* ── Buscador ── */}
      <div className="amigos-search-wrap">
        <div className="amigos-search">
          <Search size={15} className="amigos-search-icon" />
          <input
            type="text"
            placeholder="Buscar por @username..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
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
              resultados.map(u => (
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

      {/* ── Tabs ── */}
      <div className="amigos-tabs">
        {tabs.map(t => (
          <button
            key={t.id}
            className={`amigos-tab ${tab === t.id ? "activa" : ""}`}
            onClick={() => setTab(t.id)}
          >
            <t.Icon size={14} />
            <span>{t.label}</span>
            {t.badge > 0 && <span className="amigos-badge">{t.badge}</span>}
          </button>
        ))}
      </div>

      {/* ── Amigos ── */}
      {tab === "amigos" && (
        <div className="amigos-lista">
          {amigos.length === 0 ? (
            <div className="amigos-empty">
              <Users size={36} className="amigos-empty-icon" />
              <p className="amigos-empty-title">Aún no tienes amigos</p>
              <p className="amigos-empty-sub">Busca usuarios o explora la pestaña Sugeridos</p>
            </div>
          ) : (
            amigos.map(a => (
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

      {/* ── Solicitudes ── */}
      {tab === "solicitudes" && (
        <div className="amigos-lista">
          {solicitudes.length === 0 ? (
            <div className="amigos-empty">
              <Mail size={36} className="amigos-empty-icon" />
              <p className="amigos-empty-title">Sin solicitudes pendientes</p>
              <p className="amigos-empty-sub">Cuando alguien te envíe una solicitud aparecerá aquí</p>
            </div>
          ) : (
            solicitudes.map(s => (
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
                    <Check size={13} /> Aceptar
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

      {/* ── Sugeridos ── */}
      {tab === "sugeridos" && (
        <div className="amigos-lista">
          {sugeridos.length === 0 ? (
            <div className="amigos-empty">
              <Sparkles size={36} className="amigos-empty-icon" />
              <p className="amigos-empty-title">Sin sugerencias por ahora</p>
              <p className="amigos-empty-sub">A medida que más usuarios se unan aparecerán aquí</p>
            </div>
          ) : (
            sugeridos.map(s => {
              const enviada = solicitudesEnviadas.has(s.id);
              return (
                <div key={s.id} className="amigos-item">
                  <div className="amigos-item-left" onClick={() => navigate(`/perfil/${s.username}`)}>
                    <Avatar user={s} />
                    <div className="amigos-item-info">
                      <p className="amigos-item-nombre">{s.nombre || s.username}</p>
                      <p className="amigos-item-username">@{s.username}</p>
                    </div>
                  </div>
                  <div className="amigos-item-actions">
                    <button
                      className={`amigos-btn-ver ${enviada ? "amigos-btn-enviado" : ""}`}
                      onClick={() => !enviada && enviarSolicitud(s)}
                      disabled={enviada}
                    >
                      {enviada ? "Enviado" : <><UserPlus size={13} /> Seguir</>}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}