import React, { useState } from "react"; import { supabase } from "../supabase"; import { useNavigate } from "react-router-dom"; import { Loader2, CheckCircle2 } from "lucide-react"; import AuthShell from "./AuthShell"; import "./AuthShell.css"; import "./Register.css"; export default function Register() { const [email,       setEmail]       = useState(""); const [password,    setPassword]    = useState(""); const [confirmPwd,  setConfirmPwd]  = useState(""); const [showPwd,     setShowPwd]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [done,        setDone]        = useState(false);
  const [errorMsg,    setErrorMsg]    = useState("");
  const navigate = useNavigate();

  const passwordRules = [
    { id: "lower",   label: "Una letra minúscula", ok: /[a-z]/.test(password) },
    { id: "upper",   label: "Una letra mayúscula", ok: /[A-Z]/.test(password) },
    { id: "number",  label: "Un número",           ok: /\d/.test(password) },
    { id: "special", label: "Un carácter especial", ok: /[^A-Za-z0-9]/.test(password) },
    { id: "length",  label: "Mínimo 8 caracteres",  ok: password.length >= 8 },
  ]; const passedRules = passwordRules.filter((rule) => rule.ok).length; const passwordValid = passedRules === passwordRules.length; const passwordsMatch = confirmPwd.length > 0 && password === confirmPwd; const passwordScoreClass = passwordValid
    ? "is-valid"
    : passedRules >= 3
      ? "is-medium"
      : password.length > 0
        ? "is-weak"
        : "";
  const passwordScoreLabel = passwordValid
    ? "Contraseña válida"
    : password.length === 0
      ? "Crea una contraseña segura"
      : `${passedRules}/${passwordRules.length} requisitos`;

  function translateError(msg) {
    const m = (msg || "").toLowerCase();
    if (m.includes("already registered") || m.includes("already exists"))
      return "Este correo ya tiene una cuenta. Inicia sesión.";
    if (m.includes("password") && m.includes("weak"))
      return "La contraseña es demasiado débil.";
    if (m.includes("password") && m.includes("6"))
      return "La contraseña debe tener al menos 6 caracteres.";
    if (m.includes("email")) return "Ingresa un correo válido.";
    if (m.includes("rate")) return "Demasiados intentos. Espera un momento.";
    if (m.includes("network") || m.includes("fetch"))
      return "Sin conexión. Inténtalo de nuevo.";
    return msg || "No pudimos crear la cuenta. Intenta de nuevo.";
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return setErrorMsg("Ingresa tu correo.");
    if (!passwordValid) return setErrorMsg("La contraseña debe cumplir todos los requisitos.");
    if (password !== confirmPwd) return setErrorMsg("Las contraseñas no coinciden.");

    setLoading(true);
    setErrorMsg("");

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
      },
    });

    setLoading(false);

    if (error) {
      setErrorMsg(translateError(error.message));
      return;
    }

    if (data?.session?.user) {
      localStorage.setItem("usuarioId", data.session.user.id);
      navigate("/");
      return;
    }

    setDone(true);
  }

  return (
    <AuthShell
      heroEyebrow="✦  Your AI stylist"
      heroTitle={<>Tu closet,<br /><em>curado</em> por IA.</>}
      heroBody="Sube lo que tienes y deja que Be: Confident te sugiera outfits que sí se sienten tuyos."
    >
      <div className="be-auth-card">

        <div>
          <p className="be-eyebrow">Crea tu cuenta</p>
          <h1 className="be-title">
            {done
              ? <>Revisa<br /><em>tu correo.</em></>
              : <>Empieza tu<br /><em>closet.</em></>}
          </h1>
        </div>

        <div className="be-toggle" role="tablist">
          <button role="tab" aria-selected="false" type="button" onClick={() => navigate("/login")}>
            Iniciar sesión
          </button>
          <button role="tab" aria-selected="true" type="button">
            Crear cuenta
          </button>
        </div>

        {!done ? (
          <>
            <form className="be-form" onSubmit={handleSubmit} noValidate>
              <div className="be-field">
                <label htmlFor="register-email">Correo</label>
                <div className="be-input-wrap">
                  <input
                    id="register-email"
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
                <label htmlFor="register-password">Contraseña</label>
                <div className="be-input-wrap">
                  <input
                    id="register-password"
                    type={showPwd ? "text" : "password"}
                    autoComplete="new-password"
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
                <div className={`be-password-strength ${passwordScoreClass}`}>
                  <div
                    className="be-password-bar"
                    role="progressbar"
                    aria-label="Seguridad de la contraseña"
                    aria-valuemin="0"
                    aria-valuemax="100"
                    aria-valuenow={Math.round((passedRules / passwordRules.length) * 100)}
                  >
                    <span style={{ width: `${(passedRules / passwordRules.length) * 100}%` }} />
                  </div>
                  <div className="be-password-status">
                    <span>{passwordScoreLabel}</span>
                    <strong>{Math.round((passedRules / passwordRules.length) * 100)}%</strong>
                  </div>
                  <ul className="be-password-checks" aria-label="Requisitos de contraseña">
                    {passwordRules.map((rule) => (
                      <li key={rule.id} className={rule.ok ? "ok" : ""}>
                        <span aria-hidden="true">{rule.ok ? "✓" : "•"}</span>
                        {rule.label}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="be-field">
                <label htmlFor="register-confirm">Confirmar contraseña</label>
                <div className="be-input-wrap">
                  <input
                    id="register-confirm"
                    type={showConfirm ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={confirmPwd}
                    onChange={(e) => setConfirmPwd(e.target.value)}
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
                {confirmPwd && (
                  <p className={`be-password-match ${passwordsMatch ? "ok" : "bad"}`}>
                    {passwordsMatch ? "Las contraseñas coinciden." : "Las contraseñas no coinciden."}
                  </p>
                )}
              </div>

              {errorMsg && <p className="be-error be-shake">{errorMsg}</p>}

              <button
                type="submit"
                className="be-submit-btn"
                disabled={loading || !email.trim() || !passwordValid || !passwordsMatch}
              >
                {loading ? (
                  <><Loader2 size={18} className="be-spin" strokeWidth={2.2} /> Creando cuenta...</>
                ) : (
                  <>
                    <span>Crear cuenta</span>
                    <svg className="be-arrow" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path d="M3 8h10m0 0L8.5 3.5M13 8l-4.5 4.5"
                        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </>
                )}
              </button>
            </form>
          </>
        ) : (
          <div className="be-waitlist-success">
            <div className="be-waitlist-check">
              <CheckCircle2 size={40} strokeWidth={1.4} />
            </div>
            <p className="be-sub">
              Te enviamos un enlace de confirmación a <strong>{email}</strong>.
              Cuando confirmes tu correo, podrás iniciar sesión.
            </p>
            <button type="button" className="be-submit-btn" onClick={() => navigate("/login")}>
              Ir al inicio de sesión
            </button>
          </div>
        )}

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
