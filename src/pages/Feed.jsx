import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { LayoutGrid, Users, TrendingUp, Bookmark, Trash2, Heart, MessageCircle } from "lucide-react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Swiper, SwiperSlide } from "swiper/react";
import { EffectCards, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/effect-cards";
import "./Feed.css";
import { API_URL } from "../config";
import { supaImg } from "../utils/imgUrl";
import { supabase, getAuthHeaders } from "../supabase";

/* ─────────────────────────────────────
   Hook de detección de mobile
───────────────────────────────────── */
function useIsMobile(breakpoint = 900) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < breakpoint);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [breakpoint]);
  return isMobile;
}

/* ─────────────────────────────────────
   Chips de navegación principal
   "guardados" activa la vista de wishlist
───────────────────────────────────── */
const FILTROS = [
  { id: "todos",      label: "Todos",      Icon: LayoutGrid  },
  { id: "amigos",     label: "Amigos",     Icon: Users       },
  { id: "tendencias", label: "Tendencias", Icon: TrendingUp  },
  { id: "guardados",  label: "Guardados",  Icon: Bookmark    },
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
        <img src={supaImg(profile.avatar_url, 80)} alt={profile.username} loading="lazy" decoding="async" />
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
  const [loadingMore,    setLoadingMore]    = useState(false);
  const [nextCursor,     setNextCursor]     = useState(null);
  const [filtro,         setFiltro]         = useState("todos");
  const [wishlist,       setWishlist]       = useState([]);
  const [loadingWishlist,setLoadingWishlist]= useState(false);
  const [sugeridos,      setSugeridos]      = useState([]);
  const [amigosIds,      setAmigosIds]      = useState(new Set());
  const [busqueda,       setBusqueda]       = useState("");
  const [resultados,     setResultados]     = useState([]);
  const [buscando,       setBuscando]       = useState(false);
  const busquedaTimer    = useRef(null);

  /* Modal */
  const [showPostModal,    setShowPostModal]    = useState(false);
  const [postActivo,       setPostActivo]       = useState(null);
  const [comentarios,      setComentarios]      = useState([]);
  const [nuevoComentario,  setNuevoComentario]  = useState("");
  const [loadingComment,   setLoadingComment]   = useState(false);

  /* Nuevo post */
  const [newPost,   setNewPost]   = useState({ file: null, preview: "", descripcion: "", tags: [] });
  const [tagInput,  setTagInput]  = useState("");
  const [tagFiltro, setTagFiltro] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  const navigate    = useNavigate();
  const isMobile    = useIsMobile();
  const sentinelRef = useRef(null);

  /* ── Infinite scroll con IntersectionObserver ── */
  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) cargarMas(); },
      { threshold: 0.1 }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [nextCursor, loadingMore]);

  /* ── Carga inicial — esperar a que usuarioId esté confirmado ── */
  useEffect(() => {
    if (!usuarioId) return;
    cargarFeed();
    cargarSugeridos();
    cargarAmigos();
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
      const headers = getAuthHeaders();
      const res = await axios.get(`${API_URL}/api/feed`, { headers });
      setPosts(res.data.posts || []);
      setNextCursor(res.data.nextCursor || null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function cargarMas() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const headers = getAuthHeaders();
      const res = await axios.get(`${API_URL}/api/feed`, {
        params: { before: nextCursor },
        headers,
      });
      setPosts((prev) => [...prev, ...(res.data.posts || [])]);
      setNextCursor(res.data.nextCursor || null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMore(false);
    }
  }

  /* ──────────────────────────────────
     API — Wishlist
  ────────────────────────────────── */
  async function cargarWishlist() {
    setLoadingWishlist(true);
    try {
      const headers = getAuthHeaders();
      const res = await axios.get(`${API_URL}/api/wishlist`, { headers });
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
    const res = await axios.get(`${API_URL}/api/usuarios/sugeridos`);
    setSugeridos(res.data || []);
  } catch (err) {
    console.error(err);
  }
}

  async function cargarAmigos() {
    if (!usuarioId) return;
    try {
      const res = await axios.get(`${API_URL}/api/amistad/amigos`, {
        headers: getAuthHeaders(),
      });
      const ids = new Set((res.data || []).map(a => a.id));
      setAmigosIds(ids);
    } catch { /* silencioso — el filtro fallback muestra todos */ }
  }
  /* ──────────────────────────────────
     Filtrado local de posts
  ────────────────────────────────── */
  const postsFiltrados = posts.filter((p) => {
    if (filtro === "amigos")     return amigosIds.size > 0 ? amigosIds.has(p.usuario_id) : p.usuario_id !== usuarioId;
    if (filtro === "tendencias") return p.likes_count >= 5;
    if (tagFiltro) return extractTags(p.descripcion).includes(tagFiltro);
    return true;
  });

  /* Búsqueda de usuarios con debounce */
  function handleBusqueda(q) {
    setBusqueda(q);
    clearTimeout(busquedaTimer.current);
    if (!q.trim()) { setResultados([]); return; }
    busquedaTimer.current = setTimeout(async () => {
      setBuscando(true);
      try {
        const res = await axios.get(`${API_URL}/api/usuarios/buscar`, { params: { q } });
        setResultados(res.data || []);
      } catch { setResultados([]); }
      finally { setBuscando(false); }
    }, 350);
  }

  /* Tags: extraer #hashtags de descripción */
  function extractTags(desc = "") {
    return [...desc.matchAll(/#(\w+)/g)].map(m => m[1].toLowerCase());
  }

  /* Posts más populares para el sidebar */
  const topPosts = [...posts]
    .sort((a, b) => b.likes_count - a.likes_count)
    .slice(0, 2);

  /* ──────────────────────────────────
     Handlers
  ────────────────────────────────── */
  async function handleLike(post) {
    try {
      const headers = getAuthHeaders();
      const res = await axios.post(`${API_URL}/api/likes`, { post_id: post.id }, { headers });
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
      const headers = getAuthHeaders();
      const res = await axios.post(`${API_URL}/api/wishlist`, {
        post_id: post.id,
        imagen_url: post.imagen_url,
        descripcion: post.descripcion,
      }, { headers });
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
      const headers = getAuthHeaders();
      const res = await axios.post(`${API_URL}/api/comments`, {
        post_id: postActivo.id,
        texto: nuevoComentario,
      }, { headers });
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
      const headers = getAuthHeaders();
      await axios.delete(`${API_URL}/api/comments/${id}`, { headers });
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
      const headers = getAuthHeaders();
      await axios.delete(`${API_URL}/api/posts/${postId}`, { headers });
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
      fd.append("descripcion", newPost.descripcion);
      const res = await axios.post(`${API_URL}/api/posts`, fd, {
        headers: { ...getAuthHeaders(), "Content-Type": "multipart/form-data" },
      });
      /* Prepend inmediato para que aparezca sin recargar */
      if (res.data?.id) {
        const nuevoPost = {
          ...res.data,
          likes_count: 0, comments_count: 0, liked_by_me: false, saved_by_me: false,
          profile: null,
        };
        setPosts(prev => [nuevoPost, ...prev]);
      }
      setNewPost({ file: null, preview: "", descripcion: "", tags: [] });
      setTagInput("");
    } catch (err) {
      console.error(err);
      cargarFeed();
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

      {/* ── Titlebar macOS ── */}
      <div className="feed-titlebar">
        <div className="mac-dots">
          <span className="mac-dot red"    />
          <span className="mac-dot yellow" />
          <span className="mac-dot green"  />
        </div>
        <span className="mac-title">Feed — Be: Confident</span>
      </div>

      <div className="feed-inner">

        {/* ── HEADER ── */}
        <header className="feed-header">
          <h1>Inspiración</h1>
          <p>Outfits de tu comunidad · encuentra tu estilo</p>
          {/* Búsqueda de usuarios — visible en mobile */}
          <div className="feed-search-wrap">
            <input
              className="feed-search-input"
              type="text"
              placeholder="Buscar persona por @username..."
              value={busqueda}
              onChange={e => handleBusqueda(e.target.value)}
            />
            {(resultados.length > 0 || buscando) && (
              <div className="feed-search-results">
                {buscando && <p className="feed-search-loading">Buscando...</p>}
                {resultados.map(u => (
                  <div key={u.id} className="feed-search-row" onClick={() => { navigate(`/perfil/${u.username}`); setBusqueda(""); setResultados([]); }}>
                    <Avatar profile={u} size={30} />
                    <div className="feed-search-info">
                      <p className="feed-search-nombre">{u.nombre || u.username}</p>
                      <p className="feed-search-handle">@{u.username}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </header>

        {/* ── CHIPS DE FILTRO ── */}
        <nav className="feed-chips" aria-label="Filtros del feed">
          {FILTROS.map((f) => (
            <button
              key={f.id}
              className={`feed-chip ${filtro === f.id ? "active" : ""}`}
              onClick={() => setFiltro(f.id)}
            >
              <f.Icon size={13} />
              <span>{f.label}</span>
            </button>
          ))}
        </nav>

        {/* ── FILTRO DE TAG ACTIVO ── */}
        {tagFiltro && (
          <div className="feed-tag-filter-active">
            <span>#{tagFiltro}</span>
            <button onClick={() => setTagFiltro(null)}>✕</button>
          </div>
        )}

        {/* ── CARRUSEL DE OUTFITS — solo mobile ── */}
        {isMobile && filtro !== "guardados" && !loading && postsFiltrados.length > 0 && (
          <FeedCarousel
            posts={postsFiltrados}
            usuarioId={usuarioId}
            onLike={handleLike}
            onGuardar={handleWishlist}
            onAbrir={abrirPost}
          />
        )}

        {/* ── LOADING/EMPTY en mobile (no-guardados) ── */}
        {isMobile && filtro !== "guardados" && loading && (
          <div className="feed-loading">
            <div className="feed-dot" /><div className="feed-dot" /><div className="feed-dot" />
          </div>
        )}
        {isMobile && filtro !== "guardados" && !loading && postsFiltrados.length === 0 && (
          <div className="feed-empty">
            <LayoutGrid size={36} className="feed-empty-icon" />
            <p className="feed-empty-title">Sin posts en este filtro</p>
            <p className="feed-empty-sub">
              {filtro === "amigos" ? "Agrega amigos para ver sus outfits" : "Aún no hay publicaciones aquí"}
            </p>
          </div>
        )}

        {/* ── NUEVO POST (visible en todos los filtros excepto guardados) ── */}
        {filtro !== "guardados" && (
          <div className="feed-new-post">
            {newPost.preview ? (
              <div className="feed-new-preview">
                <img src={newPost.preview} alt="preview" />
                <div className="feed-new-actions">
                  <input
                    type="text"
                    placeholder="Describe tu outfit... (usa #casual #trabajo para tags)"
                    value={newPost.descripcion}
                    onChange={(e) =>
                      setNewPost((p) => ({ ...p, descripcion: e.target.value }))
                    }
                    className="feed-new-input"
                  />
                  {extractTags(newPost.descripcion).length > 0 && (
                    <div className="feed-tag-preview">
                      {extractTags(newPost.descripcion).map(t => (
                        <span key={t} className="feed-tag-chip">#{t}</span>
                      ))}
                    </div>
                  )}
                  <div className="feed-new-btns">
                    <button
                      className="feed-btn-cancelar"
                      onClick={() =>
                        setNewPost({ file: null, preview: "", descripcion: "", tags: [] })
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

        {/* ── LISTA DE POSTS / WISHLIST — desktop siempre, mobile solo en guardados ── */}
        {(!isMobile || filtro === "guardados") && (
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
                <Bookmark size={36} className="feed-empty-icon" />
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
                    <img src={supaImg(item.imagen_url, 400)} alt={item.descripcion} loading="lazy" decoding="async" />
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
              <LayoutGrid size={36} className="feed-empty-icon" />
              <p className="feed-empty-title">Sin posts en este filtro</p>
              <p className="feed-empty-sub">
                {filtro === "amigos"
                  ? "Agrega amigos para ver sus outfits"
                  : "Aún no hay suficientes publicaciones aquí"}
              </p>
            </div>
          ) : (
            <>
              {postsFiltrados.map((post) => (
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
                  onTagClick={setTagFiltro}
                />
              ))}
              {nextCursor && filtro !== "amigos" && filtro !== "tendencias" && (
                <div ref={sentinelRef} className="feed-sentinel">
                  {loadingMore && (
                    <div className="feed-loading" style={{ paddingTop: 12 }}>
                      <div className="feed-dot" /><div className="feed-dot" /><div className="feed-dot" />
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </section>
        )}

        {/* ── SIDEBAR — solo visible en desktop (≥900px) ── */}
        <aside className="feed-sidebar" aria-label="Sugerencias">

          <div className="sidebar-card">
            <h3 className="sidebar-title">Buscar personas</h3>
            <div className="feed-search-wrap sidebar-search">
              <input
                className="feed-search-input"
                type="text"
                placeholder="@username o nombre..."
                value={busqueda}
                onChange={e => handleBusqueda(e.target.value)}
              />
              {(resultados.length > 0 || buscando) && (
                <div className="feed-search-results">
                  {buscando && <p className="feed-search-loading">Buscando...</p>}
                  {resultados.map(u => (
                    <div key={u.id} className="feed-search-row" onClick={() => { navigate(`/perfil/${u.username}`); setBusqueda(""); setResultados([]); }}>
                      <Avatar profile={u} size={30} />
                      <div className="feed-search-info">
                        <p className="feed-search-nombre">{u.nombre || u.username}</p>
                        <p className="feed-search-handle">@{u.username}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

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
                      src={supaImg(post.imagen_url, 200)}
                      alt={post.descripcion}
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  <div className="sidebar-text">
                    <p className="sidebar-name">@{post.profile?.username}</p>
                    <p className="sidebar-sub" style={{ display:"flex", alignItems:"center", gap:4 }}>
                      <Heart size={11} /> {post.likes_count} · <MessageCircle size={11} /> {post.comments_count}
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
              <img src={supaImg(postActivo.imagen_url, 900)} alt={postActivo.descripcion} decoding="async" />
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
                    <Trash2 size={14} />
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
   FeedCarousel — carrusel de outfits
   Muestra posts con like/guardar opcionales
───────────────────────────────────── */
function FeedCarousel({ posts, usuarioId, onLike, onGuardar, onAbrir }) {
  if (!posts || posts.length === 0) return null;
  const slides = posts.slice(0, 12);

  return (
    <motion.div
      className="feed-carousel-wrap"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      <p className="feed-carousel-hint">Desliza para explorar · las acciones son opcionales</p>
      <Swiper
        effect="cards"
        grabCursor
        loop={slides.length > 2}
        modules={[EffectCards, Autoplay]}
        className="feed-carousel-swiper"
      >
        {slides.map((post) => (
          <SwiperSlide key={post.id} className="feed-carousel-slide">
            <img
              src={supaImg(post.imagen_url, 600)}
              alt={post.descripcion || "outfit"}
              className="feed-carousel-img"
              loading="lazy"
              decoding="async"
              onClick={() => onAbrir(post)}
            />
            {/* Overlay: usuario */}
            <div className="feed-carousel-user">
              <span>@{post.profile?.username}</span>
            </div>
            {/* Acciones opcionales */}
            <div className="feed-carousel-actions">
              <button
                className={`feed-carousel-btn ${post.liked_by_me ? "active-like" : ""}`}
                onClick={(e) => { e.stopPropagation(); onLike(post); }}
                aria-label="Me gusta"
              >
                <svg viewBox="0 0 24 24" fill={post.liked_by_me ? "currentColor" : "none"} stroke="currentColor">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
                <span>Me gusta{post.likes_count > 0 ? ` · ${post.likes_count}` : ""}</span>
              </button>
              <button
                className={`feed-carousel-btn ${post.saved_by_me ? "active-save" : ""}`}
                onClick={(e) => { e.stopPropagation(); onGuardar(post); }}
                aria-label="Guardar"
              >
                <svg viewBox="0 0 24 24" fill={post.saved_by_me ? "currentColor" : "none"} stroke="currentColor">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                </svg>
                <span>Guardar</span>
              </button>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </motion.div>
  );
}

/* ─────────────────────────────────────
   PostCard — sub-componente
   Usa íconos SVG del sistema de diseño
───────────────────────────────────── */
function extractTagsStatic(desc = "") {
  return [...desc.matchAll(/#(\w+)/g)].map(m => m[1].toLowerCase());
}

function PostCard({
  post, usuarioId, onLike, onGuardar, onAbrir, onEliminar, onNavigate, formatTime, onTagClick,
}) {
  const tags = extractTagsStatic(post.descripcion || "");
  const descSinTags = (post.descripcion || "").replace(/#\w+/g, "").trim();
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
          src={supaImg(post.imagen_url, 800)}
          alt={post.descripcion}
          className="feed-post-img"
          loading="lazy"
          decoding="async"
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

      {/* Descripción + tags */}
      {(descSinTags || tags.length > 0) && (
        <div className="feed-post-desc">
          {descSinTags && (
            <>
              <span
                className="feed-post-username"
                onClick={() => onNavigate(`/perfil/${post.profile?.username}`)}
              >
                @{post.profile?.username}
              </span>{" "}
              {descSinTags}
            </>
          )}
          {tags.length > 0 && (
            <div className="feed-post-tags">
              {tags.map(t => (
                <button key={t} className="feed-post-tag" onClick={() => onTagClick?.(t)}>#{t}</button>
              ))}
            </div>
          )}
        </div>
      )}

    </article>
  );
}
