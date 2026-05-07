import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import "./Perfil.css";
import { API_URL } from "../config";

export default function Perfil({ usuarioId }) {
  const { username } = useParams();
  const navigate     = useNavigate();
  const esPropio     = !username;

  const [perfil,          setPerfil]          = useState(null);
  const [items,           setItems]           = useState([]);
  const [tabActiva,       setTabActiva]       = useState("outfit");
  const [estadoAmistad,   setEstadoAmistad]   = useState({ status: "none" });
  const [loading,         setLoading]         = useState(true);
  const [editando,        setEditando]        = useState(false);
  const [form,            setForm]            = useState({ username: "", nombre: "", bio: "" });
  const [errorEdit,       setErrorEdit]       = useState("");
  const [modalItem,       setModalItem]       = useState(null);
  const [stats,           setStats]           = useState({ posts: 0, amigos: 0, prendas: 0 });
  const fileRef = useRef();

  useEffect(() => {
    if (!usuarioId && !username) return;
    cargarPerfil();
  }, [username, usuarioId]);

  useEffect(() => {
    if (perfil) {
      const esAmigoActual = estadoAmistad?.status === "accepted";
      cargarItems(perfil.id, tabActiva, esAmigoActual);
    }
  }, [tabActiva]);

  async function cargarPerfil() {
    setLoading(true);
    try {
      let perfilData;
      if (esPropio) {
        const res = await axios.get(`${API_URL}/api/perfil/me`, {
          params: { usuario_id: usuarioId }
        });
        perfilData = res.data;
      } else {
        const res = await axios.get(`${API_URL}/api/perfil/${username}`);
        perfilData = res.data;
        const estadoRes = await axios.get(`${API_URL}/api/amistad/estado`, {
          params: { usuario_id: usuarioId, otro_id: perfilData.id }
        });
        const estadoData = estadoRes.data || { status: "none" };
        setEstadoAmistad(estadoData);
        const esAmigoActual = estadoData.status === "accepted";
        setPerfil(perfilData);
        setForm({ username: perfilData.username || "", nombre: perfilData.nombre || "", bio: perfilData.bio || "" });
        await Promise.all([cargarStats(perfilData.id), cargarItems(perfilData.id, "outfit", esAmigoActual)]);
        setLoading(false);
        return;
      }
      setPerfil(perfilData);
      setForm({ username: perfilData.username || "", nombre: perfilData.nombre || "", bio: perfilData.bio || "" });
      await Promise.all([cargarStats(perfilData.id), cargarItems(perfilData.id, "outfit", true)]);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function cargarStats(pid) {
    try {
      const [postsRes, amigosRes, prendasRes] = await Promise.allSettled([
        axios.get(`${API_URL}/api/posts/${pid}`,   { params: { viewer_id: usuarioId } }),
        axios.get(`${API_URL}/api/amistad/amigos`, { params: { usuario_id: pid } }),
        axios.get(`${API_URL}/api/prendas`,        { params: { usuario_id: pid, tipo: "prenda" } }),
      ]);
      setStats({
        posts:   postsRes.status   === "fulfilled" ? postsRes.value.data?.length   || 0 : 0,
        amigos:  amigosRes.status  === "fulfilled" ? amigosRes.value.data?.length  || 0 : 0,
        prendas: prendasRes.status === "fulfilled" ? prendasRes.value.data?.length || 0 : 0,
      });
    } catch (err) { console.error(err); }
  }

  async function cargarItems(pid, tab, esAmigoActual = false) {
    try {
      if (tab === "guardados") {
        const res = await axios.get(`${API_URL}/api/wishlist`, { params: { usuario_id: usuarioId } });
        setItems(res.data || []);
        return;
      }
      if (!esPropio && !esAmigoActual) { setItems([]); return; }
      const url    = esPropio ? `${API_URL}/api/prendas` : `${API_URL}/api/prendas/amigo/${pid}`;
      const params = esPropio ? { usuario_id: pid, tipo: tab } : { usuario_id: usuarioId, tipo: tab };
      const res    = await axios.get(url, { params });
      setItems(res.data || []);
    } catch { setItems([]); }
  }

  async function handleGuardarPerfil(e) {
    e.preventDefault();
    setErrorEdit("");
    try {
      const res = await axios.put(`${API_URL}/api/perfil`, { usuario_id: usuarioId, username: form.username, nombre: form.nombre, bio: form.bio });
      setPerfil(res.data);
      setEditando(false);
    } catch (err) { setErrorEdit(err.response?.data?.error || "Error al guardar"); }
  }

  async function handleAvatar(e) {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("avatar", file);
    fd.append("usuario_id", usuarioId);
    try {
      const res = await axios.post(`${API_URL}/api/perfil/avatar`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      setPerfil(prev => ({ ...prev, avatar_url: res.data.avatar_url }));
    } catch (err) { console.error(err); }
  }

  async function handleSolicitud() {
    try {
      await axios.post(`${API_URL}/api/amistad/solicitar`, { requester_id: usuarioId, addressee_id: perfil.id });
      setEstadoAmistad({ status: "pending", requester_id: usuarioId });
    } catch (err) { console.error(err); }
  }

  async function handleEliminarAmistad() {
    if (!window.confirm("¿Dejar de seguir?")) return;
    try {
      await axios.delete(`${API_URL}/api/amistad/${estadoAmistad.id}`);
      setEstadoAmistad({ status: "none" });
      setItems([]);
    } catch (err) { console.error(err); }
  }

  if (loading) return (
    <div className="perfil-loading">
      <div className="perfil-loading-dot" /><div className="perfil-loading-dot" /><div className="perfil-loading-dot" />
    </div>
  );

  if (!perfil) return (
    <div className="perfil-not-found">
      <p>Usuario no encontrado</p>
      <button onClick={() => navigate(-1)} className="perfil-btn-action">← Volver</button>
    </div>
  );

  const esAmigo            = estadoAmistad?.status === "accepted";
  const solicitudPendiente = estadoAmistad?.status === "pending";
  const soyRequester       = estadoAmistad?.requester_id === usuarioId;
  const puedeVerCloset     = esPropio || esAmigo;

  const tabs = [
    { id: "outfit",   label: "Outfits"  },
    { id: "prenda",   label: "Prendas"  },
    ...(esPropio ? [{ id: "guardados", label: "Guardados" }] : []),
  ];

  return (
    <div className="perfil-container">
      <div className="perfil-window">

        {/* HUD macOS */}
        <div className="perfil-hud">
          <div className="perfil-mac-dots">
            <span className="perfil-mac-dot red"    />
            <span className="perfil-mac-dot yellow" />
            <span className="perfil-mac-dot green"  />
          </div>
          <div className="perfil-hud-identity">
            <p className="perfil-hud-nombre">{perfil.nombre || perfil.username}</p>
            <p className="perfil-hud-handle">@{perfil.username}</p>
          </div>
          <div className="perfil-hud-spacer" />
        </div>

        {/* Avatar + stats */}
        <div className="perfil-body">
          <div className="perfil-top">
            <div className="perfil-avatar-wrap">
              <div className="perfil-avatar" onClick={esPropio ? () => fileRef.current.click() : undefined} style={{ cursor: esPropio ? "pointer" : "default" }}>
                {perfil.avatar_url
                  ? <img src={perfil.avatar_url} alt={perfil.username} />
                  : <span className="perfil-avatar-placeholder">{(perfil.nombre || perfil.username || "?")[0].toUpperCase()}</span>
                }
                {esPropio && <div className="perfil-avatar-overlay">📷</div>}
              </div>
              {esPropio && <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatar} />}
            </div>
            <div className="perfil-stats-row">
              <div className="perfil-stat"><strong>{stats.posts}</strong><span>posts</span></div>
              <div className="perfil-stat"><strong>{stats.amigos}</strong><span>amigos</span></div>
              <div className="perfil-stat"><strong>{stats.prendas}</strong><span>prendas</span></div>
            </div>
          </div>
          {editando ? (
            <form onSubmit={handleGuardarPerfil} className="perfil-edit-form">
              <div className="perfil-edit-field">
                <span className="perfil-at">@</span>
                <input value={form.username} onChange={e => setForm({ ...form, username: e.target.value.toLowerCase() })} placeholder="username" className="perfil-edit-input" style={{ paddingLeft: "28px" }} />
              </div>
              <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Nombre" className="perfil-edit-input" />
              <textarea value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} placeholder="Bio..." className="perfil-edit-textarea" rows={2} />
              {errorEdit && <p className="perfil-edit-error">{errorEdit}</p>}
              <div className="perfil-edit-actions">
                <button type="submit" className="perfil-btn-action perfil-btn-primary">Guardar</button>
                <button type="button" className="perfil-btn-action" onClick={() => setEditando(false)}>Cancelar</button>
              </div>
            </form>
          ) : (
            <>
              <p className="perfil-nombre">{perfil.nombre || perfil.username}</p>
              {perfil.bio && <p className="perfil-bio">{perfil.bio}</p>}
              <div className="perfil-acciones">
                {esPropio ? (
                  <>
                    <button className="perfil-btn-action" onClick={() => setEditando(true)}>Editar perfil</button>
                    <button className="perfil-btn-action">Compartir</button>
                  </>
                ) : (
                  <>
                    {estadoAmistad.status === "none" && <button className="perfil-btn-action perfil-btn-primary" onClick={handleSolicitud}>Seguir</button>}
                    {solicitudPendiente && soyRequester && <button className="perfil-btn-action" disabled>Solicitud enviada</button>}
                    {solicitudPendiente && !soyRequester && <button className="perfil-btn-action perfil-btn-primary" onClick={() => navigate("/amigos")}>Responder solicitud</button>}
                    {esAmigo && <button className="perfil-btn-action perfil-btn-danger" onClick={handleEliminarAmistad}>Dejar de seguir</button>}
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {/* Contenido */}
        {puedeVerCloset ? (
          <>
            <div className="perfil-tabs">
              {tabs.map(t => (
                <button key={t.id} className={`perfil-tab ${tabActiva === t.id ? "activa" : ""}`} onClick={() => setTabActiva(t.id)}>
                  {t.label}
                </button>
              ))}
            </div>
            {items.length === 0 ? (
              <div className="perfil-empty">
                <p>{esPropio ? "Aún no tienes nada aquí. ¡Sube algo!" : "Sin contenido todavía."}</p>
              </div>
            ) : (
              <div className="perfil-grid">
                {items.map(p => (
                  <div key={p.id} className="perfil-card" onClick={() => setModalItem(p)}>
                    <img src={p.imagen_url || p.post?.imagen_url} alt={p.descripcion} loading="lazy" decoding="async" />
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="perfil-privado">
            <p className="perfil-privado-lock">🔒</p>
            <p className="perfil-privado-title">Closet privado</p>
            <p className="perfil-privado-sub">Envía una solicitud para ver el closet de @{perfil.username}</p>
            {estadoAmistad.status === "none" && <button className="perfil-btn-action perfil-btn-primary" onClick={handleSolicitud}>Seguir</button>}
            {solicitudPendiente && <p className="perfil-pendiente">⏳ Solicitud pendiente</p>}
          </div>
        )}
      </div>

      {/* Modal */}
      {modalItem && (
        <div className="perfil-modal-overlay" onClick={() => setModalItem(null)}>
          <div className="perfil-modal" onClick={e => e.stopPropagation()}>
            <button className="perfil-modal-close" onClick={() => setModalItem(null)}>✕</button>
            <img src={modalItem.imagen_url} alt={modalItem.descripcion} />
            <p className="perfil-modal-desc">{modalItem.descripcion}</p>
          </div>
        </div>
      )}
    </div>
  );
}
