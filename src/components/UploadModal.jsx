import React, { useState, useEffect, useRef } from "react";
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

function etapaLabel(progreso) {
  return ETAPAS.find(e => progreso <= e.hasta)?.label || "✅ ¡Listo!";
}

export default function UploadModal({ onClose, onUploaded }) {
  const [tipo, setTipo] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [mensajeIA, setMensajeIA] = useState("");
  const [loading, setLoading] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const intervaloRef = useRef(null);
  const pickPhoto = useNativeCamera();

  function iniciarProgreso() {
    setProgreso(0);
    intervaloRef.current = setInterval(() => {
      setProgreso(prev => {
        if (prev >= 90) { clearInterval(intervaloRef.current); return 90; }
        // Avanza rápido al inicio, lento en el medio (simula el proceso real)
        const incremento = prev < 20 ? 4 : prev < 65 ? 0.8 : 0.3;
        return Math.min(prev + incremento, 90);
      });
    }, 200);
  }

  function completarProgreso() {
    clearInterval(intervaloRef.current);
    setProgreso(100);
  }

  useEffect(() => () => clearInterval(intervaloRef.current), []);

  async function handleUpload() {
    if (!file || !tipo) return alert("Selecciona el tipo y una imagen antes de subir.");

    try {
      setLoading(true);
      setMensajeIA("");
      iniciarProgreso();

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Usuario no autenticado");

      const formData = new FormData();
      formData.append("imagen", file);
      formData.append("usuario_id", user.id);
      formData.append("tipo", tipo);
      formData.append("genero", "unisex");

      const res = await axios.post(`${API_URL}/api/subir-prenda`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      completarProgreso();
      haptics.success();
      setMensajeIA(res.data?.mensaje ? `✅ ${res.data.mensaje}` : "✅ Imagen analizada correctamente.");
      if (onUploaded) onUploaded();
      setTimeout(() => { setFile(null); setPreview(""); setTipo(""); setProgreso(0); }, 1500);
    } catch (err) {
      console.error("❌ Error:", err);
      clearInterval(intervaloRef.current);
      setProgreso(0);
      setMensajeIA("⚠️ Ocurrió un error al subir o analizar la imagen.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="upload-overlay fade-in"
      onClick={(e) => e.target.classList.contains("upload-overlay") && onClose()}
    >
      <div className="upload-modal modal-spring">
        <button className="close-upload" onClick={onClose}>✕</button>

        <h2>📸 Subir Imagen</h2>
        <p className="sub-text">
          Selecciona el tipo de imagen y deja que la IA la analice y organice tu closet.
        </p>

        <div className="modal-options">
          <button
            className={`option-btn ${tipo === "prenda" ? "active" : ""}`}
            onClick={() => setTipo("prenda")}
            disabled={loading}
          >
            👕 Prenda individual
          </button>
          <button
            className={`option-btn ${tipo === "outfit" ? "active" : ""}`}
            onClick={() => setTipo("outfit")}
            disabled={loading}
          >
            🧥 Outfit completo
          </button>
        </div>

        {tipo && (
          <div className="upload-section">
            <button
              className="file-label"
              disabled={loading}
              onClick={async () => {
                const f = await pickPhoto();
                if (f) {
                  const compressed = await comprimirImagen(f);
                  setFile(compressed);
                  setPreview(URL.createObjectURL(compressed));
                  setMensajeIA("");
                }
              }}
            >
              <span className="file-text">
                {file ? file.name : "📂 Toca para seleccionar o tomar foto"}
              </span>
            </button>

            {preview && (
              <div className="preview">
                <img src={preview} alt="preview" className="preview-img" />
                {!loading && (
                  <button
                    className="remove-btn"
                    onClick={() => { setPreview(""); setFile(null); }}
                  >
                    ✕
                  </button>
                )}
              </div>
            )}

            <button
              className="btn-subir"
              onClick={handleUpload}
              disabled={loading || !file}
            >
              {loading ? "Procesando..." : "🚀 Subir imagen"}
            </button>

            {loading && (
              <div className="progress-wrap">
                <div className="progress-header">
                  <span className="progress-label">{etapaLabel(progreso)}</span>
                  <span className="progress-pct">{Math.round(progreso)}%</span>
                </div>
                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{ width: `${progreso}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {mensajeIA && <p className="mensaje-ia">{mensajeIA}</p>}
      </div>
    </div>
  );
}