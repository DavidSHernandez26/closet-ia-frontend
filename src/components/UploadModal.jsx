import React, { useState } from "react";
import "./UploadModal.css";
import { supabase } from "../supabase";
import axios from "axios";
import { API_URL } from "../config";

export default function UploadModal({ onClose, onUploaded }) {
  const [tipo, setTipo] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [mensajeIA, setMensajeIA] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleUpload() {
    if (!file || !tipo) return alert("Selecciona el tipo y una imagen antes de subir.");

    try {
      setLoading(true);
      setMensajeIA("🧠 Analizando y procesando imagen...");

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Usuario no autenticado");

      /* ── Enviar archivo directo al backend ── */
      const formData = new FormData();
      formData.append("imagen", file);
      formData.append("usuario_id", user.id);
      formData.append("tipo", tipo);
      formData.append("genero", "unisex");

      const res = await axios.post(`${API_URL}/api/subir-prenda`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setMensajeIA(res.data?.mensaje ? `✅ ${res.data.mensaje}` : "✅ Imagen analizada correctamente.");
      if (onUploaded) onUploaded();
      setFile(null);
      setPreview("");
      setTipo("");
    } catch (err) {
      console.error("❌ Error:", err);
      setMensajeIA("⚠️ Ocurrió un error al subir o analizar la imagen.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="upload-overlay"
      onClick={(e) => e.target.classList.contains("upload-overlay") && onClose()}
    >
      <div className="upload-modal">
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
            <label className="file-label">
              <input
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => {
                  const f = e.target.files[0];
                  if (f) {
                    setFile(f);
                    setPreview(URL.createObjectURL(f));
                    setMensajeIA("");
                  }
                }}
                disabled={loading}
              />
              <span className="file-text">
                {file ? file.name : "📂 Haz clic para seleccionar una imagen"}
              </span>
            </label>

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
              {loading ? (
                <span className="loader">
                  <span className="dot"></span>
                  <span className="dot"></span>
                  <span className="dot"></span>
                </span>
              ) : "🚀 Subir imagen"}
            </button>
          </div>
        )}

        {mensajeIA && <p className="mensaje-ia">{mensajeIA}</p>}
      </div>
    </div>
  );
}