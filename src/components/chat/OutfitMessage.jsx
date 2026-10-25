import React from "react";
import { formatearHora } from "../../lib/chat/mensajes.mjs";

export default function OutfitMessage({ snapshot, ts, onOpen }) {
  const imagenes = snapshot?.guardado
    ? [snapshot.guardado]
    : (snapshot?.prendas ?? []).slice(0, 3);
  const hora = formatearHora(ts);
  return (
    <button type="button" className="wa-bubble wa-outfit assistant" onClick={onOpen}>
      <div className={`wa-outfit-grid ${snapshot?.guardado ? "single" : ""}`}>
        {imagenes.map((p, i) => (
          <div key={p.id ?? i} className="wa-outfit-thumb">
            {p.imagen_url && <img src={p.imagen_url} alt={p.descripcion || ""} loading="lazy" />}
          </div>
        ))}
      </div>
      <span className="wa-outfit-hint">Tócalo para verlo en el maniquí</span>
      {hora && <div className="wa-meta">{hora}</div>}
    </button>
  );
}
