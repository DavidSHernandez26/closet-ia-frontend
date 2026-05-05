import React, { useState } from "react";
import { supabase } from "../supabase";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import AuthShell from "./AuthShell";
import "./AuthShell.css";

export default function Waitlist() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    const { error } = await supabase
      .from("waitlist")
      .insert({ email: email.trim().toLowerCase() });

    setLoading(false);

    if (error) {
      if (error.code === "23505") {
        setDone(true);
        return;
      }
      setErrorMsg("Algo salió mal. Inténtalo de nuevo.");
      return;
    }

    setDone(true);
  }

  return (
    <AuthShell
      heroEyebrow="✦  Coming soon"
      heroTitle={<>Tu closet,<br /><em>curado</em> por IA.</>}
      heroBody="Sé el primero en acceder. Deja tu correo y te avisamos cuando abramos las puertas."
    >
      <div className="be-auth-card">
        {done ? (
          <>
            <div>
              <p className="be-eyebrow">¡Listo!</p>
              <h1 className="be-title">Ya estás en la lista.</h1>
            </div>
            <p className="be-sub">
              Te avisaremos en cuanto abramos. Mientras tanto, sigue construyendo tu estilo.
            </p>
          </>
        ) : (
          <>
            <div>
              <p className="be-eyebrow">Próximamente</p>
              <h1 className="be-title">Algo nuevo se viene.</h1>
            </div>
            <p className="be-sub">
              Be: Confident está casi listo. Déjanos tu correo y serás de los primeros en entrar.
            </p>

            <form className="be-form" onSubmit={handleSubmit} noValidate>
              <div className="be-field">
                <label htmlFor="wl-email">Correo</label>
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
                  <>
                    <Loader2 size={18} className="be-spin" strokeWidth={2.2} />
                    Guardando...
                  </>
                ) : (
                  <>
                    <span>Únete a la lista</span>
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
          </>
        )}

        <div className="be-links">
          <button type="button" onClick={() => navigate("/login")}>
            Ya tengo cuenta
          </button>
        </div>
      </div>
    </AuthShell>
  );
}
