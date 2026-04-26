import React, { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import AuthShell from "./AuthShell";
import "./AuthShell.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [infoMsg, setInfoMsg] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const saved = localStorage.getItem("be:rememberedEmail");
    if (saved) {
      setEmail(saved);
      setRememberMe(true);
    }
  }, []);

  function translateError(msg) {
    const m = (msg || "").toLowerCase();
    if (m.includes("invalid login") || m.includes("invalid credentials"))
      return "Correo o contraseña incorrectos.";
    if (m.includes("email not confirmed"))
      return "Debes confirmar tu correo antes de iniciar sesión.";
    if (m.includes("rate")) return "Demasiados intentos. Espera un momento.";
    if (m.includes("network") || m.includes("fetch"))
      return "Sin conexión. Inténtalo de nuevo.";
    return msg;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setInfoMsg("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setErrorMsg(translateError(error.message));
      return;
    }

    if (rememberMe) localStorage.setItem("be:rememberedEmail", email);
    else localStorage.removeItem("be:rememberedEmail");

    localStorage.setItem("usuarioId", data.user.id);
    navigate("/");
  }

  async function handleForgot() {
    if (!email.trim()) {
      setErrorMsg("Ingresa tu correo primero para recuperar tu contraseña.");
      return;
    }
    setSendingReset(true);
    setErrorMsg("");
    setInfoMsg("");

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSendingReset(false);

    if (error) {
      setErrorMsg(translateError(error.message));
      return;
    }
    setInfoMsg("✉️ Te enviamos un enlace para restablecer tu contraseña.");
  }

  return (
    <AuthShell
      heroEyebrow="✦  Your AI stylist"
      heroTitle={<>Every fit,<br /><em>curated</em> for you.</>}
    >
      <div className="be-auth-card">
        <div>
          <p className="be-eyebrow">Welcome back</p>
          <h1 className="be-title">Inicia sesión en tu closet.</h1>
        </div>

        <div className="be-toggle" role="tablist">
          <button role="tab" aria-selected="true" type="button">
            Iniciar sesión
          </button>
          <button
            role="tab"
            aria-selected="false"
            type="button"
            onClick={() => navigate("/register")}
          >
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
                autoComplete="current-password"
                placeholder="••••••••"
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

          <div className="be-row-between">
            <label className="be-remember">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span className="be-checkbox" aria-hidden="true" />
              <span>Recuérdame</span>
            </label>
            <button
              type="button"
              className="be-forgot-inline"
              onClick={handleForgot}
              disabled={sendingReset}
            >
              {sendingReset ? "Enviando..." : "¿Olvidaste tu contraseña?"}
            </button>
          </div>

          {errorMsg && <p className="be-error be-shake">{errorMsg}</p>}
          {infoMsg && <p className="be-info">{infoMsg}</p>}

          <button type="submit" className="be-submit-btn" disabled={loading}>
            {loading ? (
              <>
                <Loader2 size={18} className="be-spin" strokeWidth={2.2} />
                Ingresando...
              </>
            ) : (
              <>
                <span>Ingresar</span>
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
