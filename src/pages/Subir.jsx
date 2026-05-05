import React, { useState } from "react";
import axios from "axios";

export default function Subir() {
  const usuarioId = localStorage.getItem("usuarioId") || "user_demo";
  const [tipo, setTipo] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [mensajeIA, setMensajeIA] = useState("");

  async function handleUpload() {
    if (!file || !tipo) {
      alert("Selecciona si es una prenda o un outfit y elige una imagen.");
      return;
    }
    const fd = new FormData();
    fd.append("usuario_id", usuarioId);
    fd.append("genero", "unisex");
    fd.append("imagen", file);
    fd.append("tipo", tipo);
    try {
      setLoading(true);
      setMensajeIA("Subiendo imagen…");
      await axios.post("http://localhost:5001/api/subir-prenda", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
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
    <div className="max-w-[500px] mx-auto mt-[50px] bg-white p-8 rounded-2xl shadow-lg text-center">
      <h2 className="mb-4 text-[1.8rem] font-semibold text-gray-800">Subir imagen</h2>
      <p className="text-gray-500 mb-4">
        Sube una foto completa. La IA la analizará automáticamente.
      </p>

      <div className="flex justify-center gap-2.5 mb-4">
        <button
          disabled={loading}
          onClick={() => setTipo("prenda")}
          className={`px-4 py-2.5 rounded-xl text-[0.95rem] transition-all duration-300 ${
            tipo === "prenda"
              ? "bg-blue-600 text-white"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          Prenda individual
        </button>
        <button
          disabled={loading}
          onClick={() => setTipo("outfit")}
          className={`px-4 py-2.5 rounded-xl text-[0.95rem] transition-all duration-300 ${
            tipo === "outfit"
              ? "bg-blue-600 text-white"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          Outfit completo
        </button>
      </div>

      {tipo && (
        <div className="mt-4">
          <input
            type="file"
            accept="image/*"
            disabled={loading}
            className="my-4"
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
            <div className="relative inline-block my-2.5">
              <img
                src={preview}
                alt="preview"
                className="w-[200px] h-[200px] object-cover rounded-xl shadow-md"
              />
              {!loading && (
                <button
                  onClick={() => { setPreview(""); setFile(null); }}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          )}

          <div className="mt-2">
            <button
              onClick={handleUpload}
              disabled={loading || !file}
              className="bg-blue-600 text-white rounded-xl px-5 py-2.5 hover:bg-blue-700 disabled:opacity-50 transition-all duration-300"
            >
              {loading ? "Procesando…" : "Subir imagen"}
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="mt-5">
          <div className="border-4 border-gray-200 border-t-blue-600 rounded-full w-7 h-7 mx-auto mb-2.5 animate-spin" />
        </div>
      )}

      {mensajeIA && (
        <p className="mt-5 font-medium text-gray-700">{mensajeIA}</p>
      )}
    </div>
  );
}
