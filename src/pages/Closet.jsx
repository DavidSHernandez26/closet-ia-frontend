import React, { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import "./Closet.css";
import { API_URL } from "../config";
import { supaImg } from "../utils/imgUrl";

const COLOR_HEX = {
  negro: '#2a2a2e', blanco: '#f0f0f0', azul: '#2563eb', rojo: '#dc2626',
  verde: '#16a34a', gris: '#9ca3af', beige: '#d2b48c', camel: '#c19a6b',
  café: '#6b4226', marrón: '#795548', amarillo: '#ca8a04', naranja: '#ea580c',
  rosa: '#db2777', morado: '#9333ea', crema: '#fef3c7', terracota: '#b45309',
  mostaza: '#a16207', burdeos: '#991b1b', marino: '#1e3a5f', lila: '#7c3aed',
  tostado: '#92400e', caqui: '#8b8060', lavanda: '#a78bca',
};

function normalizarColor(str = '') {
  return str.toLowerCase().split(/[\/\s,]/)[0].trim();
}

/* ── Categorías de prendas ── */
const CATEGORIAS = [
  { id: "todas",      label: "Todas",             icon: "✦" },
  { id: "camisetas",  label: "Camisetas / Tops",   icon: "👕" },
  { id: "pantalones", label: "Pantalones",          icon: "👖" },
  { id: "chaquetas",  label: "Chaquetas / Sudad.",  icon: "🧥" },
  { id: "zapatos",    label: "Zapatos / Tenis",     icon: "👟" },
  { id: "gorras",     label: "Gorras",              icon: "🧢" },
  { id: "accesorios", label: "Accesorios",          icon: "👜" },
];

/* ── Mapeo de categoría → palabras clave ── */
function matchCategoria(prenda, categoria) {
  if (categoria === "todas") return true;
  const desc = (prenda.descripcion || "").toLowerCase();
  const tipo  = (prenda.metadata_ia?.tipo || "").toLowerCase();

  switch (categoria) {
    case "camisetas":
      return tipo === "parte superior" ||
        /camiseta|camisa|polo|blusa|top|remera|franela|playera|hoodie(?!.*chaqueta)|suéter(?!.*chaqueta)/.test(desc);
    case "pantalones":
      return tipo === "parte inferior" ||
        /pantalón|pantalon|jeans|jean|short|bermuda|leggins|leggings|jogger/.test(desc);
    case "chaquetas":
      return tipo === "abrigo" ||
        /chaqueta|sudadera|hoodie|blazer|saco|abrigo|chamarra|cardigan|sweatshirt/.test(desc);
    case "zapatos":
      return tipo === "calzado" ||
        /tenis|zapato|bota|botín|botin|mocasín|mocasin|sandalia|sneaker|calzado|shoe/.test(desc);
    case "gorras":
      return /gorra|cap|sombrero|beanie|gorro|visera/.test(desc);
    case "accesorios":
      return tipo === "accesorio" ||
        /accesorio|bolso|bolsa|cinturón|cinturon|collar|pulsera|reloj|gafas|lentes|bufanda|mochila|cartera/.test(desc);
    default:
      return true;
  }
}

export default function Closet({ refresh }) {
  const [usuarioId]  = useState(localStorage.getItem("usuarioId") || "user_demo");
  const [prendas,    setPrendas]    = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [tabActiva,  setTabActiva]  = useState("prenda");
  const [categoria,  setCategoria]  = useState("todas");
  const [modalItem,  setModalItem]  = useState(null);
  const [recomendaciones, setRecomendaciones] = useState([]);
  const [loadingRecs, setLoadingRecs]         = useState(false);
  const [recsVisible, setRecsVisible]         = useState(false);
  const [hoveredIdx, setHoveredIdx]           = useState(null);

  useEffect(() => { fetchPrendas(); }, [usuarioId, tabActiva, refresh]);

  /* Al cambiar tab, resetear categoría */
  useEffect(() => { setCategoria("todas"); }, [tabActiva]);

  async function fetchPrendas() {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/api/prendas`, {
        params: { usuario_id: usuarioId, tipo: tabActiva },
      });
      setPrendas(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchRecomendaciones() {
    if (loadingRecs || recomendaciones.length > 0) return;
    setLoadingRecs(true);
    try {
      const res = await axios.post(`${API_URL}/api/recomendaciones-compra`, { usuario_id: usuarioId });
      setRecomendaciones(res.data?.recomendaciones || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingRecs(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("¿Eliminar esta prenda?")) return;
    try {
      await axios.delete(`${API_URL}/api/prendas/${id}`);
      setPrendas(prev => prev.filter(p => p.id !== id));
      if (modalItem?.id === id) setModalItem(null);
    } catch (err) {
      console.error(err);
    }
  }

  /* Filtrado client-side */
  const prendasFiltradas = tabActiva === "prenda"
    ? prendas.filter(p => matchCategoria(p, categoria))
    : prendas;

  // When tabActiva === "prenda" the API already filtered; avoid a second filter that
  // can silently empty the array if Supabase returns a slightly different tipo value.
  const prendasSueltas = useMemo(
    () => tabActiva === "prenda" ? prendas : prendas.filter(p => p.tipo === "prenda"),
    [prendas, tabActiva]
  );

  const colorStats = useMemo(() => {
    const counts = {};
    prendasSueltas.forEach(p => {
      const raw = p.metadata_ia?.color || (p.descripcion?.match(/\(([^)]+)\)/)?.[1] || '');
      const color = normalizarColor(raw);
      if (color) counts[color] = (counts[color] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [prendasSueltas]);

  const tipoStats = useMemo(() => {
    const TIPO_LABELS = {
      'parte superior': { label: 'Superiores', icon: '👕' },
      'parte inferior': { label: 'Pantalones', icon: '👖' },
      'calzado':        { label: 'Calzado',    icon: '👟' },
      'abrigo':         { label: 'Abrigos',    icon: '🧥' },
      'accesorio':      { label: 'Accesorios', icon: '👜' },
    };
    const counts = {};
    prendasSueltas.forEach(p => {
      const t = p.metadata_ia?.tipo || 'otro';
      counts[t] = (counts[t] || 0) + 1;
    });
    return Object.entries(TIPO_LABELS).map(([key, meta]) => ({
      ...meta, count: counts[key] || 0,
    })).filter(t => t.count > 0);
  }, [prendasSueltas]);

  const maxColor = colorStats[0]?.[1] || 1;

  return (
    <div className="mac-wrap">
      <div className="mac-window">

        {/* Titlebar */}
        <div className="mac-titlebar">
          <div className="mac-dots">
            <span className="mac-dot red"    />
            <span className="mac-dot yellow" />
            <span className="mac-dot green"  />
          </div>
          <span className="mac-title">Closet — Be: Confident</span>

          {/* Switch mobile */}
          <div className="mac-switch-track">
            <div
              className="mac-switch-thumb"
              style={{ transform: tabActiva === "outfit" ? "translateX(100%)" : "translateX(0)" }}
            />
            <button
              className={`mac-switch-btn ${tabActiva === "prenda" ? "on" : ""}`}
              onClick={() => setTabActiva("prenda")}
            >👚</button>
            <button
              className={`mac-switch-btn ${tabActiva === "outfit" ? "on" : ""}`}
              onClick={() => setTabActiva("outfit")}
            >🧥</button>
          </div>
        </div>

        <div className="mac-body">

          {/* Sidebar */}
          <aside className="mac-sidebar">

            {/* Sección biblioteca */}
            <p className="mac-sidebar-section">Biblioteca</p>
            <button
              className={`mac-sidebar-item ${tabActiva === "prenda" && categoria === "todas" ? "active" : ""}`}
              onClick={() => { setTabActiva("prenda"); setCategoria("todas"); }}
            >
              <span>👕</span> Prendas
              <span className="mac-sidebar-count">
                {tabActiva === "prenda" ? prendas.length : ""}
              </span>
            </button>
            <button
              className={`mac-sidebar-item ${tabActiva === "outfit" ? "active" : ""}`}
              onClick={() => setTabActiva("outfit")}
            >
              <span>🧥</span> Outfits
              <span className="mac-sidebar-count">
                {tabActiva === "outfit" ? prendas.length : ""}
              </span>
            </button>

            {/* Sección categorías — solo visible en prendas */}
            {tabActiva === "prenda" && (
              <>
                <p className="mac-sidebar-section" style={{ marginTop: 16 }}>
                  Categorías
                </p>
                {CATEGORIAS.filter(c => c.id !== "todas").map(c => {
                  const count = prendas.filter(p => matchCategoria(p, c.id)).length;
                  if (count === 0) return null;
                  return (
                    <button
                      key={c.id}
                      className={`mac-sidebar-item ${categoria === c.id ? "active" : ""}`}
                      onClick={() => setCategoria(c.id)}
                    >
                      <span>{c.icon}</span>
                      <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {c.label}
                      </span>
                      <span className="mac-sidebar-count">{count}</span>
                    </button>
                  );
                })}
              </>
            )}

            {/* Stats */}
            <p className="mac-sidebar-section" style={{ marginTop: 16 }}>Info</p>
            <div className="mac-sidebar-stat">
              <span>{tabActiva === "prenda" ? "Mostrando" : "Total"}</span>
              <span>{tabActiva === "prenda" ? prendasFiltradas.length : prendas.length}</span>
            </div>
            <div className="mac-sidebar-stat">
              <span>Total prendas</span>
              <span>{prendas.length}</span>
            </div>

            {/* ── Estadísticas — solo en prendas ── */}
            {tabActiva === "prenda" && prendasSueltas.length > 0 && (
              <>
                {colorStats.length > 0 && (
                  <>
                    <p className="mac-sidebar-section" style={{ marginTop: 16 }}>Colores</p>
                    <div className="mac-stats-colors">
                      {colorStats.map(([color, count]) => (
                        <div key={color} className="mac-stat-color-row">
                          <span
                            className="mac-stat-color-dot"
                            style={{ background: COLOR_HEX[color] || '#888' }}
                          />
                          <span className="mac-stat-color-name">{color}</span>
                          <div className="mac-stat-bar-wrap">
                            <div
                              className="mac-stat-bar"
                              style={{ width: `${(count / maxColor) * 100}%` }}
                            />
                          </div>
                          <span className="mac-stat-count">{count}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {tipoStats.length > 0 && (
                  <>
                    <p className="mac-sidebar-section" style={{ marginTop: 14 }}>Tipos</p>
                    <div className="mac-stats-tipos">
                      {tipoStats.map(t => (
                        <div key={t.label} className="mac-stat-tipo-row">
                          <span>{t.icon}</span>
                          <span className="mac-stat-tipo-label">{t.label}</span>
                          <span className="mac-stat-count">{t.count}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                <p className="mac-sidebar-section" style={{ marginTop: 14 }}>Comprar</p>
                {recomendaciones.length === 0 ? (
                  <button
                    className="mac-sidebar-item mac-recs-btn"
                    onClick={() => { setRecsVisible(true); fetchRecomendaciones(); }}
                    disabled={loadingRecs}
                  >
                    {loadingRecs ? (
                      <span className="mac-recs-loading">
                        <span className="mac-recs-dot"/><span className="mac-recs-dot"/><span className="mac-recs-dot"/>
                      </span>
                    ) : (
                      <><span>✦</span> Ver sugerencias</>
                    )}
                  </button>
                ) : (
                  <div className="mac-recs-list">
                    {recomendaciones.map((r, i) => (
                      <div key={i} className="mac-rec-item">
                        <span className="mac-rec-bullet">+</span>
                        <span>{r}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </aside>

          {/* Contenido */}
          <main className="mac-content">
            {loading ? (
              <div className="mac-loading">
                <div className="mac-spinner" />
                <p>Cargando...</p>
              </div>
            ) : prendasFiltradas.length === 0 ? (
              <div className="mac-empty">
                <p className="mac-empty-icon">🗂️</p>
                <p className="mac-empty-title">
                  {categoria !== "todas"
                    ? `Sin ${CATEGORIAS.find(c => c.id === categoria)?.label.toLowerCase()}`
                    : `Sin ${tabActiva === "prenda" ? "prendas" : "outfits"}`}
                </p>
                <p className="mac-empty-sub">
                  {categoria !== "todas"
                    ? "No encontramos prendas en esta categoría"
                    : "Sube fotos desde el botón + en la barra de navegación"}
                </p>
              </div>
            ) : tabActiva === "outfit" ? (
              <div className="mac-masonry">
                {prendasFiltradas.map((p, i) => (
                  <motion.div
                    key={p.id}
                    className="mac-masonry-item"
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: Math.min(i * 0.07, 0.5) }}
                    viewport={{ once: true }}
                    onMouseEnter={() => setHoveredIdx(i)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    onClick={() => setModalItem(p)}
                  >
                    <motion.img
                      src={supaImg(p.imagen_url, 600)}
                      alt={p.descripcion}
                      loading="lazy"
                      decoding="async"
                      animate={{
                        filter: hoveredIdx === null
                          ? "blur(0px) brightness(1)"
                          : hoveredIdx === i
                          ? "blur(0px) brightness(1) scale(1)"
                          : "blur(3px) brightness(0.7)",
                        scale: hoveredIdx === i ? 1.04 : 1,
                      }}
                      transition={{ duration: 0.25 }}
                    />
                    <button
                      className="mac-thumb-del"
                      onClick={e => { e.stopPropagation(); handleDelete(p.id); }}
                    >✕</button>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="mac-grid">
                {prendasFiltradas.map(p => (
                  <div
                    key={p.id}
                    className="mac-thumb stagger-item"
                    onClick={() => setModalItem(p)}
                  >
                    <img src={supaImg(p.imagen_url, 400)} alt={p.descripcion} loading="lazy" decoding="async" />
                    <button
                      className="mac-thumb-del"
                      onClick={e => { e.stopPropagation(); handleDelete(p.id); }}
                    >✕</button>
                  </div>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Modal */}
      {modalItem && (
        <div className="mac-modal-overlay fade-in" onClick={() => setModalItem(null)}>
          <div className="mac-modal modal-spring" onClick={e => e.stopPropagation()}>
            <div className="mac-modal-bar">
              <div className="mac-dots">
                <span className="mac-dot red"    onClick={() => setModalItem(null)} style={{ cursor: "pointer" }} />
                <span className="mac-dot yellow" />
                <span className="mac-dot green"  />
              </div>
              <span className="mac-title">
                {modalItem.tipo === "outfit" ? "Outfit completo" : "Prenda individual"}
              </span>
            </div>
            <div className="mac-modal-body">
              <div className="mac-modal-img">
                <img src={supaImg(modalItem.imagen_url, 900)} alt={modalItem.descripcion} decoding="async" />
              </div>
              <div className="mac-modal-info">
                <span className="mac-modal-tipo">
                  {modalItem.tipo === "outfit" ? "Outfit" : "Prenda"}
                </span>
                <p className="mac-modal-desc">{modalItem.descripcion || "Sin descripción"}</p>
                {modalItem.tipo === "outfit" && modalItem.metadata_ia?.prendas?.length > 0 && (
                  <>
                    <p className="mac-modal-section-title">Prendas detectadas</p>
                    <div className="mac-modal-chips">
                      {modalItem.metadata_ia.prendas.map((pr, i) => (
                        <span key={i} className="mac-modal-chip">
                          {pr.nombre} · {pr.color}
                        </span>
                      ))}
                    </div>
                  </>
                )}
                <button
                  className="mac-modal-delete"
                  onClick={() => handleDelete(modalItem.id)}
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}