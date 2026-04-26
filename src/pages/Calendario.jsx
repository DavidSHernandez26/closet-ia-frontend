import React, { useState, useEffect } from "react";
import "./Calendario.css";

const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DIAS  = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];

function formatKey(date) {
  return date.toISOString().split("T")[0];
}

export default function Calendario({ usuarioId }) {
  const STORAGE_KEY = `calendario_outfits_${usuarioId}`;

  const hoy = new Date();
  const [mes, setMes]         = useState(hoy.getMonth());
  const [año, setAño]         = useState(hoy.getFullYear());
  const [calendario, setCalendario] = useState({});
  const [modalDetalle, setModalDetalle] = useState(null);

  /* ── Cargar al montar o cuando cambia usuario ── */
  useEffect(() => {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
      setCalendario(data);
    } catch {
      setCalendario({});
    }
  }, [usuarioId]);

  function saveCalendario(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setCalendario(data);
  }

  /* ── Generar celdas del mes ── */
  const primerDia   = new Date(año, mes, 1).getDay();
  const diasEnMes   = new Date(año, mes + 1, 0).getDate();
  const celdas      = [];

  for (let i = 0; i < primerDia; i++) celdas.push(null);
  for (let d = 1; d <= diasEnMes; d++) celdas.push(d);

  function navMes(dir) {
    const nueva = new Date(año, mes + dir, 1);
    setMes(nueva.getMonth());
    setAño(nueva.getFullYear());
  }

  function getKeyDia(dia) {
    return formatKey(new Date(año, mes, dia));
  }

  function eliminarDia(key) {
    const nuevo = { ...calendario };
    delete nuevo[key];
    saveCalendario(nuevo);
    setModalDetalle(null);
  }

  const esHoy = (dia) =>
    dia === hoy.getDate() &&
    mes === hoy.getMonth() &&
    año === hoy.getFullYear();

  return (
    <div className="cal-container">
      <header className="cal-header">
        <h1>📅 Calendario de Outfits</h1>
        <p>Planifica tu estilo semana a semana</p>
      </header>

      {/* ── Navegación ── */}
      <div className="cal-nav">
        <button onClick={() => navMes(-1)} className="cal-nav-btn">‹</button>
        <h2>{MESES[mes]} {año}</h2>
        <button onClick={() => navMes(1)} className="cal-nav-btn">›</button>
      </div>

      {/* ── Días de la semana ── */}
      <div className="cal-grid">
        {DIAS.map((d) => (
          <div key={d} className="cal-dia-header">{d}</div>
        ))}

        {celdas.map((dia, i) => {
          if (!dia) return <div key={`empty-${i}`} className="cal-celda vacia" />;

          const key        = getKeyDia(dia);
          const outfitDia  = calendario[key];
          const hoyClass   = esHoy(dia) ? "hoy" : "";

          return (
            <div
              key={key}
              className={`cal-celda ${hoyClass} ${outfitDia ? "tiene-outfit" : ""}`}
              onClick={() => outfitDia ? setModalDetalle({ key, dia, ...outfitDia }) : null}
            >
              <span className="cal-numero">{dia}</span>

              {outfitDia && (
                <div className="cal-outfit-preview">
                  <img src={outfitDia.imagen_url} alt={outfitDia.descripcion} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Modal detalle ── */}
      {modalDetalle && (
        <div className="cal-modal-overlay" onClick={() => setModalDetalle(null)}>
          <div className="cal-modal" onClick={(e) => e.stopPropagation()}>
            <button className="cal-modal-close" onClick={() => setModalDetalle(null)}>✕</button>

            <h3>
              {DIAS[new Date(año, mes, modalDetalle.dia).getDay()]} {modalDetalle.dia} de {MESES[mes]}
            </h3>

            <img
              src={modalDetalle.imagen_url}
              alt={modalDetalle.descripcion}
              className="cal-modal-img"
            />

            <p className="cal-modal-desc">{modalDetalle.descripcion}</p>

            {modalDetalle.prendas?.length > 0 && (
              <div className="cal-modal-prendas">
                {modalDetalle.prendas.map((p, i) => (
                  <span key={i} className="cal-chip">
                    {p.nombre} ({p.color})
                  </span>
                ))}
              </div>
            )}

            <button
              className="cal-btn-eliminar"
              onClick={() => eliminarDia(modalDetalle.key)}
            >
              🗑️ Quitar outfit de este día
            </button>
          </div>
        </div>
      )}
    </div>
  );
}