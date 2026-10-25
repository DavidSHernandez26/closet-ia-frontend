// Lógica pura de mensajes del chat del asistente (sin React).

const pickPrenda = (p) => ({ id: p.id, imagen_url: p.imagen_url, descripcion: p.descripcion });

// Snapshot del outfit para guardarlo dentro de un mensaje.
// Si hay outfit guardado, tiene prioridad. Sin outfit ni guardado devuelve null.
// Del outfit guardado se conserva solo metadata_ia.prendas (las etiquetas del pop up).
export function snapshotOutfit({ outfit, outfitGuardado } = {}) {
  if (outfitGuardado) {
    const guardado = pickPrenda(outfitGuardado);
    const prendas = outfitGuardado.metadata_ia?.prendas;
    if (Array.isArray(prendas)) guardado.metadata_ia = { prendas };
    return { guardado };
  }
  const validas = Array.isArray(outfit) ? outfit.filter(Boolean) : [];
  if (validas.length > 0) return { prendas: validas.map(pickPrenda) };
  return null;
}

// Inverso de snapshotOutfit: devuelve el estado del outfit a partir del snapshot.
export function restaurarOutfit(snapshot) {
  if (snapshot?.guardado) {
    return { outfit: [], outfitIds: [], outfitGuardado: snapshot.guardado };
  }
  const prendas = snapshot?.prendas ?? [];
  return { outfit: prendas, outfitIds: prendas.map((p) => p.id), outfitGuardado: null };
}

export function crearMensaje(role, text, { ts = Date.now(), outfit = null } = {}) {
  const msg = { role, text, ts };
  if (outfit !== null) msg.outfit = outfit;
  return msg;
}

const indiceStreaming = (mensajes) => mensajes.findLastIndex((m) => m?.streaming);

// Pone `texto` en el mensaje que está en streaming (no necesariamente el último).
export function aplicarFragmento(mensajes, texto) {
  const i = indiceStreaming(mensajes);
  if (i < 0) return mensajes;
  return mensajes.map((msg, j) => (j === i ? { ...msg, text: texto } : msg));
}

// Termina el stream: quita `streaming` del mensaje en streaming y, si hay snapshot,
// inserta el mensaje de outfit justo después (o al final si no hay mensaje en streaming).
export function terminarStream(mensajes, snapshot, ts = Date.now()) {
  const i = indiceStreaming(mensajes);
  if (i < 0 && !snapshot) return mensajes;
  const next = [...mensajes];
  if (i >= 0) {
    const { streaming, ...resto } = next[i];
    next[i] = resto;
  }
  if (snapshot) next.splice(i >= 0 ? i + 1 : next.length, 0, crearMensaje("assistant", "", { ts, outfit: snapshot }));
  return next;
}

export function formatearHora(ts, locale) {
  if (typeof ts !== "number" || !Number.isFinite(ts)) return "";
  return new Date(ts).toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });
}

const inicioDelDia = (fecha) => {
  const d = new Date(fecha);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

export function etiquetaDia(ts, ahora = Date.now(), locale) {
  const dia = inicioDelDia(ts);
  const hoy = inicioDelDia(ahora);
  if (dia === hoy) return "Hoy";
  const ayerDate = new Date(ahora);
  ayerDate.setDate(ayerDate.getDate() - 1);
  if (dia === inicioDelDia(ayerDate)) return "Ayer";
  return new Date(ts).toLocaleDateString(locale, { day: "numeric", month: "long" });
}

// Intercala separadores de día. Mensajes sin ts no llevan separador.
export function agruparPorDia(mensajes, ahora = Date.now()) {
  const filas = [];
  let diaActual = null;
  mensajes.forEach((msg, index) => {
    if (typeof msg.ts === "number") {
      const dia = inicioDelDia(msg.ts);
      if (dia !== diaActual) {
        diaActual = dia;
        filas.push({ tipo: "dia", etiqueta: etiquetaDia(msg.ts, ahora), key: `dia-${dia}` });
      }
    }
    filas.push({ tipo: "msg", msg, index });
  });
  return filas;
}

// Reemplaza el snapshot del outfit del mensaje en `index` (copia inmutable).
export function actualizarSnapshot(mensajes, index, snapshot) {
  if (!mensajes[index]?.outfit) return mensajes;
  return mensajes.map((msg, i) => (i === index ? { ...msg, outfit: snapshot } : msg));
}

export function ultimoIndiceOutfit(mensajes) {
  for (let i = mensajes.length - 1; i >= 0; i--) {
    if (mensajes[i].outfit) return i;
  }
  return -1;
}

export function recortarHistorial(mensajes, max = 100) {
  return mensajes.slice(Math.max(0, mensajes.length - max));
}
