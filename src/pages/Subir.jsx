import React, { useState } from "react";
import axios from "axios";
import "./Subir.css";

export default function Subir() {
  const usuarioId = localStorage.getItem("usuarioId") || "user_demo";
  const [tipo, setTipo] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [mensajeIA, setMensajeIA] = useState("");

  // 📤 Subir imagen completa (prenda u outfit)
  async function handleUpload() {
    if (!file || !tipo) {
      alert("Selecciona si es una prenda o un outfit y elige una imagen.");
      return;
    }

    const fd = new FormData();
    fd.append("usuario_id", usuarioId);
    fd.append("genero", "unisex");
    fd.append("imagen", file);
    fd.append("tipo", tipo); // SOLO prenda u outfit

    try {
      setLoading(true);
      setMensajeIA("Subiendo imagen…");

      const res = await axios.post(
        "http://localhost:5001/api/subir-prenda",
        fd,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      setMensajeIA("Imagen analizada y guardada correctamente ✓");
      setFile(null);
      setPreview("");
      setTipo("");
    } catch (err) {
      console.error("❌ Error al subir imagen:", err);
      setMensajeIA("No se pudo subir la imagen. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="subir-container">
      <h2 className="titulo-subir">Subir imagen</h2>

      <p className="subtitulo">
        Sube una foto completa. La IA la analizará automáticamente.
      </p>

      <div className="tipo-selector">
        <button
          className={tipo === "prenda" ? "active" : ""}
          disabled={loading}
          onClick={() => setTipo("prenda")}
        >
          Prenda individual
        </button>

        <button
          className={tipo === "outfit" ? "active" : ""}
          disabled={loading}
          onClick={() => setTipo("outfit")}
        >
          Outfit completo
        </button>
      </div>

      {tipo && (
        <div className="upload-section">
          <input
            type="file"
            accept="image/*"
            disabled={loading}
            onChange={(e) => {
              const f = e.target.files[0];
              if (f) {
                setFile(f);
                setPreview(URL.createObjectURL(f));
                setMensajeIA("");
              }
            }}
          />

          {preview && (
            <div className="preview">
              <img src={preview} alt="preview" />
              {!loading && (
                <button
                  className="remove-btn"
                  onClick={() => {
                    setPreview("");
                    setFile(null);
                  }}
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
            {loading ? "Procesando…" : "Subir imagen"}
          </button>
        </div>
      )}

      {mensajeIA && <p className="estado-final">{mensajeIA}</p>}
    </div>
  );
}