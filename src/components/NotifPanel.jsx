import React, { useState, useRef, useEffect } from "react";
import "./UploadModal.css";

/**
 * UploadModal — Be: Confident
 * Soporta: prenda individual / outfit completo
 * Drag & drop + preview + flujo paso 1 (tipo) → paso 2 (subir)
 *
 * Props:
 *   onClose()
 *   onUploaded(file, type)   // file: File, type: "prenda" | "outfit"
 */
export default function UploadModal({ onClose, onUploaded }) {
  const [step, setStep] = useState(1);          // 1 = elegir tipo, 2 = subir archivo
  const [type, setType] = useState(null);       // "prenda" | "outfit"
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  // Cerrar con Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Cleanup preview URL
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const pickType = (t) => {
    setType(t);
    setStep(2);
  };

  const handleFile = (f) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      alert("Por favor sube una imagen (.jpg, .png, .webp)");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      alert("La imagen debe pesar menos de 10MB");
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  const onSubmit = async () => {
    if (!file) return;
    setUploading(true);
    try {
      // Espera a que el padre maneje la subida real (Supabase, etc.)
      await onUploaded?.(file, type);
    } finally {
      setUploading(false);
    }
  };

  const reset = () => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
  };

  return (
    <div className="up-overlay" onClick={onClose}>
      <div className="up-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        {/* ── Header ── */}
        <header className="up-header">
          <div className="up-header-left">
            <span className="up-traffic">
              <span className="up-light up-light-r" />
              <span className="up-light up-light-y" />
              <span className="up-light up-light-g" />
            </span>
          </div>
          <div className="up-step-indicator">
            <span className={`up-step ${step >= 1 ? "active" : ""}`}>
              <span className="up-step-num">1</span>
              <span className="up-step-label">Tipo</span>
            </span>
            <span className="up-step-bar"><span className={`up-step-fill ${step >= 2 ? "full" : ""}`} /></span>
            <span className={`up-step ${step >= 2 ? "active" : ""}`}>
              <span className="up-step-num">2</span>
              <span className="up-step-label">Imagen</span>
            </span>
          </div>
          <button className="up-close" onClick={onClose} aria-label="Cerrar">✕</button>
        </header>

        {/* ── Body ── */}
        <div className="up-body">
          {step === 1 && (
            <div className="up-step-1">
              <h2 className="up-title">Subir al closet</h2>
              <p className="up-sub">
                ¿Qué quieres que la IA analice? Selecciona una opción para continuar.
              </p>

              <div className="up-type-grid">
                <button
                  className="up-type-card"
                  onClick={() => pickType("prenda")}
                >
                  <div className="up-type-icon up-type-icon-lilac">
                    <span className="up-type-emoji">👕</span>
                    <span className="up-type-glow" />
                  </div>
                  <div className="up-type-text">
                    <h3>Prenda individual</h3>
                    <p>Una sola pieza · la IA detecta categoría, color y estilo</p>
                  </div>
                  <span className="up-arrow">→</span>
                </button>

                <button
                  className="up-type-card"
                  onClick={() => pickType("outfit")}
                >
                  <div className="up-type-icon up-type-icon-sage">
                    <span className="up-type-emoji">🧥</span>
                    <span className="up-type-glow" />
                  </div>
                  <div className="up-type-text">
                    <h3>Outfit completo</h3>
                    <p>Look entero · la IA separa cada prenda en tu closet</p>
                  </div>
                  <span className="up-arrow">→</span>
                </button>
              </div>

              <div className="up-tip">
                <span className="up-tip-dot" />
                <span>Funciona mejor con fondo claro y la prenda extendida</span>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="up-step-2">
              <h2 className="up-title">
                {type === "prenda" ? "Subir prenda" : "Subir outfit"}
              </h2>
              <p className="up-sub">
                {type === "prenda"
                  ? "Foto de una sola prenda — la IA la categorizará."
                  : "Foto del look completo — la IA detectará cada pieza."}
              </p>

              {!preview ? (
                <label
                  className={`up-drop ${dragActive ? "drag" : ""}`}
                  onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={onDrop}
                >
                  <input
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFile(e.target.files?.[0])}
                    hidden
                  />
                  <div className="up-drop-icon">
                    <span>📸</span>
                    <span className="up-drop-pulse" />
                  </div>
                  <h3 className="up-drop-title">Arrastra una imagen aquí</h3>
                  <p className="up-drop-sub">o haz click para seleccionar · JPG / PNG / WEBP · máx 10MB</p>
                  <span className="up-drop-cta">Seleccionar archivo</span>
                </label>
              ) : (
                <div className="up-preview-wrap">
                  <div className="up-preview">
                    <img src={preview} alt="Preview" />
                    <button className="up-preview-clear" onClick={reset} title="Cambiar">↻</button>
                  </div>
                  <div className="up-preview-meta">
                    <div className="up-preview-name">{file.name}</div>
                    <div className="up-preview-size">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <footer className="up-footer">
          {step === 2 && (
            <button className="up-btn up-btn-ghost" onClick={() => setStep(1)} disabled={uploading}>
              ← Atrás
            </button>
          )}
          <span style={{ flex: 1 }} />
          {step === 2 && (
            <button
              className="up-btn up-btn-primary"
              onClick={onSubmit}
              disabled={!file || uploading}
            >
              {uploading ? <span className="up-spinner" /> : "Subir y analizar →"}
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
