import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import VirtualMannequin from "../VirtualMannequin";
import TypingIndicator from "./TypingIndicator";
import { TRANS } from "../../lib/chat/movimiento";
import "./MannequinModal.css";

const FOCUSABLE = 'button:not([disabled]):not([tabindex="-1"]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

/**
 * Pop up del maniquí en escritorio. Pasos internos (derivados del estado del padre):
 * "maniqui" → "cambiar" (swap.tipo) | "calendario" (calendario.abierto).
 */
export default function MannequinModal({
  abierto,
  onClose,
  outfit = [],
  outfitGuardado = null,
  onPedirCambio,
  swap = {},
  calendario = {},
}) {
  const paso = swap.tipo ? "cambiar" : calendario.abierto ? "calendario" : "maniqui";

  const dialogRef = useRef(null);
  const closeRef  = useRef(null);
  const backRef   = useRef(null);
  const prevFocus = useRef(null);

  // Refs a lo último para el listener de teclado sin re-suscribirse en cada render
  const estado = useRef({});
  estado.current = { paso, onClose, swap, calendario };

  // Foco: guardar el elemento previo al abrir y devolverlo al cerrar
  useEffect(() => {
    if (!abierto) return;
    prevFocus.current = document.activeElement;
    return () => {
      const el = prevFocus.current;
      if (el && el.isConnected && typeof el.focus === "function") el.focus();
    };
  }, [abierto]);

  // Al abrir o cambiar de paso, mover el foco dentro del pop up
  useEffect(() => {
    if (!abierto) return;
    const el = paso === "maniqui" ? closeRef.current : backRef.current;
    (el || dialogRef.current)?.focus();
  }, [abierto, paso]);

  // Escape (primero el paso interno, luego el pop up) y Tab atrapado dentro
  useEffect(() => {
    if (!abierto) return;
    function onKey(e) {
      const dialog = dialogRef.current;
      if (!dialog) return;
      const { paso, onClose, swap, calendario } = estado.current;
      if (e.key === "Escape") {
        // Si hay una confirmación de prenda abierta, la cierra VirtualMannequin
        if (dialog.querySelector("[data-mm-confirm]")) return;
        e.preventDefault();
        if (paso === "cambiar") swap.onVolver?.();
        else if (paso === "calendario") calendario.onVolver?.();
        else onClose?.();
        return;
      }
      if (e.key === "Tab") {
        const items = [...dialog.querySelectorAll(FOCUSABLE)].filter((n) => n.offsetParent !== null);
        if (items.length === 0) { e.preventDefault(); dialog.focus(); return; }
        const first = items[0];
        const last  = items[items.length - 1];
        if (e.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
          e.preventDefault(); last.focus();
        } else if (!e.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
          e.preventDefault(); first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [abierto]);

  const tieneOutfit = outfit.length > 0 || !!outfitGuardado;

  const titulo = paso === "cambiar"
    ? `Cambiar ${swap.etiqueta || swap.tipo}`
    : paso === "calendario"
      ? "Agregar al calendario"
      : "Tu outfit";

  return (
    <AnimatePresence>
      {abierto && (
        <motion.div
          key="mm-modal"
          className="mm-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={TRANS.popup}
          onClick={onClose}
        >
          <motion.div
            ref={dialogRef}
            className="mm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mm-modal-titulo"
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={TRANS.popup}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mm-modal-header">
              {paso !== "maniqui" ? (
                <button
                  ref={backRef}
                  type="button"
                  className="mm-modal-back"
                  onClick={paso === "cambiar" ? swap.onVolver : calendario.onVolver}
                >
                  ← Volver
                </button>
              ) : <span className="mm-modal-header-spacer" />}
              <h3 id="mm-modal-titulo" className="mm-modal-titulo">{titulo}</h3>
              <button
                ref={closeRef}
                type="button"
                className="mm-modal-close"
                onClick={onClose}
                aria-label="Cerrar"
              >
                <X size={16} />
              </button>
            </div>

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={paso}
                className="mm-modal-body"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={TRANS.aparecer}
              >
                {paso === "maniqui" && (
                  <>
                    {outfitGuardado ? (
                      <div className="outfit-guardado-preview">
                        <img src={outfitGuardado.imagen_url} alt={outfitGuardado.descripcion} loading="lazy" />
                        <p>{outfitGuardado.descripcion}</p>
                        {outfitGuardado.metadata_ia?.prendas?.length > 0 && (
                          <div className="outfit-guardado-prendas">
                            {outfitGuardado.metadata_ia.prendas.map((pr, i) => (
                              <span key={i} className="outfit-guardado-chip">
                                {pr.nombre} ({pr.color})
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : outfit.length > 0 ? (
                      <>
                        <VirtualMannequin outfit={outfit} onSwap={onPedirCambio} confirmarCambio />
                        <p className="mm-modal-hint">Toca una prenda para cambiarla por algo de tu closet</p>
                      </>
                    ) : (
                      <p className="mm-modal-hint">Este outfit ya no está disponible.</p>
                    )}

                    {tieneOutfit && (
                      <div className="mm-modal-footer">
                        {calendario.confirmado ? (
                          <span className="mm-modal-cal-ok">✅ Guardado en el calendario</span>
                        ) : (
                          <button type="button" className="mm-modal-cal-btn" onClick={calendario.onAbrir}>
                            📅 Guardar en calendario
                          </button>
                        )}
                      </div>
                    )}
                  </>
                )}

                {paso === "cambiar" && (
                  <>
                    <p className="mm-modal-sub">Solo se muestran prendas de esta categoría</p>
                    {swap.loading ? (
                      <div className="swap-loading"><TypingIndicator bare /></div>
                    ) : !swap.prendas?.length ? (
                      <p className="swap-empty">No tienes {swap.etiqueta || swap.tipo} en tu closet.</p>
                    ) : (
                      <div className="swap-grid">
                        {swap.prendas.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            className="swap-item mm-swap-item"
                            onClick={() => swap.onElegir?.(p)}
                          >
                            <img src={p.imagen_url} alt={p.descripcion} loading="lazy" />
                            <span>{p.descripcion?.split(" - ")[0]}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {paso === "calendario" && (
                  <div className="mm-modal-cal">
                    <p className="mm-modal-sub">Selecciona el día en que usarás este outfit</p>
                    <input
                      type="date"
                      className="cal-picker-input"
                      value={calendario.fecha}
                      onChange={(e) => calendario.onFecha?.(e.target.value)}
                    />
                    <button type="button" className="cal-picker-confirm" onClick={calendario.onGuardar}>
                      Guardar outfit
                    </button>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
