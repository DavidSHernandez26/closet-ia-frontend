import React, { useEffect, useState } from "react";
import axios from "axios";
import "./Closet.css";
import { API_URL } from "../config";

export default function Closet({ refresh }) {
  const [usuarioId] = useState(
    localStorage.getItem("usuarioId") || "user_demo"
  );
  const [prendas, setPrendas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tabActiva, setTabActiva] = useState("prenda");
  const [modalItem, setModalItem] = useState(null);

  useEffect(() => {
    fetchPrendas();
  }, [usuarioId, tabActiva, refresh]);

  useEffect(() => {
    const cards = document.querySelectorAll(".closet-card");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    cards.forEach((card) => observer.observe(card));
  }, [prendas]);

  async function fetchPrendas() {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/api/prendas`, {
        params: { usuario_id: usuarioId, tipo: tabActiva },
      });
      setPrendas(res.data || []);
    } catch (err) {
      console.error("Error obteniendo prendas:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("¿Eliminar esta prenda/outfit?")) return;
    try {
      await axios.delete(`${API_URL}/api/prendas/${id}`);
      setPrendas((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error("Error al eliminar:", err);
    }
  }

  function closeModal(e) {
    if (e.target.classList.contains("item-modal")) setModalItem(null);
  }

  return (
    <div className="closet-container">
      <header className="closet-header">
        <h1>📸 Tu Closet Inteligente</h1>
        <p>Visualiza tus prendas y outfits detectados por IA</p>
      </header>

      <div className="closet-tabs">
        <button
          className={`tab-btn ${tabActiva === "prenda" ? "activa" : ""}`}
          onClick={() => setTabActiva("prenda")}
        >
          👚 Prendas
        </button>
        <button
          className={`tab-btn ${tabActiva === "outfit" ? "activa" : ""}`}
          onClick={() => setTabActiva("outfit")}
        >
          🧥 Outfits
        </button>
      </div>

      {loading ? (
        <p className="loading">Cargando...</p>
      ) : prendas.length === 0 ? (
        <p className="no-items">
          {tabActiva === "prenda"
            ? "No tienes prendas registradas todavía."
            : "No tienes outfits registrados todavía."}
        </p>
      ) : (
        <div className="closet-grid">
          {prendas.map((p) => (
            <div className="closet-card" key={p.id} onClick={() => setModalItem(p)}>
              <div className="image-box">
                <img src={p.imagen_url} alt={p.descripcion || "Prenda"} />
                <button
                  className="delete-btn"
                  onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}
                >
                  ✕
                </button>
              </div>
              <div className="card-info">
                <span className="tipo">
                  {p.tipo === "outfit" ? "👔 Outfit" : "👚 Prenda"}
                </span>
                <p>{p.descripcion || "Sin descripción"}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalItem && (
        <div className="item-modal" onClick={closeModal}>
          <div className="modal-content">
            <button className="close-modal" onClick={() => setModalItem(null)}>✕</button>
            <img src={modalItem.imagen_url} alt="Detalle" />
            <div className="modal-info">
              <h2>
                {modalItem.tipo === "outfit" ? "🧥 Outfit detectado" : "👕 Prenda individual"}
              </h2>
              <p>{modalItem.descripcion}</p>
              {modalItem.tipo === "outfit" && modalItem.metadata_ia?.prendas?.length > 0 && (
                <div className="outfit-prendas">
                  <h3>Prendas detectadas:</h3>
                  <ul>
                    {modalItem.metadata_ia.prendas.map((pr, i) => (
                      <li key={i}>{pr.nombre} ({pr.color}) — {pr.tipo}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}