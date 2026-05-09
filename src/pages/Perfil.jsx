import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import "./Perfil.css";
import { API_URL } from "../config";
import { supabase, getAuthHeaders } from "../supabase";

/* Imagen con skeleton mientras carga */
function LazyImg({ src, alt, className }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="perfil-img-wrap">
      {!loaded && <div className="perfil-img-skeleton" />}
      <img
        src={src}
        alt={alt}
        className={className}
        style={{ opacity: loaded ? 1 : 0 }}
        onLoad={() => setLoaded(true)}
        loading="lazy"
        decoding="async"
      />
    </div>
  );
}

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
  const [modalAmigos,     setModalAmigos]     = useState(false);
  const [listaAmigos,     setListaAmigos]     = useState([]);
  const [loadingAmigos,   setLoadingAmigos]   = useState(false);
  const [loggingOut,      setLoggingOut]      = useState(false);
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

  useEffect(() => {
    const onUpdate = () => {
      if (!perfil || !esPropio) return;
      cargarStats(perfil.id);
      cargarItems(perfil.id, tabActiva, true);
    };
    window.addEventListener('prendas-updated', onUpdate);
    return () => window.removeEventListener('prendas-updated', onUpdate);
  }, [perfil, tabActiva, esPropio]);

  async function cargarPerfil() {
    setLoading(true);
    try {
      let perfilData;
      if (esPropio) {
        const res = await axios.get(`${API_URL}/api/perfil/me`);
        perfilData = res.data;
      } else {
        const res = await axios.get(`${API_URL}/api/perfil/${username}`);
        perfilData = res.data;
        const estadoRes = await axios.get(`${API_URL}/api/amistad/estado`, {
          params: { otro_id: perfilData.id }
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
      const headers = getAuthHeaders();
      const [postsRes, amigosRes, prendasRes] = await Promise.allSettled([
        axios.get(`${API_URL}/api/posts/${pid}`,   { params: { viewer_id: usuarioId } }),
        axios.get(`${API_URL}/api/amistad/amigos`, { params: { uid: pid }, headers }),
        axios.get(`${API_URL}/api/prendas`,        { headers }),
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
      const headers = getAuthHeaders();
      if (tab === "guardados") {
        const res = await axios.get(`${API_URL}/api/wishlist`, { headers });
        setItems(res.data || []);
        return;
      }
      if (!esPropio && !esAmigoActual) { setItems([]); return; }
      const url    = esPropio ? `${API_URL}/api/prendas` : `${API_URL}/api/prendas/amigo/${pid}`;
      const params = esPropio ? { tipo: tab } : { tipo: tab };
      const res    = await axios.get(url, { params, headers });
      setItems(res.data || []);
    } catch { setItems([]); }
  }

  async function handleGuardarPerfil(e) {
    e.preventDefault();
    setErrorEdit("");
    try {
      const headers = getAuthHeaders();
      const res = await axios.put(`${API_URL}/api/perfil`, { username: form.username, nombre: form.nombre, bio: form.bio }, { headers });
      setPerfil(res.data);
      setEditando(false);
    } catch (err) { setErrorEdit(err.response?.data?.error || "Error al guardar"); }
  }

  async function handleAvatar(e) {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("avatar", file);
    try {
      const headers = getAuthHeaders();
      const res = await axios.post(`${API_URL}/api/perfil/avatar`, fd, {
        headers: { ...headers, "Content-Type": "multipart/form-data" },
      });
      setPerfil(prev => ({ ...prev, avatar_url: res.data.avatar_url }));
    } catch (err) { console.error(err); }
  }

  async function handleSolicitud() {
    try {
      const headers = getAuthHeaders();
      await axios.post(`${API_URL}/api/amistad/solicitar`, { addressee_id: perfil.id }, { headers });
      setEstadoAmistad({ status: "pending", requester_id: usuarioId });
    } catch (err) { console.error(err); }
  }

  async function abrirModalAmigos(pid) {
    setModalAmigos(true);
    setLoadingAmigos(true);
    try {
      const headers = getAuthHeaders();
      const res = await axios.get(`${API_URL}/api/amistad/amigos`, { params: { uid: pid }, headers });
      setListaAmigos(res.data || []);
    } catch { setListaAmigos([]); }
    finally { setLoadingAmigos(false); }
  }

  async function handleEliminarAmistad() {
    if (!estadoAmistad?.id) return;
    if (!window.confirm("¿Dejar de seguir?")) return;
    try {
      const headers = getAuthHeaders();
      await axios.delete(`${API_URL}/api/amistad/${estadoAmistad.id}`, { headers });
      setEstadoAmistad({ status: "none" });
      setItems([]);
    } catch (err) { console.error(err); }
  }

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await supabase.auth.signOut();
      localStorage.removeItem("usuarioId");
      navigate("/login", { replace: true });
    } catch (err) {
      console.error("Error cerrando sesión:", err);
      setLoggingOut(false);
    }
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
              <div
                className="perfil-stat perfil-stat-clickable"
                onClick={() => abrirModalAmigos(perfil.id)}
              >
                <strong>{stats.amigos}</strong><span>amigos</span>
              </div>
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
                    <button
                      className="perfil-btn-action perfil-btn-danger perfil-btn-logout-mobile"
                      onClick={handleLogout}
                      disabled={loggingOut}
                    >
                      {loggingOut ? "Cerrando..." : "Cerrar sesión"}
                    </button>
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
            <AnimatePresence mode="wait">
              {items.length === 0 ? (
                <motion.div
                  key="empty"
                  className="perfil-empty"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <p>{esPropio ? "Aún no tienes nada aquí. ¡Sube algo!" : "Sin contenido todavía."}</p>
                </motion.div>
              ) : (
                <motion.div
                  key={`grid-${tabActiva}-${items.length}`}
                  className="perfil-grid"
                  initial="hidden"
                  animate="visible"
                  variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.04 } } }}
                >
                  {items.map(p => (
                    <motion.div
                      key={p.id}
                      className="perfil-card"
                      onClick={() => setModalItem(p)}
                      variants={{
                        hidden: { opacity: 0, scale: 0.92, y: 10 },
                        visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 260, damping: 22 } },
                      }}
                    >
                      <LazyImg src={p.imagen_url || p.post?.imagen_url} alt={p.descripcion} className="perfil-card-img" />
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
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

      {/* Modal item */}
      {modalItem && (
        <div className="perfil-modal-overlay" onClick={() => setModalItem(null)}>
          <div className="perfil-modal" onClick={e => e.stopPropagation()}>
            <button className="perfil-modal-close" onClick={() => setModalItem(null)}>✕</button>
            <img src={modalItem.imagen_url} alt={modalItem.descripcion} />
            <p className="perfil-modal-desc">{modalItem.descripcion}</p>
          </div>
        </div>
      )}

      {/* Modal amigos */}
      {modalAmigos && (
        <div className="perfil-modal-overlay" onClick={() => setModalAmigos(false)}>
          <div className="perfil-modal perfil-modal-amigos" onClick={e => e.stopPropagation()}>
            <button className="perfil-modal-close" onClick={() => setModalAmigos(false)}>✕</button>
            <h3 className="perfil-amigos-title">Amigos</h3>
            {loadingAmigos ? (
              <div className="perfil-loading">
                <div className="perfil-loading-dot" /><div className="perfil-loading-dot" /><div className="perfil-loading-dot" />
              </div>
            ) : listaAmigos.length === 0 ? (
              <p className="perfil-amigos-empty">Sin amigos todavía</p>
            ) : (
              <div className="perfil-amigos-list">
                {listaAmigos.map(a => (
                  <div
                    key={a.id}
                    className="perfil-amigo-row"
                    onClick={() => { navigate(`/perfil/${a.username}`); setModalAmigos(false); }}
                  >
                    <div className="perfil-amigo-avatar">
                      {a.avatar_url
                        ? <img src={a.avatar_url} alt={a.username} loading="lazy" />
                        : <span>{(a.nombre || a.username || "?")[0].toUpperCase()}</span>
                      }
                    </div>
                    <div className="perfil-amigo-info">
                      <p className="perfil-amigo-nombre">{a.nombre || a.username}</p>
                      <p className="perfil-amigo-handle">@{a.username}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
