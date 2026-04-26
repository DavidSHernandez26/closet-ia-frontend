import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./Feed.css";
import { API_URL } from "../config";

export default function Feed({ usuarioId }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("feed");
  const [wishlist, setWishlist] = useState([]);
  const [showPostModal, setShowPostModal] = useState(false);
  const [postActivo, setPostActivo] = useState(null);
  const [comentarios, setComentarios] = useState([]);
  const [nuevoComentario, setNuevoComentario] = useState("");
  const [loadingComment, setLoadingComment] = useState(false);
  const navigate = useNavigate();
  const fileRef = useRef();

  /* Subir post */
  const [newPost, setNewPost] = useState({ file: null, preview: "", descripcion: "" });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (tab === "feed") cargarFeed();
    if (tab === "wishlist") cargarWishlist();
  }, [tab, usuarioId]);

  async function cargarFeed() {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/feed`, { params: { usuario_id: usuarioId } });
      setPosts(res.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function cargarWishlist() {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/wishlist`, { params: { usuario_id: usuarioId } });
      setWishlist(res.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function handleLike(post) {
    try {
      const res = await axios.post(`${API_URL}/api/likes`, {
        post_id: post.id, usuario_id: usuarioId,
      });
      setPosts((prev) => prev.map((p) => p.id === post.id ? {
        ...p,
        liked_by_me: res.data.liked,
        likes_count: res.data.liked ? p.likes_count + 1 : p.likes_count - 1,
      } : p));
    } catch (err) { console.error(err); }
  }

  async function handleWishlist(post) {
    try {
      const res = await axios.post(`${API_URL}/api/wishlist`, {
        usuario_id: usuarioId,
        post_id: post.id,
        imagen_url: post.imagen_url,
        descripcion: post.descripcion,
      });
      setPosts((prev) => prev.map((p) => p.id === post.id ? {
        ...p, saved_by_me: res.data.saved,
      } : p));
      if (tab === "wishlist") cargarWishlist();
    } catch (err) { console.error(err); }
  }

  async function abrirPost(post) {
    setPostActivo(post);
    setShowPostModal(true);
    try {
      const res = await axios.get(`${API_URL}/api/comments/${post.id}`);
      setComentarios(res.data || []);
    } catch (err) { console.error(err); }
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
      setPosts((prev) => prev.map((p) => p.id === postActivo.id ? {
        ...p, comments_count: p.comments_count + 1,
      } : p));
    } catch (err) { console.error(err); }
    finally { setLoadingComment(false); }
  }

  async function eliminarComentario(id) {
    try {
      await axios.delete(`${API_URL}/api/comments/${id}`);
      setComentarios((prev) => prev.filter((c) => c.id !== id));
      setPosts((prev) => prev.map((p) => p.id === postActivo?.id ? {
        ...p, comments_count: Math.max(0, p.comments_count - 1),
      } : p));
    } catch (err) { console.error(err); }
  }

  async function eliminarPost(postId) {
    if (!window.confirm("¿Eliminar este post?")) return;
    try {
      await axios.delete(`${API_URL}/api/posts/${postId}`);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      setShowPostModal(false);
    } catch (err) { console.error(err); }
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
    } catch (err) { console.error(err); }
    finally { setUploading(false); }
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

  function Avatar({ profile, size = 36 }) {
    return (
      <div className="feed-avatar" style={{ width: size, height: size, fontSize: size * 0.38 }}>
        {profile?.avatar_url
          ? <img src={profile.avatar_url} alt={profile.username} />
          : <span>{(profile?.nombre || profile?.username || "?")[0].toUpperCase()}</span>
        }
      </div>
    );
  }

  return (
    <div className="feed-container">

      {/* ── HEADER ── */}
      <header className="feed-header">
        <h1>Feed</h1>
        <p>Outfits de tu comunidad</p>
      </header>

      {/* ── TABS ── */}
      <div className="feed-tabs">
        <button className={`feed-tab ${tab === "feed" ? "activa" : ""}`} onClick={() => setTab("feed")}>
          🏠 Feed
        </button>
        <button className={`feed-tab ${tab === "wishlist" ? "activa" : ""}`} onClick={() => setTab("wishlist")}>
          🌟 Guardados
        </button>
      </div>

      {/* ── NUEVO POST ── */}
      {tab === "feed" && (
        <div className="feed-new-post">
          {newPost.preview ? (
            <div className="feed-new-preview">
              <img src={newPost.preview} alt="preview" />
              <div className="feed-new-actions">
                <input
                  type="text"
                  placeholder="Describe tu outfit..."
                  value={newPost.descripcion}
                  onChange={(e) => setNewPost((p) => ({ ...p, descripcion: e.target.value }))}
                  className="feed-new-input"
                />
                <div className="feed-new-btns">
                  <button
                    className="feed-btn-cancelar"
                    onClick={() => setNewPost({ file: null, preview: "", descripcion: "" })}
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
            <button className="feed-new-btn" onClick={() => fileRef.current.click()}>
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
              if (f) setNewPost((p) => ({ ...p, file: f, preview: URL.createObjectURL(f) }));
            }}
          />
        </div>
      )}

      {/* ── CONTENIDO ── */}
      {loading ? (
        <div className="feed-loading">
          <div className="feed-dot"></div>
          <div className="feed-dot"></div>
          <div className="feed-dot"></div>
        </div>
      ) : tab === "feed" ? (
        posts.length === 0 ? (
          <div className="feed-empty">
            <span className="feed-empty-icon">👗</span>
            <p className="feed-empty-title">Sin posts todavía</p>
            <p className="feed-empty-sub">Agrega amigos o sé el primero en compartir un outfit</p>
          </div>
        ) : (
          <div className="feed-list">
            {posts.map((post) => (
              <div key={post.id} className="feed-post">

                {/* Header del post */}
                <div className="feed-post-header">
                  <div
                    className="feed-post-user"
                    onClick={() => navigate(`/perfil/${post.profile?.username}`)}
                  >
                    <Avatar profile={post.profile} />
                    <div>
                      <p className="feed-post-nombre">{post.profile?.nombre || post.profile?.username}</p>
                      <p className="feed-post-tiempo">{formatTime(post.created_at)}</p>
                    </div>
                  </div>
                  {post.usuario_id === usuarioId && (
                    <button className="feed-post-delete" onClick={() => eliminarPost(post.id)}>🗑</button>
                  )}
                </div>

                {/* Imagen */}
                <div className="feed-post-img-wrap" onClick={() => abrirPost(post)}>
                  <img src={post.imagen_url} alt={post.descripcion} className="feed-post-img" />
                </div>

                {/* Acciones */}
                <div className="feed-post-actions">
                  <button
                    className={`feed-action-btn ${post.liked_by_me ? "liked" : ""}`}
                    onClick={() => handleLike(post)}
                  >
                    <span className="feed-action-icon">{post.liked_by_me ? "♥" : "♡"}</span>
                    <span>{post.likes_count}</span>
                  </button>

                  <button className="feed-action-btn" onClick={() => abrirPost(post)}>
                    <span className="feed-action-icon">💬</span>
                    <span>{post.comments_count}</span>
                  </button>

                  <button
                    className={`feed-action-btn ${post.saved_by_me ? "saved" : ""}`}
                    onClick={() => handleWishlist(post)}
                  >
                    <span className="feed-action-icon">{post.saved_by_me ? "🌟" : "☆"}</span>
                  </button>
                </div>

                {/* Descripción */}
                {post.descripcion && (
                  <div className="feed-post-desc">
                    <span className="feed-post-username" onClick={() => navigate(`/perfil/${post.profile?.username}`)}>
                      @{post.profile?.username}
                    </span>{" "}
                    {post.descripcion}
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      ) : (
        /* ── WISHLIST ── */
        wishlist.length === 0 ? (
          <div className="feed-empty">
            <span className="feed-empty-icon">🌟</span>
            <p className="feed-empty-title">Sin guardados todavía</p>
            <p className="feed-empty-sub">Guarda outfits que te inspiren desde el feed</p>
          </div>
        ) : (
          <div className="feed-wishlist-grid">
            {wishlist.map((item) => (
              <div key={item.id} className="feed-wishlist-item" onClick={() => item.post && abrirPost(item.post)}>
                <img src={item.imagen_url} alt={item.descripcion} />
                <div className="feed-wishlist-overlay">
                  <p>{item.post?.profile?.username && `@${item.post.profile.username}`}</p>
                </div>
                <button
                  className="feed-wishlist-remove"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleWishlist({ id: item.post_id, imagen_url: item.imagen_url, descripcion: item.descripcion });
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )
      )}

      {/* ── MODAL POST ── */}
      {showPostModal && postActivo && (
        <div className="feed-modal-overlay" onClick={() => { setShowPostModal(false); setPostActivo(null); setComentarios([]); }}>
          <div className="feed-modal" onClick={(e) => e.stopPropagation()}>
            <button className="feed-modal-close" onClick={() => { setShowPostModal(false); setPostActivo(null); setComentarios([]); }}>✕</button>

            <div className="feed-modal-img">
              <img src={postActivo.imagen_url} alt={postActivo.descripcion} />
            </div>

            <div className="feed-modal-right">
              {/* Header */}
              <div className="feed-modal-header">
                <div className="feed-post-user" onClick={() => { navigate(`/perfil/${postActivo.profile?.username}`); setShowPostModal(false); }}>
                  <Avatar profile={postActivo.profile} />
                  <div>
                    <p className="feed-post-nombre">{postActivo.profile?.nombre || postActivo.profile?.username}</p>
                    <p className="feed-post-tiempo">@{postActivo.profile?.username}</p>
                  </div>
                </div>
              </div>

              {/* Descripción */}
              {postActivo.descripcion && (
                <div className="feed-modal-desc">
                  <span className="feed-post-username">@{postActivo.profile?.username}</span>{" "}
                  {postActivo.descripcion}
                </div>
              )}

              {/* Comentarios */}
              <div className="feed-modal-comments">
                {comentarios.length === 0 ? (
                  <p className="feed-no-comments">Sin comentarios aún. ¡Sé el primero!</p>
                ) : (
                  comentarios.map((c) => (
                    <div key={c.id} className="feed-comment">
                      <Avatar profile={c.profile} size={28} />
                      <div className="feed-comment-content">
                        <span className="feed-comment-user">@{c.profile?.username}</span>
                        <span className="feed-comment-text"> {c.texto}</span>
                        <span className="feed-comment-time">{formatTime(c.created_at)}</span>
                      </div>
                      {c.usuario_id === usuarioId && (
                        <button className="feed-comment-delete" onClick={() => eliminarComentario(c.id)}>✕</button>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Acciones modal */}
              <div className="feed-modal-actions">
                <button
                  className={`feed-action-btn ${postActivo.liked_by_me ? "liked" : ""}`}
                  onClick={() => {
                    handleLike(postActivo);
                    setPostActivo((p) => ({
                      ...p,
                      liked_by_me: !p.liked_by_me,
                      likes_count: p.liked_by_me ? p.likes_count - 1 : p.likes_count + 1,
                    }));
                  }}
                >
                  <span>{postActivo.liked_by_me ? "♥" : "♡"}</span>
                  <span>{postActivo.likes_count}</span>
                </button>

                <button
                  className={`feed-action-btn ${postActivo.saved_by_me ? "saved" : ""}`}
                  onClick={() => {
                    handleWishlist(postActivo);
                    setPostActivo((p) => ({ ...p, saved_by_me: !p.saved_by_me }));
                  }}
                >
                  <span>{postActivo.saved_by_me ? "🌟" : "☆"}</span>
                  <span>Guardar</span>
                </button>
              </div>

              {/* Input comentario */}
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