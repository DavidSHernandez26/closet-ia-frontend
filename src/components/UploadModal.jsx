import React, { useState, useRef, useEffect } from "react";
import "./UploadModal.css";
import { supabase } from "../supabase";
import axios from "axios";
import { API_URL } from "../config";
import { useNativeCamera } from "../hooks/useNativeCamera";
import { haptics } from "../hooks/useHaptics";

async function comprimirImagen(file, maxWidth = 1200, quality = 0.82) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const ratio = Math.min(1, maxWidth / img.naturalWidth);
      const canvas = document.createElement("canvas");
      canvas.width  = Math.round(img.naturalWidth  * ratio);
      canvas.height = Math.round(img.naturalHeight * ratio);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => resolve(blob ? new File([blob], file.name.replace(/\.[^.]+$/, ".webp"), { type: "image/webp" }) : file),
        "image/webp",
        quality,
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

const ETAPAS = [
  { hasta: 20,  label: "📤 Subiendo imagen..." },
  { hasta: 65,  label: "✂️ Removiendo fondo..." },
  { hasta: 90,  label: "🧠 Analizando con IA..." },
  { hasta: 100, label: "✅ ¡Listo!" },
];

function etapaLabel(p) {
  return ETAPAS.find(e => p <= e.hasta)?.label || "✅ ¡Listo!";
}

export default function UploadModal({ onClose, onUploaded }) {
  const [step, setStep]           = useState(1);
  const [type, setType]           = useState(null);
  const [file, setFile]           = useState(null);
  const [preview, setPreview]     = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progreso, setProgreso]   = useState(0);
  const [mensajeIA, setMensajeIA] = useState("");
  const intervaloRef = useRef(null);
  const pickPhoto    = useNativeCamera();

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => () => clearInterval(intervaloRef.current), []);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  function iniciarProgreso() {
    setProgreso(0);
    intervaloRef.current = setInterval(() => {
      setProgreso(prev => {
        if (prev >= 90) { clearInterval(intervaloRef.current); return 90; }
        const inc = prev < 20 ? 4 : prev < 65 ? 0.8 : 0.3;
        return Math.min(prev + inc, 90);
      });
    }, 200);
  }

  function completarProgreso() {
    clearInterval(intervaloRef.current);
    setProgreso(100);
  }

  const pickType = (t) => { setType(t); setStep(2); };

  const handleFile = async (f) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) { alert("Por favor sube una imagen (.jpg, .png, .webp)"); return; }
    if (f.size > 10 * 1024 * 1024)   { alert("La imagen debe pesar menos de 10MB"); return; }
    const compressed = await comprimirImagen(f);
    if (preview) URL.revokeObjectURL(preview);
    setFile(compressed);
    setPreview(URL.createObjectURL(compressed));
    setMensajeIA("");
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  const handlePickPhoto = async () => {
    const f = await pickPhoto();
    if (f) handleFile(f);
  };

  const reset = () => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
  };

  async function onSubmit() {
    if (!file || !type) return;
    try {
      setUploading(true);
      setMensajeIA("");
      iniciarProgreso();

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Usuario no autenticado");

      const formData = new FormData();
      formData.append("imagen", file);
      formData.append("usuario_id", user.id);
      formData.append("tipo", type);
      formData.append("genero", "unisex");

      const res = await axios.post(`${API_URL}/api/subir-prenda`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      completarProgreso();
      haptics.success();
      setMensajeIA(res.data?.mensaje ? `✅ ${res.data.mensaje}` : "✅ Imagen analizada correctamente.");
      if (onUploaded) onUploaded();
      setTimeout(() => { reset(); setType(null); setStep(1); setProgreso(0); }, 1500);
    } catch (err) {
      console.error("❌ Error:", err);
      clearInterval(intervaloRef.current);
      setProgreso(0);
      setMensajeIA("⚠️ Ocurrió un error al subir o analizar la imagen.");
    } finally {
      setUploading(false);
    }
  }

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
            <span className="up-step-bar">
              <span className={`up-step-fill ${step >= 2 ? "full" : ""}`} />
            </span>
            <span className={`up-step ${step >= 2 ? "active" : ""}`}>
              <span className="up-step-num">2</span>
              <span className="up-step-label">Imagen</span>
            </span>
          </div>
          <button className="up-close" onClick={onClose} aria-label="Cerrar">✕</button>
        </header>

        {/* ── Body ── */}
        <div className="up-body">

          {/* Step 1 — elegir tipo */}
          {step === 1 && (
            <div className="up-step-1">
              <h2 className="up-title">Subir al closet</h2>
              <p className="up-sub">
                ¿Qué quieres que la IA analice? Selecciona una opción para continuar.
              </p>

              <div className="up-type-grid">
                <button className="up-type-card" onClick={() => pickType("prenda")}>
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

                <button className="up-type-card" onClick={() => pickType("outfit")}>
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

          {/* Step 2 — subir imagen */}
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
                <div
                  className={`up-drop ${dragActive ? "drag" : ""}`}
                  onClick={handlePickPhoto}
                  onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={onDrop}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && handlePickPhoto()}
                >
                  <div className="up-drop-icon">
                    <span>📸</span>
                    <span className="up-drop-pulse" />
                  </div>
                  <h3 className="up-drop-title">Arrastra una imagen aquí</h3>
                  <p className="up-drop-sub">o toca para seleccionar · JPG / PNG / WEBP · máx 10MB</p>
                  <span className="up-drop-cta">Seleccionar archivo</span>
                </div>
              ) : (
                <div className="up-preview-wrap">
                  <div className="up-preview">
                    <img src={preview} alt="Preview" />
                    <button
                      className="up-preview-clear"
                      onClick={reset}
                      title="Cambiar"
                      disabled={uploading}
                    >↻</button>
                  </div>
                  <div className="up-preview-meta">
                    <div className="up-preview-name">{file.name}</div>
                    <div className="up-preview-size">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
                  </div>
                </div>
              )}

              {uploading && (
                <div className="progress-wrap">
                  <div className="progress-header">
                    <span className="progress-label">{etapaLabel(progreso)}</span>
                    <span className="progress-pct">{Math.round(progreso)}%</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${progreso}%` }} />
                  </div>
                </div>
              )}

              {mensajeIA && <p className="mensaje-ia">{mensajeIA}</p>}
            </div>
          )}

        </div>

        {/* ── Footer ── */}
        <footer className="up-footer">
          {step === 2 && (
            <button
              className="up-btn up-btn-ghost"
              onClick={() => { reset(); setMensajeIA(""); setStep(1); }}
              disabled={uploading}
            >
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
