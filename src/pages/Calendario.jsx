import React, { useState, useEffect, useCallback } from "react";
import { Shirt, Camera } from "lucide-react";
import "./Calendario.css";
import axios from "axios";
import { API_URL } from "../config";
import { supabase } from "../supabase";
import UploadModal from "../components/UploadModal";
import VirtualMannequin from "../components/VirtualMannequin";

const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DIAS  = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
const DIAS_LARGO = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];

function getKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/* Devuelve array de { imagen_url, descripcion } para mostrar en una entrada */
function getPrendas(entrada) {
  if (!entrada) return [];
  if (entrada.metadata?.outfit?.length > 0) return entrada.metadata.outfit;
  if (entrada.imagen_url) return [{ imagen_url: entrada.imagen_url, descripcion: entrada.descripcion }];
  return [];
}

/* Collage de hasta 3 imágenes en la celda */
function OutfitCollage({ prendas }) {
  const items = prendas.slice(0, 3);
  if (items.length === 0) return null;
  if (items.length === 1) {
    return (
      <div className="cal-collage cal-collage-1">
        <img src={items[0].imagen_url} alt="" />
      </div>
    );
  }
  if (items.length === 2) {
    return (
      <div className="cal-collage cal-collage-2">
        <img src={items[0].imagen_url} alt="" />
        <img src={items[1].imagen_url} alt="" />
      </div>
    );
  }
  return (
    <div className="cal-collage cal-collage-3">
      <img src={items[0].imagen_url} alt="" className="cal-collage-main" />
      <div className="cal-collage-side">
        <img src={items[1].imagen_url} alt="" />
        <img src={items[2].imagen_url} alt="" />
      </div>
    </div>
  );
}

