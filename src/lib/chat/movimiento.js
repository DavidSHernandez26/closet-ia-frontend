// Transiciones compartidas del chat. Solo transform y opacity.
export const TRANS = {
  mensaje: { type: "spring", stiffness: 520, damping: 34, mass: 0.8 }, // ~250 ms
  aparecer: { duration: 0.18, ease: "easeOut" },
  popup: { duration: 0.22, ease: [0.2, 0.9, 0.3, 1] },
};
