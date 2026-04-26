import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import "./Perfil.css";
import { API_URL } from "../config";

export default function Perfil({ usuarioId }) {
  const { username } = useParams();
  const navigate = useNavigate();
  const esPropio = !username;

  const [perfil, setPerfil] = useState(null);
  const [prendas, setPrendas] = useState([]);
  const [tabActiva, setTabActiva] = useState("prenda");
  const [estadoAmistad, setEstadoAmistad] = useState({ status: "none" });
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({ username: "", nombre: "", bio: "" });
  const [errorEdit, setErrorEdit] = useState("");
  const [modalItem, setModalItem] = useState(null);
  const fileRef = useRef();

  useEffect(() => { cargarPerfil(); }, [username, usuarioId]);

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
        setEstadoAmistad(estadoRes.data || { status: "none" });
      }

      setPerfil(perfilData);
      setForm({ username: perfilData.username || "", nombre: perfilData.nombre || "", bio: perfilData.bio || "" });
      await cargarPrendas(perfilData.id, tabActiva, esPropio);
    } catch (err) {
      console.error("Error cargando perfil:", err);
    } finally {
      setLoading(false);
    }
  }

  async function cargarPrendas(pid, tipo, propio) {
    try {
      let res;
      if (propio) {
        res = await axios.get(`${API_URL}/api/prendas`, {
          params: { usuario_id: pid, tipo }
        });
      } else {
        res = await axios.get(`${API_URL}/api/prendas/amigo/${pid}`, {
          params: { usuario_id: usuarioId, tipo }
        });
      }
      setPrendas(res.data || []);
    } catch { setPrendas([]); }
  }

  useEffect(() => {
    if (perfil) cargarPrendas(perfil.id, tabActiva, esPropio);
  }, [tabActiva]);

  async function handleGuardarPerfil(e) {
    e.preventDefault();
    setErrorEdit("");
    try {
      const res = await axios.put(`${API_URL}/api/perfil`, {
        usuario_id: usuarioId,
        username: form.username,
        nombre: form.nombre,
        bio: form.bio,
      });
      setPerfil(res.data);
      setEditando(false);
    } catch (err) {
      setErrorEdit(err.response?.data?.error || "Error al guardar");
    }
  }

  async function handleAvatar(e) {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("avatar", file);
    fd.append("usuario_id", usuarioId);
    try {
      const res = await axios.post(`${API_URL}/api/perfil/avatar`, fd, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setPerfil((prev) => ({ ...prev, avatar_url: res.data.avatar_url }));
    } catch (err) { console.error("Error subiendo avatar:", err); }
  }

  async function handleSolicitud() {
    try {
      await axios.post(`${API_URL}/api/amistad/solicitar`, {
        requester_id: usuarioId,
        addressee_id: perfil.id,
      });
      setEstadoAmistad({ status: "pending", requester_id: usuarioId });
    } catch (err) { console.error(err); }
  }

  async function handleEliminarAmistad() {
    if (!window.confirm("¿Eliminar esta amistad?")) return;
    try {
      await axios.delete(`${API_URL}/api/amistad/${estadoAmistad.id}`);
      setEstadoAmistad({ status: "none" });
      setPrendas([]);
    } catch (err) { console.error(err); }
  }

  if (loading) return (
    <div className="perfil-loading">
      <div className="perfil-loading-dot"></div>
      <div className="perfil-loading-dot"></div>
      <div className="perfil-loading-dot"></div>
    </div>
  );

  if (!perfil) return (
    <div className="perfil-not-found">
      <p>Usuario no encontrado</p>
      <button onClick={() => navigate(-1)} className="perfil-back-btn">← Volver</button>
    </div>
  );

  const esAmigo = estadoAmistad?.status === "accepted";
  const solicitudPendiente = estadoAmistad?.status === "pending";
  const soyRequester = estadoAmistad?.requester_id === usuarioId;
  const puedeVerCloset = esPropio || esAmigo;

  return (
    <div className="perfil-container">
      <div className="perfil-header">
        <div className="perfil-avatar-wrap">
          <div
            className="perfil-avatar"
            onClick={esPropio ? () => fileRef.current.click() : undefined}
            style={{ cursor: esPropio ? "pointer" : "default" }}
          >
            {perfil.avatar_url
              ? <img src={perfil.avatar_url} alt={perfil.username} />
              : <span className="perfil-avatar-placeholder">{(perfil.nombre || perfil.username || "?")[0].toUpperCase()}</span>
            }
            {esPropio && <div className="perfil-avatar-overlay">📷</div>}
          </div>
          {esPropio && (
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatar} />
          )}
        </div>

        <div className="perfil-info">
          {editando ? (
            <form onSubmit={handleGuardarPerfil} className="perfil-edit-form">
              <div className="perfil-edit-field">
                <span className="perfil-at">@</span>
                <input
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase() })}
                  placeholder="username"
                  className="perfil-edit-input"
                  style={{ paddingLeft: "28px" }}
                />
              </div>
              <input
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                placeholder="Nombre"
                className="perfil-edit-input"
              />
              <textarea
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                placeholder="Bio..."
                className="perfil-edit-textarea"
                rows={2}
              />
              {errorEdit && <p className="perfil-edit-error">{errorEdit}</p>}
              <div className="perfil-edit-actions">
                <button type="submit" className="perfil-btn-primary">Guardar</button>
                <button type="button" className="perfil-btn-secondary" onClick={() => setEditando(false)}>Cancelar</button>
              </div>
            </form>
          ) : (
            <>
              <h1 className="perfil-nombre">{perfil.nombre || perfil.username}</h1>
              <p className="perfil-username">@{perfil.username}</p>
              {perfil.bio && <p className="perfil-bio">{perfil.bio}</p>}
              <div className="perfil-acciones">
                {esPropio ? (
                  <button className="perfil-btn-primary" onClick={() => setEditando(true)}>✏️ Editar perfil</button>
                ) : (
                  <>
                    {estadoAmistad.status === "none" && (
                      <button className="perfil-btn-primary" onClick={handleSolicitud}>➕ Seguir</button>
                    )}
                    {solicitudPendiente && soyRequester && (
                      <button className="perfil-btn-secondary" disabled>⏳ Solicitud enviada</button>
                    )}
                    {solicitudPendiente && !soyRequester && (
                      <button className="perfil-btn-primary" onClick={() => navigate("/amigos")}>✅ Responder solicitud</button>
                    )}
                    {esAmigo && (
                      <button className="perfil-btn-danger" onClick={handleEliminarAmistad}>🚫 Dejar de seguir</button>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {puedeVerCloset ? (
        <>
          <div className="perfil-tabs">
            <button className={`perfil-tab ${tabActiva === "prenda" ? "activa" : ""}`} onClick={() => setTabActiva("prenda")}>
              👚 Prendas
            </button>
            <button className={`perfil-tab ${tabActiva === "outfit" ? "activa" : ""}`} onClick={() => setTabActiva("outfit")}>
              🧥 Outfits
            </button>
          </div>

          {prendas.length === 0 ? (
            <p className="perfil-empty">
              {esPropio ? "Aún no tienes prendas. ¡Sube algo!" : "Este usuario no tiene prendas todavía."}
            </p>
          ) : (
            <div className="perfil-grid">
              {prendas.map((p) => (
                <div key={p.id} className="perfil-card" onClick={() => setModalItem(p)}>
                  <img src={p.imagen_url} alt={p.descripcion} />
                  <div className="perfil-card-info">
                    <p>{p.descripcion?.split(" - ")[0]}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="perfil-privado">
          <p>🔒</p>
          <p>Este closet es privado</p>
          <p className="perfil-privado-sub">Envía una solicitud para ver el closet de @{perfil.username}</p>
          {estadoAmistad.status === "none" && (
            <button className="perfil-btn-primary" onClick={handleSolicitud}>➕ Enviar solicitud</button>
          )}
          {solicitudPendiente && <p className="perfil-pendiente">⏳ Solicitud pendiente</p>}
        </div>
      )}

      {modalItem && (
        <div className="perfil-modal-overlay" onClick={() => setModalItem(null)}>
          <div className="perfil-modal" onClick={(e) => e.stopPropagation()}>
            <button className="perfil-modal-close" onClick={() => setModalItem(null)}>✕</button>
            <img src={modalItem.imagen_url} alt={modalItem.descripcion} />
            <p className="perfil-modal-desc">{modalItem.descripcion}</p>
          </div>
        </div>
      )}
    </div>
  );
}