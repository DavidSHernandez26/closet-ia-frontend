import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./Feed.css";
import { API_URL } from "../config";

/* ─────────────────────────────────────
   Chips de navegación principal
   "guardados" activa la vista de wishlist
───────────────────────────────────── */
const FILTROS = [
  { id: "todos",      label: "Todos",      icon: "✦" },
  { id: "amigos",     label: "Amigos",     icon: "👥" },
  { id: "tendencias", label: "Tendencias", icon: "🔥" },
  { id: "guardados",  label: "Guardados",  icon: "🌟" },
];

/* ─────────────────────────────────────
   Avatar — fuera del componente Feed
   para evitar remounts en cada render
───────────────────────────────────── */
function Avatar({ profile, size = 36 }) {
  return (
    <div
      className="feed-avatar"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {profile?.avatar_url ? (
        <img src={profile.avatar_url} alt={profile.username} />
      ) : (
        <span>
          {(profile?.nombre || profile?.username || "?")[0].toUpperCase()}
        </span>
      )}
    </div>
  );
}

/* ─────────────────────────────────────
   Feed — componente principal
───────────────────────────────────── */
export default function Feed({ usuarioId }) {
  const [posts,          setPosts]          = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [filtro,         setFiltro]         = useState("todos");
  const [wishlist,       setWishlist]       = useState([]);
  const [loadingWishlist,setLoadingWishlist]= useState(false);
  const [sugeridos,      setSugeridos]      = useState([]);

  /* Modal */
  const [showPostModal,    setShowPostModal]    = useState(false);
  const [postActivo,       setPostActivo]       = useState(null);
  const [comentarios,      setComentarios]      = useState([]);
  const [nuevoComentario,  setNuevoComentario]  = useState("");
  const [loadingComment,   setLoadingComment]   = useState(false);

  /* Nuevo post */
  const [newPost,   setNewPost]   = useState({ file: null, preview: "", descripcion: "" });
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  const navigate = useNavigate();

  /* ── Carga inicial ── */
  useEffect(() => {
    cargarFeed();
    cargarSugeridos();
  }, [usuarioId]);

  /* ── Wishlist solo cuando se activa el chip ── */
  useEffect(() => {
    if (filtro === "guardados") cargarWishlist();
  }, [filtro]);

  /* ──────────────────────────────────
     API — Feed
  ────────────────────────────────── */
  async function cargarFeed() {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/feed`, {
        params: { usuario_id: usuarioId },
      });
      setPosts(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  /* ──────────────────────────────────
     API — Wishlist
  ────────────────────────────────── */
  async function cargarWishlist() {
    setLoadingWishlist(true);
    try {
      const res = await axios.get(`${API_URL}/api/wishlist`, {
        params: { usuario_id: usuarioId },
      });
      setWishlist(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingWishlist(false);
    }
  }

  /* ──────────────────────────────────
     API — Sugeridos para sidebar
     Usa /api/usuarios/buscar como proxy.
     Si añades /api/usuarios/sugeridos en
     el backend, reemplaza esta llamada.
  ────────────────────────────────── */
async function cargarSugeridos() {
  try {
    const res = await axios.get(`${API_URL}/api/usuarios/sugeridos`, {
      params: { usuario_id: usuarioId },
    });
    setSugeridos(res.data || []);
  } catch (err) {
    console.error(err);
  }
}
  /* ──────────────────────────────────
     Filtrado local de posts
  ────────────────────────────────── */
  const postsFiltrados = posts.filter((p) => {
    if (filtro === "todos")      return true;
    if (filtro === "amigos")     return p.usuario_id !== usuarioId;
    if (filtro === "tendencias") return p.likes_count >= 5;
    return true;
  });

  /* Posts más populares para el sidebar */
  const topPosts = [...posts]
    .sort((a, b) => b.likes_count - a.likes_count)
    .slice(0, 2);

  /* ──────────────────────────────────
     Handlers
  ────────────────────────────────── */
  async function handleLike(post) {
    try {
      const res = await axios.post(`${API_URL}/api/likes`, {
        post_id: post.id,
        usuario_id: usuarioId,
      });
      const update = (p) =>
        p.id === post.id
          ? {
              ...p,
              liked_by_me: res.data.liked,
              likes_count: res.data.liked
                ? p.likes_count + 1
                : p.likes_count - 1,
            }
          : p;
      setPosts((prev) => prev.map(update));
      if (postActivo?.id === post.id) setPostActivo((p) => update(p));
    } catch (err) {
      console.error(err);
    }
  }

  async function handleWishlist(post) {
    try {
      const res = await axios.post(`${API_URL}/api/wishlist`, {
        usuario_id: usuarioId,
        post_id: post.id,
        imagen_url: post.imagen_url,
        descripcion: post.descripcion,
      });
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id ? { ...p, saved_by_me: res.data.saved } : p
        )
      );
      if (postActivo?.id === post.id)
        setPostActivo((p) => ({ ...p, saved_by_me: res.data.saved }));
      if (filtro === "guardados") cargarWishlist();
    } catch (err) {
      console.error(err);
    }
  }

  async function abrirPost(post) {
    setPostActivo(post);
    setShowPostModal(true);
    try {
      const res = await axios.get(`${API_URL}/api/comments/${post.id}`);
      setComentarios(res.data || []);
    } catch (err) {
      console.error(err);
    }
  }

  function cerrarModal() {
    setShowPostModal(false);
    setPostActivo(null);
    setComentarios([]);
    setNuevoComentario("");
  }

  async function enviarComentario(e) {
    e.preventDefault();
    if (!nuevoComentario.trim() || loadingComment) return;
    setLoadingComment(true);
    try {
      const res = await axios.post(`${API_URL}/api/comments`, {
        post_id: postActivo.id,
        usuario_id: usuarioId,
        texto: nuevoComentario,
      });
      setComentarios((prev) => [...prev, res.data]);
      setNuevoComentario("");
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postActivo.id
            ? { ...p, comments_count: p.comments_count + 1 }
            : p
        )
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingComment(false);
    }
  }

  async function eliminarComentario(id) {
    try {
      await axios.delete(`${API_URL}/api/comments/${id}`);
      setComentarios((prev) => prev.filter((c) => c.id !== id));
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postActivo?.id
            ? { ...p, comments_count: Math.max(0, p.comments_count - 1) }
            : p
        )
      );
    } catch (err) {
      console.error(err);
    }
  }

  async function eliminarPost(postId) {
    if (!window.confirm("¿Eliminar este post?")) return;
    try {
      await axios.delete(`${API_URL}/api/posts/${postId}`);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      cerrarModal();
    } catch (err) {
      console.error(err);
    }
  }

  async function subirPost() {
    if (!newPost.file || uploading) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("imagen", newPost.file);
      fd.append("usuario_id", usuarioId);
      fd.append("descripcion", newPost.descripcion);
      await axios.post(`${API_URL}/api/posts`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setNewPost({ file: null, preview: "", descripcion: "" });
      cargarFeed();
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  }

  function formatTime(ts) {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    const hrs  = Math.floor(mins / 60);
    const days = Math.floor(hrs / 24);
    if (mins < 1)  return "ahora";
    if (mins < 60) return `${mins}m`;
    if (hrs < 24)  return `${hrs}h`;
    return `${days}d`;
  }

  /* ──────────────────────────────────
     Render
  ────────────────────────────────── */
  return (
    <div className="feed-container">
      <div className="feed-inner">

        {/* ── HEADER ── */}
        <header className="feed-header">
          <h1>Inspiración</h1>
          <p>Outfits de tu comunidad · encuentra tu estilo</p>
        </header>

        {/* ── CHIPS DE FILTRO ── */}
        <nav className="feed-chips" aria-label="Filtros del feed">
          {FILTROS.map((f) => (
            <button
              key={f.id}
              className={`feed-chip ${filtro === f.id ? "active" : ""}`}
              onClick={() => setFiltro(f.id)}
            >
              <span>{f.icon}</span>
              <span>{f.label}</span>
            </button>
          ))}
        </nav>

        {/* ── NUEVO POST (visible en todos los filtros excepto guardados) ── */}
        {filtro !== "guardados" && (
          <div className="feed-new-post">
            {newPost.preview ? (
              <div className="feed-new-preview">
                <img src={newPost.preview} alt="preview" />
                <div className="feed-new-actions">
                  <input
                    type="text"
                    placeholder="Describe tu outfit..."
                    value={newPost.descripcion}
                    onChange={(e) =>
                      setNewPost((p) => ({ ...p, descripcion: e.target.value }))
                    }
                    className="feed-new-input"
                  />
                  <div className="feed-new-btns">
                    <button
                      className="feed-btn-cancelar"
                      onClick={() =>
                        setNewPost({ file: null, preview: "", descripcion: "" })
                      }
                    >
                      Cancelar
                    </button>
                    <button
                      className="feed-btn-publicar"
                      onClick={subirPost}
                      disabled={uploading}
                    >
                      {uploading ? "Publicando..." : "Publicar ✦"}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                className="feed-new-btn"
                onClick={() => fileRef.current.click()}
              >
                <span className="feed-new-icon">+</span>
                <span>Compartir un outfit</span>
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files[0];
                if (f)
                  setNewPost((p) => ({
                    ...p,
                    file: f,
                    preview: URL.createObjectURL(f),
                  }));
              }}
            />
          </div>
        )}

        {/* ── LISTA DE POSTS / WISHLIST ── */}
        <section className="feed-list" aria-label="Publicaciones">

          {/* Vista Guardados */}
          {filtro === "guardados" ? (
            loadingWishlist ? (
              <div className="feed-loading">
                <div className="feed-dot" />
                <div className="feed-dot" />
                <div className="feed-dot" />
              </div>
            ) : wishlist.length === 0 ? (
              <div className="feed-empty">
                <span className="feed-empty-icon">🌟</span>
                <p className="feed-empty-title">Sin guardados todavía</p>
                <p className="feed-empty-sub">
                  Guarda outfits que te inspiren desde el feed
                </p>
              </div>
            ) : (
              <div className="feed-wishlist-grid">
                {wishlist.map((item) => (
                  <div
                    key={item.id}
                    className="feed-wishlist-item"
                    onClick={() => item.post && abrirPost(item.post)}
                  >
                    <img src={item.imagen_url} alt={item.descripcion} />
                    <div className="feed-wishlist-overlay">
                      <p>
                        {item.post?.profile?.username &&
                          `@${item.post.profile.username}`}
                      </p>
                    </div>
                    <button
                      className="feed-wishlist-remove"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleWishlist({
                          id: item.post_id,
                          imagen_url: item.imagen_url,
                          descripcion: item.descripcion,
                        });
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )

          /* Vista Feed (todos / amigos / tendencias) */
          ) : loading ? (
            <div className="feed-loading">
              <div className="feed-dot" />
              <div className="feed-dot" />
              <div className="feed-dot" />
            </div>
          ) : postsFiltrados.length === 0 ? (
            <div className="feed-empty">
              <div className="feed-empty-icon">✦</div>
              <p className="feed-empty-title">Sin posts en este filtro</p>
              <p className="feed-empty-sub">
                {filtro === "amigos"
                  ? "Agrega amigos para ver sus outfits"
                  : "Aún no hay suficientes publicaciones aquí"}
              </p>
            </div>
          ) : (
            postsFiltrados.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                usuarioId={usuarioId}
                onLike={() => handleLike(post)}
                onGuardar={() => handleWishlist(post)}
                onAbrir={() => abrirPost(post)}
                onEliminar={() => eliminarPost(post.id)}
                onNavigate={navigate}
                formatTime={formatTime}
              />
            ))
          )}
        </section>

        {/* ── SIDEBAR — solo visible en desktop (≥900px) ── */}
        <aside className="feed-sidebar" aria-label="Sugerencias">

          <div className="sidebar-card">
            <h3 className="sidebar-title">Sugeridos para ti</h3>
            {sugeridos.length === 0 ? (
              <p className="feed-no-comments" style={{ padding: "10px 0" }}>
                Explora para encontrar usuarios
              </p>
            ) : (
              sugeridos.map((s) => (
                <div
                  key={s.id}
                  className="sidebar-suggestion"
                  onClick={() => navigate(`/perfil/${s.username}`)}
                >
                  <Avatar profile={s} size={36} />
                  <div className="sidebar-text">
                    <p className="sidebar-name">{s.nombre || s.username}</p>
                    <p className="sidebar-sub">@{s.username}</p>
                  </div>
                  <button
                    className="sidebar-follow"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/perfil/${s.username}`);
                    }}
                  >
                    Ver
                  </button>
                </div>
              ))
            )}
          </div>

          {topPosts.length > 0 && (
            <div className="sidebar-card">
              <h3 className="sidebar-title">Más populares</h3>
              {topPosts.map((post) => (
                <div
                  key={post.id}
                  className="sidebar-suggestion"
                  onClick={() => abrirPost(post)}
                >
                  <div className="sidebar-avatar-thumb">
                    <img
                      src={post.imagen_url}
                      alt={post.descripcion}
                    />
                  </div>
                  <div className="sidebar-text">
                    <p className="sidebar-name">@{post.profile?.username}</p>
                    <p className="sidebar-sub">
                      ❤️ {post.likes_count} · 💬 {post.comments_count}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

        </aside>
      </div>

      {/* ── MODAL DE POST ── */}
      {showPostModal && postActivo && (
        <div className="feed-modal-overlay" onClick={cerrarModal}>
          <div className="feed-modal" onClick={(e) => e.stopPropagation()}>
            <button className="feed-modal-close" onClick={cerrarModal}>
              ✕
            </button>

            {/* Imagen izquierda */}
            <div className="feed-modal-img">
              <img src={postActivo.imagen_url} alt={postActivo.descripcion} />
            </div>

            {/* Panel derecho */}
            <div className="feed-modal-right">

              {/* Header del modal */}
              <div className="feed-modal-header">
                <div
                  className="feed-post-user"
                  onClick={() => {
                    navigate(`/perfil/${postActivo.profile?.username}`);
                    cerrarModal();
                  }}
                >
                  <Avatar profile={postActivo.profile} />
                  <div>
                    <p className="feed-post-nombre">
                      {postActivo.profile?.nombre ||
                        postActivo.profile?.username}
                    </p>
                    <p className="feed-post-tiempo">
                      @{postActivo.profile?.username}
                    </p>
                  </div>
                </div>
                {postActivo.usuario_id === usuarioId && (
                  <button
                    className="feed-post-delete"
                    onClick={() => eliminarPost(postActivo.id)}
                  >
                    🗑
                  </button>
                )}
              </div>

              {/* Descripción */}
              {postActivo.descripcion && (
                <div className="feed-modal-desc">
                  <span className="feed-post-username">
                    @{postActivo.profile?.username}
                  </span>{" "}
                  {postActivo.descripcion}
                </div>
              )}

              {/* Comentarios */}
              <div className="feed-modal-comments">
                {comentarios.length === 0 ? (
                  <p className="feed-no-comments">
                    Sin comentarios aún. ¡Sé el primero!
                  </p>
                ) : (
                  comentarios.map((c) => (
                    <div key={c.id} className="feed-comment">
                      <Avatar profile={c.profile} size={28} />
                      <div className="feed-comment-content">
                        <span className="feed-comment-user">
                          @{c.profile?.username}
                        </span>
                        <span className="feed-comment-text"> {c.texto}</span>
                        <span className="feed-comment-time">
                          {formatTime(c.created_at)}
                        </span>
                      </div>
                      {c.usuario_id === usuarioId && (
                        <button
                          className="feed-comment-delete"
                          onClick={() => eliminarComentario(c.id)}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Acciones del modal — íconos SVG */}
              <div className="feed-modal-actions">
                <button
                  className={`feed-action-btn ${postActivo.liked_by_me ? "liked" : ""}`}
                  onClick={() => handleLike(postActivo)}
                  aria-label="Me gusta"
                  aria-pressed={postActivo.liked_by_me}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill={postActivo.liked_by_me ? "currentColor" : "none"}
                    stroke="currentColor"
                    className="feed-action-svg"
                  >
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                  <span>{postActivo.likes_count}</span>
                </button>

                <button
                  className={`feed-action-btn ${postActivo.saved_by_me ? "saved" : ""}`}
                  onClick={() => handleWishlist(postActivo)}
                  aria-label="Guardar"
                  aria-pressed={postActivo.saved_by_me}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill={postActivo.saved_by_me ? "currentColor" : "none"}
                    stroke="currentColor"
                    className="feed-action-svg"
                  >
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                  </svg>
                  <span>Guardar</span>
                </button>
              </div>

              {/* Input de comentario */}
              <form className="feed-comment-form" onSubmit={enviarComentario}>
                <input
                  type="text"
                  placeholder="Escribe un comentario..."
                  value={nuevoComentario}
                  onChange={(e) => setNuevoComentario(e.target.value)}
                  className="feed-comment-input"
                  disabled={loadingComment}
                />
                <button
                  type="submit"
                  className="feed-comment-submit"
                  disabled={!nuevoComentario.trim() || loadingComment}
                >
                  →
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────
   PostCard — sub-componente
   Usa íconos SVG del sistema de diseño
───────────────────────────────────── */
function PostCard({
  post, usuarioId, onLike, onGuardar, onAbrir, onEliminar, onNavigate, formatTime,
}) {
  return (
    <article className="feed-post">

      {/* Header */}
      <div className="feed-post-header">
        <div
          className="feed-post-user"
          onClick={() => onNavigate(`/perfil/${post.profile?.username}`)}
        >
          <Avatar profile={post.profile} size={40} />
          <div>
            <p className="feed-post-nombre">
              {post.profile?.nombre || post.profile?.username}
            </p>
            <p className="feed-post-tiempo">{formatTime(post.created_at)}</p>
          </div>
        </div>
        {post.usuario_id === usuarioId && (
          <button className="feed-post-delete" onClick={onEliminar}>
            🗑
          </button>
        )}
      </div>

      {/* Imagen — doble click = like */}
      <div
        className="feed-post-img-wrap"
        onClick={onAbrir}
        onDoubleClick={onLike}
        role="button"
        tabIndex={0}
        aria-label="Ver post"
      >
        <img
          src={post.imagen_url}
          alt={post.descripcion}
          className="feed-post-img"
        />
      </div>

      {/* Acciones con SVG */}
      <div className="feed-post-actions">
        <div className="feed-post-actions-left">

          {/* Like */}
          <button
            className={`feed-action-btn ${post.liked_by_me ? "liked" : ""}`}
            onClick={onLike}
            aria-label="Me gusta"
            aria-pressed={post.liked_by_me}
          >
            <svg
              viewBox="0 0 24 24"
              fill={post.liked_by_me ? "currentColor" : "none"}
              stroke="currentColor"
              className="feed-action-svg"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            {post.likes_count > 0 && <span>{post.likes_count}</span>}
          </button>

          {/* Comentar */}
          <button
            className="feed-action-btn"
            onClick={onAbrir}
            aria-label="Comentar"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              className="feed-action-svg"
            >
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
            {post.comments_count > 0 && <span>{post.comments_count}</span>}
          </button>

        </div>

        {/* Guardar */}
        <button
          className={`feed-action-btn ${post.saved_by_me ? "saved" : ""}`}
          onClick={onGuardar}
          aria-label="Guardar"
          aria-pressed={post.saved_by_me}
        >
          <svg
            viewBox="0 0 24 24"
            fill={post.saved_by_me ? "currentColor" : "none"}
            stroke="currentColor"
            className="feed-action-svg"
          >
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      </div>

      {/* Descripción */}
      {post.descripcion && (
        <div className="feed-post-desc">
          <span
            className="feed-post-username"
            onClick={() => onNavigate(`/perfil/${post.profile?.username}`)}
          >
            @{post.profile?.username}
          </span>{" "}
          {post.descripcion}
        </div>
      )}

    </article>
  );
}
