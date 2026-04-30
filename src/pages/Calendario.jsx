import React, { useState, useEffect, useCallback } from "react";
import "./Calendario.css";
import axios from "axios";
import { API_URL } from "../config";
import { supabase } from "../supabase";
import UploadModal from "../components/UploadModal";

const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DIAS  = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];

function getKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export default function Calendario({ usuarioId }) {
  const hoy = new Date();
  const [mes,  setMes]  = useState(hoy.getMonth());
  const [año,  setAño]  = useState(hoy.getFullYear());
  const [entradas, setEntradas] = useState({});
  const [token, setToken] = useState("");

  const [modalDetalle,  setModalDetalle]  = useState(null);
  const [modalAgregar,  setModalAgregar]  = useState(null);
  const [modalCloset,   setModalCloset]   = useState(null);
  const [showUpload,    setShowUpload]    = useState(false);
  const [fechaUpload,   setFechaUpload]   = useState(null);
  const [prendas,       setPrendas]       = useState([]);
  const [loadingCloset, setLoadingCloset] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) =>
      setToken(data?.session?.access_token || "")
    );
  }, []);

  const fetchEntradas = useCallback(async () => {
    if (!usuarioId) return;
    try {
      const res = await axios.get(`${API_URL}/api/calendario`, {
        params: { usuario_id: usuarioId, year: año, month: mes + 1 },
      });
      const map = {};
      (res.data || []).forEach(e => { map[e.fecha] = e; });
      setEntradas(map);
    } catch (err) {
      console.error("Error cargando calendario:", err);
    }
  }, [usuarioId, año, mes]);

  useEffect(() => { fetchEntradas(); }, [fetchEntradas]);

  async function fetchPrendas() {
    setLoadingCloset(true);
    try {
      const res = await axios.get(`${API_URL}/api/prendas`, {
        params: { usuario_id: usuarioId },
      });
      setPrendas(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCloset(false);
    }
  }

  async function guardar(fecha, prenda) {
    try {
      await axios.post(`${API_URL}/api/calendario`, {
        fecha,
        imagen_url: prenda.imagen_url,
        descripcion: prenda.descripcion,
        metadata: prenda.metadata_ia || {},
      }, { headers: { Authorization: `Bearer ${token}` } });
      await fetchEntradas();
    } catch (err) {
      console.error(err);
    }
  }

  async function eliminar(id) {
    try {
      await axios.delete(`${API_URL}/api/calendario/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchEntradas();
      setModalDetalle(null);
    } catch (err) {
      console.error(err);
    }
  }

  function navMes(dir) {
    const d = new Date(año, mes + dir, 1);
    setMes(d.getMonth());
    setAño(d.getFullYear());
  }

  const primerDia  = new Date(año, mes, 1).getDay();
  const diasEnMes  = new Date(año, mes + 1, 0).getDate();
  const celdas     = [];
  for (let i = 0; i < primerDia; i++) celdas.push(null);
  for (let d = 1; d <= diasEnMes; d++) celdas.push(d);

  const esHoy = (dia) =>
    dia === hoy.getDate() && mes === hoy.getMonth() && año === hoy.getFullYear();

  return (
    <div className="cal-container">
      <header className="cal-header">
        <h1>📅 Calendario de Outfits</h1>
        <p>Planifica tu estilo semana a semana</p>
      </header>

      <div className="cal-nav">
        <button onClick={() => navMes(-1)} className="cal-nav-btn">‹</button>
        <h2>{MESES[mes]} {año}</h2>
        <button onClick={() => navMes(1)} className="cal-nav-btn">›</button>
      </div>

      <div className="cal-grid">
        {DIAS.map(d => <div key={d} className="cal-dia-header">{d}</div>)}

        {celdas.map((dia, i) => {
          if (!dia) return <div key={`e-${i}`} className="cal-celda vacia" />;
          const key    = getKey(año, mes, dia);
          const entrada = entradas[key];

          return (
            <div
              key={key}
              className={`cal-celda ${esHoy(dia) ? "hoy" : ""} ${entrada ? "tiene-outfit" : "clickable"}`}
              onClick={() => {
                if (entrada) {
                  setModalDetalle({ key, dia, ...entrada });
                } else {
                  setModalAgregar({ fecha: key, dia });
                  fetchPrendas();
                }
              }}
            >
              <span className="cal-numero">{dia}</span>
              {entrada ? (
                <div className="cal-outfit-preview">
                  <img src={entrada.imagen_url} alt={entrada.descripcion} />
                </div>
              ) : (
                <span className="cal-add-icon">+</span>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Modal detalle ── */}
      {modalDetalle && (
        <div className="cal-modal-overlay" onClick={() => setModalDetalle(null)}>
          <div className="cal-modal" onClick={e => e.stopPropagation()}>
            <button className="cal-modal-close" onClick={() => setModalDetalle(null)}>✕</button>
            <h3>
              {DIAS[new Date(año, mes, modalDetalle.dia).getDay()]} {modalDetalle.dia} de {MESES[mes]}
            </h3>
            <img src={modalDetalle.imagen_url} alt={modalDetalle.descripcion} className="cal-modal-img" />
            <p className="cal-modal-desc">{modalDetalle.descripcion}</p>
            <button className="cal-btn-eliminar" onClick={() => eliminar(modalDetalle.id)}>
              🗑️ Quitar outfit de este día
            </button>
          </div>
        </div>
      )}

      {/* ── Modal agregar — elegir método ── */}
      {modalAgregar && (
        <div className="cal-modal-overlay" onClick={() => setModalAgregar(null)}>
          <div className="cal-modal" onClick={e => e.stopPropagation()}>
            <button className="cal-modal-close" onClick={() => setModalAgregar(null)}>✕</button>
            <h3>
              {DIAS[new Date(año, mes, modalAgregar.dia).getDay()]} {modalAgregar.dia} de {MESES[mes]}
            </h3>
            <p className="cal-modal-desc">¿Qué quieres registrar para este día?</p>
            <div className="cal-agregar-opciones">
              <button
                className="cal-opcion-btn"
                onClick={() => { setModalCloset(modalAgregar); setModalAgregar(null); }}
              >
                <span className="cal-opcion-icon">👗</span>
                <span className="cal-opcion-label">Del closet</span>
                <span className="cal-opcion-sub">Elige una prenda que ya tienes</span>
              </button>
              <button
                className="cal-opcion-btn"
                onClick={() => {
                  setFechaUpload(modalAgregar.fecha);
                  setShowUpload(true);
                  setModalAgregar(null);
                }}
              >
                <span className="cal-opcion-icon">📸</span>
                <span className="cal-opcion-label">Subir nueva</span>
                <span className="cal-opcion-sub">Sube una foto y agrégala al día</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal closet picker ── */}
      {modalCloset && (
        <div className="cal-modal-overlay" onClick={() => setModalCloset(null)}>
          <div className="cal-modal cal-modal-wide" onClick={e => e.stopPropagation()}>
            <button className="cal-modal-close" onClick={() => setModalCloset(null)}>✕</button>
            <h3>Elige una prenda</h3>
            {loadingCloset ? (
              <div className="cal-closet-loading">Cargando closet...</div>
            ) : prendas.length === 0 ? (
              <p className="cal-modal-desc">No tienes prendas en tu closet aún.</p>
            ) : (
              <div className="cal-closet-grid">
                {prendas.map(p => (
                  <div
                    key={p.id}
                    className="cal-closet-item"
                    onClick={async () => {
                      await guardar(modalCloset.fecha, p);
                      setModalCloset(null);
                    }}
                  >
                    <img src={p.imagen_url} alt={p.descripcion} />
                    <span>{p.descripcion?.split(" - ")[0]}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Upload Modal ── */}
      {showUpload && (
        <UploadModal
          onClose={() => { setShowUpload(false); setFechaUpload(null); }}
          onUploaded={async () => {
            if (fechaUpload) {
              try {
                const res = await axios.get(`${API_URL}/api/prendas`, {
                  params: { usuario_id: usuarioId },
                });
                const ultima = res.data?.[0];
                if (ultima) await guardar(fechaUpload, ultima);
              } catch {}
            }
            setShowUpload(false);
            setFechaUpload(null);
          }}
        />
      )}
    </div>
  );
}
