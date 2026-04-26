import "./VirtualMannequin.css";

const POSICIONES = {
  "parte superior": { top: "8%", height: "38%" },
  "abrigo":         { top: "4%", height: "44%" },
  "accesorio":      { top: "0%", height: "18%" },
  "parte inferior": { top: "44%", height: "36%" },
  "calzado":        { top: "78%", height: "22%" },
};

function getTipo(descripcion = "") {
  const d = descripcion.toLowerCase();
  if (d.includes("abrigo") || d.includes("chaqueta") || d.includes("jacket") || d.includes("hoodie") || d.includes("sudadera")) return "abrigo";
  if (d.includes("gorra") || d.includes("cap") || d.includes("sombrero") || d.includes("accesorio")) return "accesorio";
  if (d.includes("superior") || d.includes("camiseta") || d.includes("camisa") || d.includes("polo") || d.includes("blusa")) return "parte superior";
  if (d.includes("inferior") || d.includes("pantalón") || d.includes("pantalon") || d.includes("jean") || d.includes("short") || d.includes("falda")) return "parte inferior";
  if (d.includes("calzado") || d.includes("tenis") || d.includes("zapato") || d.includes("bota") || d.includes("zapatilla") || d.includes("sandalia")) return "calzado";
  return "parte superior";
}

function getZIndex(tipo) {
  const z = { "accesorio": 5, "abrigo": 4, "parte superior": 3, "parte inferior": 2, "calzado": 1 };
  return z[tipo] || 2;
}

export default function VirtualMannequin({ outfit }) {
  if (!outfit || outfit.length === 0) return null;

  const prendas = outfit.map((p) => {
    const tipo = getTipo(p.descripcion || "");
    return { ...p, tipo, pos: POSICIONES[tipo] };
  });

  return (
    <div className="mannequin-wrapper">
      <div className="mannequin-container">

        {/* Silueta del maniquí */}
        <svg className="mannequin-silhouette" viewBox="0 0 120 320" xmlns="http://www.w3.org/2000/svg">
          {/* Cabeza */}
          <ellipse cx="60" cy="28" rx="18" ry="22" fill="rgba(196,181,232,0.06)" stroke="rgba(196,181,232,0.15)" strokeWidth="1"/>
          {/* Cuello */}
          <rect x="53" y="48" width="14" height="12" rx="4" fill="rgba(196,181,232,0.06)" stroke="rgba(196,181,232,0.15)" strokeWidth="1"/>
          {/* Torso */}
          <path d="M28 60 Q20 62 18 80 L18 160 Q18 168 26 170 L94 170 Q102 168 102 160 L102 80 Q100 62 92 60 L75 58 Q68 64 60 64 Q52 64 45 58 Z"
            fill="rgba(196,181,232,0.05)" stroke="rgba(196,181,232,0.15)" strokeWidth="1"/>
          {/* Brazo izq */}
          <path d="M18 80 Q8 85 6 110 L8 150 Q10 156 16 154 L20 110 Z"
            fill="rgba(196,181,232,0.04)" stroke="rgba(196,181,232,0.12)" strokeWidth="1"/>
          {/* Brazo der */}
          <path d="M102 80 Q112 85 114 110 L112 150 Q110 156 104 154 L100 110 Z"
            fill="rgba(196,181,232,0.04)" stroke="rgba(196,181,232,0.12)" strokeWidth="1"/>
          {/* Cadera */}
          <path d="M26 170 Q18 172 16 185 L20 230 L100 230 L104 185 Q102 172 94 170 Z"
            fill="rgba(196,181,232,0.05)" stroke="rgba(196,181,232,0.15)" strokeWidth="1"/>
          {/* Pierna izq */}
          <path d="M20 230 L24 310 Q26 318 36 318 Q44 318 46 310 L50 230 Z"
            fill="rgba(196,181,232,0.04)" stroke="rgba(196,181,232,0.12)" strokeWidth="1"/>
          {/* Pierna der */}
          <path d="M100 230 L96 310 Q94 318 84 318 Q76 318 74 310 L70 230 Z"
            fill="rgba(196,181,232,0.04)" stroke="rgba(196,181,232,0.12)" strokeWidth="1"/>
        </svg>

        {/* Prendas superpuestas */}
        <div className="mannequin-layers">
          {prendas.map((p) => (
            <div
              key={p.id}
              className="mannequin-prenda"
              style={{
                top: p.pos.top,
                height: p.pos.height,
                zIndex: getZIndex(p.tipo),
              }}
            >
              <img
                src={p.imagen_url}
                alt={p.descripcion}
                className="prenda-img"
              />
              <span className="prenda-label">{p.descripcion?.split(" - ")[0]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Lista de prendas del outfit */}
      <div className="outfit-lista">
        {prendas.map((p) => (
          <div key={p.id} className="outfit-chip">
            <img src={p.imagen_url} alt={p.descripcion} />
            <span>{p.descripcion?.split(" - ")[0]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}