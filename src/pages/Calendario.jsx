import React, { useState, useEffect, useCallback, useMemo } from "react";
import { getDaysInMonth, getDay } from "date-fns";
import { Shirt, Camera } from "lucide-react";
import "./Calendario.css";
import axios from "axios";
import { API_URL } from "../config";
import { supabase } from "../supabase";
import UploadModal from "../components/UploadModal";
import VirtualMannequin from "../components/VirtualMannequin";
import {
  CalendarProvider,
  CalendarDate,
  CalendarDatePagination,
  CalendarDatePicker,
  CalendarHeader,
  CalendarMonthPicker,
  CalendarYearPicker,
  useCalendarMonth,
  useCalendarYear,
} from "../components/kibo-ui/calendar/index.jsx";

const MESES     = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DIAS_LARGO = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];

function getKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getPrendas(entrada) {
  if (!entrada) return [];
  if (entrada.metadata?.outfit?.length > 0) return entrada.metadata.outfit;
  if (entrada.imagen_url) return [{ imagen_url: entrada.imagen_url, descripcion: entrada.descripcion }];
  return [];
}

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

/* Grid personalizado que usa los átomos de kibo-ui */
function OutfitCalendarBody({ entradas, onDiaClick }) {
  const [mes] = useCalendarMonth();
  const [año] = useCalendarYear();
  const hoy = new Date();

  const esHoy = (dia) =>
    dia === hoy.getDate() && mes === hoy.getMonth() && año === hoy.getFullYear();

  const firstDay    = getDay(new Date(año, mes, 1));
  const daysInMonth = getDaysInMonth(new Date(año, mes, 1));

  const celdas = [];
  for (let i = 0; i < firstDay; i++) celdas.push(null);
  for (let d = 1; d <= daysInMonth; d++) celdas.push(d);

  return (
    <div className="cal-grid">
      {celdas.map((dia, i) => {
        if (!dia) return <div key={`e-${i}`} className="cal-celda vacia" />;
        const key         = getKey(año, mes, dia);
        const entrada     = entradas[key];
        const prendasEntry = getPrendas(entrada);

        return (
          <div
            key={key}
            className={`cal-celda ${esHoy(dia) ? "hoy" : ""} ${entrada ? "tiene-outfit" : "clickable"}`}
            onClick={() => onDiaClick(dia, key, entrada)}
          >
            <span className="cal-numero">{dia}</span>
            {entrada
              ? <OutfitCollage prendas={prendasEntry} />
              : <span className="cal-add-icon">+</span>
            }
          </div>
        );
      })}
    </div>
  );
}

/* ── Wrapper que provee el contexto de kibo-ui ── */
export default function Calendario({ usuarioId }) {
  return (
    <CalendarProvider locale="es-ES" startDay={0}>
      <CalendarioContent usuarioId={usuarioId} />
    </CalendarProvider>
  );
}

