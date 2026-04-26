import React, { useState } from "react";
import { supabase } from "../supabase";
import { useNavigate } from "react-router-dom";
import { Check, X, Loader2 } from "lucide-react";
import AuthShell from "./AuthShell";
import "./AuthShell.css";
import "./Register.css";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [infoMsg, setInfoMsg] = useState("");
  const navigate = useNavigate();

  const rules = [
    { id: "length", label: "Al menos 8 caracteres",  test: (p) => p.length >= 8 },
    { id: "upper",  label: "Una letra mayúscula",    test: (p) => /[A-Z]/.test(p) },
    { id: "lower",  label: "Una letra minúscula",    test: (p) => /[a-z]/.test(p) },
    { id: "number", label: "Un número",              test: (p) => /[0-9]/.test(p) },
    { id: "symbol", label: "Un símbolo (!@#$…)",     test: (p) => /[^A-Za-z0-9]/.test(p) },
  ];
  const passed = rules.filter((r) => r.test(password)).length;
  const strengthLabels = ["Muy débil", "Débil", "Media", "Aceptable", "Fuerte", "Muy fuerte"];
  const strengthColors = ["#ff4d4d", "#ff6b4d", "#ff884d", "#ffd24d", "#84A07C", "#00c853"];
  const isSecure = passed === rules.length;

  function translateError(msg) {
    const m = (msg || "").toLowerCase();
    if (m.includes("already registered") || m.includes("already exists"))
      return "Este correo ya está registrado.";
    if (m.includes("invalid email")) return "Correo electrónico no válido.";
    if (m.includes("rate")) return "Demasiados intentos. Espera un momento.";
    if (m.includes("network") || m.includes("fetch"))
      return "Sin conexión. Inténtalo de nuevo.";
    return msg;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg("");
    setInfoMsg("");

    if (!isSecure) {
      setErrorMsg("La contraseña no cumple con todos los requisitos.");
      return;
    }
    if (password !== confirm) {
      setErrorMsg("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);

    if (error) {
      setErrorMsg(translateError(error.message));
      return;
    }

    setInfoMsg("✅ Registro exitoso. Revisa tu correo para confirmar tu cuenta.");
    setTimeout(() => navigate("/login"), 1600);
  }

  return (
    <AuthShell
      heroEyebrow="✦  Your AI stylist"
      heroTitle={<>Tu closet,<br /><em>curado</em> por IA.</>}
      heroBody="Sube lo que tienes y deja que Be: Confident te sugiera outfits que sí se sienten tuyos."
    >
      <div className="be-auth-card">
        <div>
          <p className="be-eyebrow">Únete al closet</p>
          <h1 className="be-title">Crea el tuyo en un minuto.</h1>
        </div>

        <div className="be-toggle" role="tablist">
          <button
            role="tab"
            aria-selected="false"
            type="button"
            onClick={() => navigate("/login")}
          >
            Iniciar sesión
          </button>
          <button role="tab" aria-selected="true" type="button">
            Crear cuenta
          </button>
        </div>

        <form className="be-form" onSubmit={handleSubmit} noValidate>
          <div className="be-field">
            <label htmlFor="email">Correo</label>
            <div className="be-input-wrap">
              <input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="tu@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="be-field">
            <label htmlFor="password">Contraseña</label>
            <div className="be-input-wrap">
              <input
                id="password"
                type={showPwd ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Crea una contraseña segura"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="be-toggle-pwd"
                onClick={() => setShowPwd((s) => !s)}
                aria-label={showPwd ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPwd ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {/* Strength meter + rules */}
          <div className={`be-strength ${password ? "open" : ""}`}>
            <div className="be-strength-bar">
              <div
                className="be-strength-fill"
                style={{
                  width: `${(passed / rules.length) * 100}%`,
                  backgroundColor: strengthColors[passed],
                  color: strengthColors[passed],
                }}
              />
            </div>
            <p className="be-strength-label" style={{ color: strengthColors[passed] }}>
              {strengthLabels[passed]}
            </p>
            <ul className="be-rules">
              {rules.map((r) => {
                const ok = r.test(password);
                return (
                  <li key={r.id} className={`be-rule ${ok ? "ok" : "pending"}`}>
                    <span className="be-rule-icon" aria-hidden="true">
                      {ok ? <Check size={12} strokeWidth={2.8} /> : <X size={12} strokeWidth={2.2} />}
                    </span>
                    <span>{r.label}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="be-field">
            <label htmlFor="confirm">Confirmar contraseña</label>
            <div className="be-input-wrap">
              <input
                id="confirm"
                type={showConfirm ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Repite tu contraseña"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
              <button
                type="button"
                className="be-toggle-pwd"
                onClick={() => setShowConfirm((s) => !s)}
                aria-label={showConfirm ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showConfirm ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {confirm && confirm !== password && (
            <p className="be-error">Las contraseñas no coinciden.</p>
          )}

          {errorMsg && <p className="be-error be-shake">{errorMsg}</p>}
          {infoMsg && <p className="be-info">{infoMsg}</p>}

          <button
            type="submit"
            className="be-submit-btn"
            disabled={loading || !isSecure || password !== confirm || !confirm}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="be-spin" strokeWidth={2.2} />
                Creando cuenta...
              </>
            ) : (
              <>
                <span>Registrarse</span>
                <svg className="be-arrow" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path
                    d="M3 8h10m0 0L8.5 3.5M13 8l-4.5 4.5"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </>
            )}
          </button>
        </form>

        <div className="be-links">
          <a href="#">Términos</a>
          <span className="be-dot">·</span>
          <a href="#">Privacidad</a>
          <span className="be-dot">·</span>
          <a href="#">Ayuda</a>
        </div>
      </div>
    </AuthShell>
  );
}
