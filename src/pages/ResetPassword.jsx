import React, { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import AuthShell from "./AuthShell";
import "./AuthShell.css";

export default function ResetPassword() {
  const [password,        setPassword]        = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPwd,         setShowPwd]         = useState(false);
  const [loading,         setLoading]         = useState(false);
  const [errorMsg,        setErrorMsg]        = useState("");
  const [successMsg,      setSuccessMsg]      = useState("");
  const [ready,           setReady]           = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase v2 processes the #access_token hash automatically and fires
    // PASSWORD_RECOVERY when the link from the email is followed.
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (password !== confirmPassword) {
      setErrorMsg("Las contraseñas no coinciden.");
      return;
    }
    if (password.length < 6) {
      setErrorMsg("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    setLoading(true);
    setErrorMsg("");

    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    setSuccessMsg("Contraseña actualizada. Redirigiendo...");
    setTimeout(() => navigate("/"), 2000);
  }

  return (
    <AuthShell
      heroEyebrow="✦  Your AI stylist"
      heroTitle={<>Nueva<br /><em>contraseña</em></>}
      heroBody="Elige una contraseña segura para proteger tu cuenta."
    >
      <div className="be-auth-card">
        <div>
          <p className="be-eyebrow">Recuperar acceso</p>
          <h1 className="be-title">Establece tu nueva contraseña.</h1>
        </div>

        {!ready ? (
          <p className="be-info" style={{ marginTop: 16 }}>
            Verificando enlace de recuperación...
          </p>
        ) : (
          <form className="be-form" onSubmit={handleSubmit} noValidate>
            <div className="be-field">
              <label htmlFor="new-pwd">Nueva contraseña</label>
              <div className="be-input-wrap">
                <input
                  id="new-pwd"
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
            </div>

            <div className="be-field">
              <label htmlFor="confirm-pwd">Confirmar contraseña</label>
              <div className="be-input-wrap">
                <input
                  id="confirm-pwd"
                  type={showPwd ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {errorMsg  && <p className="be-error be-shake">{errorMsg}</p>}
            {successMsg && <p className="be-info">{successMsg}</p>}

            <button type="submit" className="be-submit-btn" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 size={18} className="be-spin" strokeWidth={2.2} />
                  Guardando...
                </>
              ) : (
                <>
                  <span>Actualizar contraseña</span>
                  <svg className="be-arrow" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M3 8h10m0 0L8.5 3.5M13 8l-4.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </AuthShell>
  );
}
