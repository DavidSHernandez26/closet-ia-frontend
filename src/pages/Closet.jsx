import React, { useEffect, useState } from "react";
import axios from "axios";
import "./Closet.css";
import { API_URL } from "../config";

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
            ) : (
              <div className="mac-grid">
                {prendasFiltradas.map(p => (
                  <div
                    key={p.id}
                    className="mac-thumb"
                    onClick={() => setModalItem(p)}
                  >
                    <img src={p.imagen_url} alt={p.descripcion} />
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
        <div className="mac-modal-overlay" onClick={() => setModalItem(null)}>
          <div className="mac-modal" onClick={e => e.stopPropagation()}>
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
                <img src={modalItem.imagen_url} alt={modalItem.descripcion} />
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