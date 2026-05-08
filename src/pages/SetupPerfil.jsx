import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./Auth.css";
import { API_URL } from "../config";
import { supabase } from "../supabase";

export default function SetupPerfil({ usuarioId, onComplete }) {
  const [username, setUsername] = useState("");
  const [nombre, setNombre] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleSetup(e) {
    e.preventDefault();
    if (!username.trim()) return setError("El username es requerido");
    if (username.length < 3) return setError("Mínimo 3 caracteres");
    if (!/^[a-z0-9_.]+$/.test(username)) return setError("Solo letras minúsculas, números, _ y .");

    setLoading(true);
    setError("");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers = session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
      await axios.put(`${API_URL}/api/perfil`, { username, nombre }, { headers });
      onComplete();
    } catch (err) {
      setError(err.response?.data?.error || "Error al guardar perfil");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <h2>✨ Configura tu perfil</h2>
        <p style={{ color: "rgba(244,244,249,0.6)", marginBottom: 24, fontSize: "0.9rem" }}>
          Elige tu nombre de usuario único para que otros puedan encontrarte
        </p>

        <form onSubmit={handleSetup}>
          <label>Nombre de usuario</label>
          <div style={{ position: "relative", marginBottom: 16 }}>
            <span style={{
              position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
              color: "rgba(244,244,249,0.4)", fontSize: "0.95rem", pointerEvents: "none"
            }}>@</span>
            <input
              type="text"
              placeholder="tu_usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              style={{ paddingLeft: 32, width: "100%", boxSizing: "border-box" }}
              required
            />
          </div>

          <label>Nombre (opcional)</label>
          <input
            type="text"
            placeholder="Tu nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            style={{ marginBottom: 16, width: "100%", boxSizing: "border-box" }}
          />

          {error && <p style={{ color: "#ff6b6b", fontSize: "0.85rem", marginBottom: 12 }}>{error}</p>}

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? "Guardando..." : "Continuar 🚀"}
          </button>
        </form>
      </div>
    </div>
  );
}