export default function Calendario({ usuarioId }) {
  const hoy = new Date();
  const [mes,  setMes]  = useState(hoy.getMonth());
  const [año,  setAño]  = useState(hoy.getFullYear());
  const [entradas, setEntradas] = useState({});
  const [token, setToken] = useState("");

  const [modalDetalle,  setModalDetalle]  = useState(null);
  const [modalOutfit,   setModalOutfit]   = useState(null);   // prendas para VirtualMannequin
  const [loadingOutfit, setLoadingOutfit] = useState(false);
  const [modalAgregar,  setModalAgregar]  = useState(null);
  const [modalCloset,   setModalCloset]   = useState(null);
  const [showUpload,    setShowUpload]    = useState(false);
  const [fechaUpload,   setFechaUpload]   = useState(null);
  const [prendas,       setPrendas]       = useState([]);
  const [loadingCloset, setLoadingCloset] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

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

  async function abrirDetalle(entrada, dia) {
    setModalDetalle({ dia, ...entrada });
    setConfirmDelete(false);
    setModalOutfit(null);

    // 1. Tiene metadata.outfit con imágenes → usarlo directo
    if (entrada.metadata?.outfit?.length > 0) {
      setModalOutfit(entrada.metadata.outfit);
      return;
    }

    // 2. Tiene outfit_ids → buscar prendas del closet por ID
    const ids = entrada.metadata?.outfit_ids;
    if (ids?.length > 0) {
      setLoadingOutfit(true);
      try {
        const res = await axios.get(`${API_URL}/api/prendas`);
        const todas = res.data || [];
        const coincidentes = todas.filter(p => ids.includes(p.id));
        if (coincidentes.length > 0) setModalOutfit(coincidentes);
      } catch {}
      finally { setLoadingOutfit(false); }
    }
  }

  async function fetchPrendas() {
    setLoadingCloset(true);
    try {
      const res = await axios.get(`${API_URL}/api/prendas`);
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
      setModalOutfit(null);
      setConfirmDelete(false);
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

  /* Número de días con outfit este mes */
  const diasConOutfit = Object.keys(entradas).length;

  return (
    <div className="cal-container">
      <header className="cal-header">
        <h1>Calendario de Outfits</h1>
        <p>
          {diasConOutfit > 0
            ? `${diasConOutfit} outfit${diasConOutfit > 1 ? "s" : ""} planeado${diasConOutfit > 1 ? "s" : ""} este mes`
            : "Planifica tu estilo semana a semana"}
        </p>
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
          const key     = getKey(año, mes, dia);
          const entrada = entradas[key];
          const prendasEntry = getPrendas(entrada);

          return (
            <div
              key={key}
              className={`cal-celda ${esHoy(dia) ? "hoy" : ""} ${entrada ? "tiene-outfit" : "clickable"}`}
              onClick={() => {
                if (entrada) {
                  abrirDetalle(entrada, dia);
                } else {
                  setModalAgregar({ fecha: key, dia });
                  fetchPrendas();
                }
              }}
            >
              <span className="cal-numero">{dia}</span>
              {entrada ? (
                <OutfitCollage prendas={prendasEntry} />
              ) : (
                <span className="cal-add-icon">+</span>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Modal detalle ── */}
      {modalDetalle && (() => {
        const diasSem = DIAS_LARGO[new Date(año, mes, modalDetalle.dia).getDay()];
        const chips = modalDetalle.metadata?.prendas || [];

        return (
          <div className="cal-modal-overlay" onClick={() => { setModalDetalle(null); setModalOutfit(null); setConfirmDelete(false); }}>
            <div className="cal-modal cal-modal-detalle" onClick={e => e.stopPropagation()}>
              <button className="cal-modal-close" onClick={() => { setModalDetalle(null); setModalOutfit(null); setConfirmDelete(false); }}>✕</button>

              {/* Cabecera fecha */}
              <div className="cal-detalle-fecha">
                <span className="cal-detalle-dia-semana">{diasSem}</span>
                <span className="cal-detalle-dia-num">{modalDetalle.dia}</span>
                <span className="cal-detalle-mes">{MESES[mes]}</span>
              </div>

              {/* Outfit visual */}
              {loadingOutfit ? (
                <div className="cal-outfit-loading">
                  <span className="cal-loading-dot" /><span className="cal-loading-dot" /><span className="cal-loading-dot" />
                </div>
              ) : modalOutfit?.length > 0 ? (
                /* Maniquí virtual con todas las prendas */
                <div className="cal-mannequin-wrap">
                  <VirtualMannequin outfit={modalOutfit} />
                </div>
              ) : (
                /* Fallback: imagen única */
                <img
                  src={modalDetalle.imagen_url}
                  alt={modalDetalle.descripcion}
                  className="cal-modal-img"
                />
              )}

              {/* Chips: metadata.prendas (outfit IA) o descripción parseada */}
              {!modalOutfit?.length && (chips.length > 0 ? (
                <div className="cal-modal-prendas">
                  {chips.map((pr, i) => (
                    <span key={i} className="cal-chip">{pr.nombre} · {pr.color}</span>
                  ))}
                </div>
              ) : modalDetalle.descripcion ? (
                <div className="cal-modal-prendas">
                  {modalDetalle.descripcion
                    .split(",").map(s => s.trim()).filter(Boolean)
                    .map((parte, i) => <span key={i} className="cal-chip">{parte}</span>)}
                </div>
              ) : null)}

              {/* Acciones */}
              {confirmDelete ? (
                <div className="cal-confirm-delete">
                  <p>¿Quitar outfit de este día?</p>
                  <div className="cal-confirm-btns">
                    <button className="cal-btn-cancelar-del" onClick={() => setConfirmDelete(false)}>
                      Cancelar
                    </button>
                    <button className="cal-btn-eliminar" onClick={() => eliminar(modalDetalle.id)}>
                      Sí, quitar
                    </button>
                  </div>
                </div>
              ) : (
                <button className="cal-btn-eliminar-ghost" onClick={() => setConfirmDelete(true)}>
                  Quitar outfit
                </button>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── Modal agregar — elegir método ── */}
      {modalAgregar && (
        <div className="cal-modal-overlay" onClick={() => setModalAgregar(null)}>
          <div className="cal-modal" onClick={e => e.stopPropagation()}>
            <button className="cal-modal-close" onClick={() => setModalAgregar(null)}>✕</button>
            <h3>
              {DIAS_LARGO[new Date(año, mes, modalAgregar.dia).getDay()]} {modalAgregar.dia} de {MESES[mes]}
            </h3>
            <p className="cal-modal-desc">¿Qué quieres registrar para este día?</p>
            <div className="cal-agregar-opciones">
              <button
                className="cal-opcion-btn"
                onClick={() => { setModalCloset(modalAgregar); setModalAgregar(null); }}
              >
                <Shirt size={22} className="cal-opcion-icon" />
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
                <Camera size={22} className="cal-opcion-icon" />
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
                const res = await axios.get(`${API_URL}/api/prendas`);
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
