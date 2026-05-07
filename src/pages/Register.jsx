import React, { useState } from "react";
import { supabase } from "../supabase";
import { useNavigate } from "react-router-dom";
import { Loader2, Sparkles, CheckCircle2 } from "lucide-react";
import AuthShell from "./AuthShell";
import "./AuthShell.css";
import "./Register.css";

export default function Register() {
  const [email,    setEmail]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [done,     setDone]     = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setErrorMsg("");

    const { error } = await supabase
      .from("waitlist")
      .insert({ email: email.toLowerCase().trim() });

    setLoading(false);

    // duplicate key = ya estaba en lista, igual lo tratamos como éxito
    if (error && !error.message?.includes("duplicate") && !error.code?.includes("23505")) {
      setErrorMsg("Algo salió mal. Inténtalo de nuevo.");
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
          <p className="be-eyebrow">Únete al closet</p>
          <h1 className="be-title">
            {done
              ? <>¡Estás en<br /><em>la lista!</em></>
              : <>Pronto<br /><em>disponible.</em></>}
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
            <div className="be-waitlist-badge">
              <Sparkles size={13} strokeWidth={1.8} />
              <span>Estamos en beta cerrada — te avisamos cuando abra tu lugar</span>
            </div>

            <form className="be-form" onSubmit={handleSubmit} noValidate>
              <div className="be-field">
                <label htmlFor="wl-email">Tu correo</label>
                <div className="be-input-wrap">
                  <input
                    id="wl-email"
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

              {errorMsg && <p className="be-error be-shake">{errorMsg}</p>}

              <button
                type="submit"
                className="be-submit-btn"
                disabled={loading || !email.trim()}
              >
                {loading ? (
                  <><Loader2 size={18} className="be-spin" strokeWidth={2.2} /> Guardando…</>
                ) : (
                  <>
                    <span>Unirme a la lista</span>
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
              Te escribiremos a <strong>{email}</strong> cuando tu lugar esté listo.
              Mientras tanto puedes iniciar sesión si ya tienes cuenta.
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