/* ── Contenido real que consume los hooks de kibo-ui ── */
function CalendarioContent({ usuarioId }) {
  const [mes] = useCalendarMonth();
  const [año] = useCalendarYear();

  const [entradas,      setEntradas]      = useState({});
  const [token,         setToken]         = useState("");
  const [modalDetalle,  setModalDetalle]  = useState(null);
  const [modalOutfit,   setModalOutfit]   = useState(null);
  const [loadingOutfit, setLoadingOutfit] = useState(false);
  const [modalAgregar,  setModalAgregar]  = useState(null);
  const [modalCloset,   setModalCloset]   = useState(null);
  const [editandoEntrada, setEditandoEntrada] = useState(null);
  const [showUpload,    setShowUpload]    = useState(false);
  const [fechaUpload,   setFechaUpload]   = useState(null);
  const [prendas,       setPrendas]       = useState([]);
  const [loadingCloset, setLoadingCloset] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [vista,         setVista]         = useState("mes"); // "mes" | "semana"
  const [semanaOffset,  setSemanaOffset]  = useState(0);

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

    if (entrada.metadata?.outfit?.length > 0) {
      setModalOutfit(entrada.metadata.outfit);
      return;
    }
    const ids = entrada.metadata?.outfit_ids;
    if (ids?.length > 0) {
      setLoadingOutfit(true);
      try {
        const res = await axios.get(`${API_URL}/api/prendas`);
        const coincidentes = (res.data || []).filter(p => ids.includes(p.id));
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
    } catch (err) { console.error(err); }
    finally { setLoadingCloset(false); }
  }

  async function guardar(fecha, prenda) {
    try {
      await axios.post(`${API_URL}/api/calendario`, {
        fecha,
        imagen_url:  prenda.imagen_url,
        descripcion: prenda.descripcion,
        metadata:    prenda.metadata_ia || {},
      }, { headers: { Authorization: `Bearer ${token}` } });
      await fetchEntradas();
    } catch (err) { console.error(err); }
  }

  async function guardarEdicion(fecha, prenda) {
    /* Borra el anterior y guarda el nuevo */
    try {
      if (editandoEntrada?.id) {
        await axios.delete(`${API_URL}/api/calendario/${editandoEntrada.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      await guardar(fecha, prenda);
      setEditandoEntrada(null);
      setModalDetalle(null);
      setModalOutfit(null);
    } catch (err) { console.error(err); }
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
    } catch (err) { console.error(err); }
  }

  function handleDiaClick(dia, fecha, entrada) {
    if (entrada) {
      abrirDetalle(entrada, dia);
    } else {
      setModalAgregar({ fecha, dia });
      fetchPrendas();
    }
  }

  const diasConOutfit = Object.keys(entradas).length;

  /* ── Cálculo semana activa ── */
  const semanaActual = useMemo(() => {
    const hoy = new Date(año, mes, 1);
    const lunes = new Date(hoy);
    lunes.setDate(1 + semanaOffset * 7);
    /* ir al lunes de esa semana */
    const diaSemana = lunes.getDay();
    lunes.setDate(lunes.getDate() - (diaSemana === 0 ? 6 : diaSemana - 1));
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(lunes);
      d.setDate(lunes.getDate() + i);
      return d;
    });
  }, [año, mes, semanaOffset]);

  /* Título de semana para el header */
  const tituloSemana = useMemo(() => {
    if (!semanaActual.length) return "";
    const ini = semanaActual[0];
    const fin = semanaActual[6];
    if (ini.getMonth() === fin.getMonth()) {
      return `${ini.getDate()} – ${fin.getDate()} de ${MESES[ini.getMonth()]}`;
    }
    return `${ini.getDate()} ${MESES[ini.getMonth()].slice(0,3)} – ${fin.getDate()} ${MESES[fin.getMonth()].slice(0,3)}`;
  }, [semanaActual]);

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

      {/* ── Navegación kibo-ui + toggle de vista ── */}
      <div className="cal-kibo-nav">
        <CalendarDate>
          <CalendarDatePicker>
            <CalendarMonthPicker className="cal-kibo-picker" />
            <CalendarYearPicker  className="cal-kibo-picker" start={2024} end={2030} />
          </CalendarDatePicker>
          <div className="cal-nav-right">
            <div className="cal-vista-toggle">
              <button
                className={`cal-vista-btn ${vista === "mes" ? "active" : ""}`}
                onClick={() => setVista("mes")}
              >Mes</button>
              <button
                className={`cal-vista-btn ${vista === "semana" ? "active" : ""}`}
                onClick={() => { setVista("semana"); setSemanaOffset(0); }}
              >Semana</button>
            </div>
            <CalendarDatePagination className="cal-kibo-pagination" />
          </div>
        </CalendarDate>
      </div>

      {/* ── Vista semanal ── */}
      {vista === "semana" ? (
        <div className="cal-semana-wrap">
          <div className="cal-semana-nav">
            <button className="cal-semana-btn" onClick={() => setSemanaOffset(o => o - 1)}>‹</button>
            <span className="cal-semana-titulo">{tituloSemana}</span>
            <button className="cal-semana-btn" onClick={() => setSemanaOffset(o => o + 1)}>›</button>
          </div>
          <div className="cal-semana-grid">
            {semanaActual.map(fecha => {
              const hoy = new Date();
              const esHoy = fecha.toDateString() === hoy.toDateString();
              const key = getKey(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
              const entrada = entradas[key];
              const prendas = getPrendas(entrada);
              return (
                <div
                  key={key}
                  className={`cal-semana-dia ${esHoy ? "hoy" : ""} ${entrada ? "tiene-outfit" : "clickable"}`}
                  onClick={() => handleDiaClick(fecha.getDate(), key, entrada)}
                >
                  <span className="cal-semana-dow">{DIAS_LARGO[fecha.getDay()].slice(0,3)}</span>
                  <span className="cal-semana-num">{fecha.getDate()}</span>
                  {entrada
                    ? <OutfitCollage prendas={prendas} />
                    : <span className="cal-add-icon">+</span>
                  }
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <>
          {/* ── Cabecera de días ── */}
          <CalendarHeader className="cal-kibo-header" />
          {/* ── Grid mensual con outfits ── */}
          <OutfitCalendarBody entradas={entradas} onDiaClick={handleDiaClick} />
        </>
      )}

      {/* ── Modal detalle ── */}
      {modalDetalle && (() => {
        const diasSem = DIAS_LARGO[new Date(año, mes, modalDetalle.dia).getDay()];
        const chips   = modalDetalle.metadata?.prendas || [];

        return (
          <div className="cal-modal-overlay" onClick={() => { setModalDetalle(null); setModalOutfit(null); setConfirmDelete(false); }}>
            <div className="cal-modal cal-modal-detalle" onClick={e => e.stopPropagation()}>
              <button className="cal-modal-close" onClick={() => { setModalDetalle(null); setModalOutfit(null); setConfirmDelete(false); }}>✕</button>

              <div className="cal-detalle-fecha">
                <span className="cal-detalle-dia-semana">{diasSem}</span>
                <span className="cal-detalle-dia-num">{modalDetalle.dia}</span>
                <span className="cal-detalle-mes">{MESES[mes]}</span>
              </div>

              {loadingOutfit ? (
                <div className="cal-outfit-loading">
                  <span className="cal-loading-dot" /><span className="cal-loading-dot" /><span className="cal-loading-dot" />
                </div>
              ) : modalOutfit?.length > 0 ? (
                <div className="cal-mannequin-wrap">
                  <VirtualMannequin outfit={modalOutfit} />
                </div>
              ) : (
                <img src={modalDetalle.imagen_url} alt={modalDetalle.descripcion} className="cal-modal-img" />
              )}

              {!modalOutfit?.length && (chips.length > 0 ? (
                <div className="cal-modal-prendas">
                  {chips.map((pr, i) => (
                    <span key={i} className="cal-chip">{pr.nombre} · {pr.color}</span>
                  ))}
                </div>
              ) : modalDetalle.descripcion ? (
                <div className="cal-modal-prendas">
                  {modalDetalle.descripcion.split(",").map(s => s.trim()).filter(Boolean)
                    .map((parte, i) => <span key={i} className="cal-chip">{parte}</span>)}
                </div>
              ) : null)}

              <div className="cal-detalle-acciones">
                <button
                  className="cal-btn-editar"
                  onClick={() => {
                    setEditandoEntrada(modalDetalle);
                    setModalCloset({ fecha: modalDetalle.fecha || getKey(año, mes, modalDetalle.dia), dia: modalDetalle.dia, editar: true });
                    setModalDetalle(null);
                    setModalOutfit(null);
                    fetchPrendas();
                  }}
                >
                  ✏ Editar outfit
                </button>
                {confirmDelete ? (
                  <div className="cal-confirm-delete">
                    <p>¿Quitar outfit de este día?</p>
                    <div className="cal-confirm-btns">
                      <button className="cal-btn-cancelar-del" onClick={() => setConfirmDelete(false)}>Cancelar</button>
                      <button className="cal-btn-eliminar"     onClick={() => eliminar(modalDetalle.id)}>Sí, quitar</button>
                    </div>
                  </div>
                ) : (
                  <button className="cal-btn-eliminar-ghost" onClick={() => setConfirmDelete(true)}>Quitar outfit</button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Modal agregar ── */}
      {modalAgregar && (
        <div className="cal-modal-overlay" onClick={() => setModalAgregar(null)}>
          <div className="cal-modal" onClick={e => e.stopPropagation()}>
            <button className="cal-modal-close" onClick={() => setModalAgregar(null)}>✕</button>
            <h3>{DIAS_LARGO[new Date(año, mes, modalAgregar.dia).getDay()]} {modalAgregar.dia} de {MESES[mes]}</h3>
            <p className="cal-modal-desc">¿Qué quieres registrar para este día?</p>
            <div className="cal-agregar-opciones">
              <button className="cal-opcion-btn" onClick={() => { setModalCloset(modalAgregar); setModalAgregar(null); }}>
                <Shirt size={22} className="cal-opcion-icon" />
                <span className="cal-opcion-label">Del closet</span>
                <span className="cal-opcion-sub">Elige una prenda que ya tienes</span>
              </button>
              <button className="cal-opcion-btn" onClick={() => { setFechaUpload(modalAgregar.fecha); setShowUpload(true); setModalAgregar(null); }}>
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
                  <div key={p.id} className="cal-closet-item" onClick={async () => {
                    if (modalCloset.editar) {
                      await guardarEdicion(modalCloset.fecha, p);
                    } else {
                      await guardar(modalCloset.fecha, p);
                    }
                    setModalCloset(null);
                  }}>
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
