import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import "./Asistente.css";
import VirtualMannequin from "../components/VirtualMannequin";
import { API_URL } from "../config";

export default function Asistente({ usuarioId }) {
  const STORAGE_CHAT            = `asistente_chat_${usuarioId}`;
  const STORAGE_OUTFIT          = `asistente_outfit_${usuarioId}`;
  const STORAGE_OUTFIT_IDS      = `asistente_outfit_ids_${usuarioId}`;
  const STORAGE_OUTFIT_GUARDADO = `asistente_outfit_guardado_${usuarioId}`;
  const STORAGE_CALENDARIO      = `calendario_outfits_${usuarioId}`;

  const [mensaje, setMensaje] = useState("");

  const [chat, setChat] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_CHAT)) || []; }
    catch { return []; }
  });

  const [outfit, setOutfit] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_OUTFIT)) || []; }
    catch { return []; }
  });

  const [outfitIds, setOutfitIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_OUTFIT_IDS)) || []; }
    catch { return []; }
  });

  const [outfitGuardado, setOutfitGuardado] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_OUTFIT_GUARDADO)) || null; }
    catch { return null; }
  });

  const [loading, setLoading] = useState(false);
  const [showCalPicker, setShowCalPicker] = useState(false);
  const [fechaSeleccionada, setFechaSeleccionada] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [calConfirmado, setCalConfirmado] = useState(false);
  const [ocasionActiva, setOcasionActiva] = useState(null);

  const chatEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => { localStorage.setItem(STORAGE_CHAT, JSON.stringify(chat)); }, [chat]);
  useEffect(() => { localStorage.setItem(STORAGE_OUTFIT, JSON.stringify(outfit)); }, [outfit]);
  useEffect(() => { localStorage.setItem(STORAGE_OUTFIT_IDS, JSON.stringify(outfitIds)); }, [outfitIds]);
  useEffect(() => { localStorage.setItem(STORAGE_OUTFIT_GUARDADO, JSON.stringify(outfitGuardado)); }, [outfitGuardado]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat, loading]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "24px";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [mensaje]);

  /* ── Ocasiones ── */
  const ocasiones = [
    { id: "casual",    icon: "👟", label: "Casual",    prompt: "Arma un outfit casual y cómodo para el día a día" },
    { id: "trabajo",   icon: "💼", label: "Trabajo",   prompt: "Necesito un outfit profesional para ir a trabajar u oficina" },
    { id: "cita",      icon: "🌙", label: "Cita",      prompt: "Arma un outfit para una cita romántica, que se vea cuidado y atractivo" },
    { id: "deporte",   icon: "⚡", label: "Deporte",   prompt: "Quiero un look deportivo o activo para hacer ejercicio o salir a caminar" },
    { id: "salida",    icon: "🎉", label: "Salida",    prompt: "Arma un outfit para salir de noche con amigos, que se vea moderno y divertido" },
    { id: "viaje",     icon: "✈️", label: "Viaje",     prompt: "Necesito un outfit cómodo pero estiloso para viajar" },
  ];

  function handleOcasion(ocas) {
    if (ocasionActiva?.id === ocas.id) {
      setOcasionActiva(null);
      setMensaje("");
    } else {
      setOcasionActiva(ocas);
      setMensaje(ocas.prompt);
      textareaRef.current?.focus();
    }
  }

  async function handleRecommend() {
    if (!mensaje.trim() || loading) return;

    const userMessage = { role: "user", text: mensaje };
    setChat((prev) => [...prev, userMessage]);
    setMensaje("");
    setOcasionActiva(null);
    setLoading(true);
    setCalConfirmado(false);

    try {
      const res = await axios.post(`${API_URL}/api/fashion`, {
        usuario_id: usuarioId,
        mensaje,
        historial: chat.slice(-8),
        outfit_ids_anteriores: outfitIds,
      });

      setChat((prev) => [...prev, {
        role: "assistant",
        text: res.data?.respuesta || "No hubo respuesta.",
      }]);

      const cambiarPanel = res.data?.cambiar_panel ?? true;

      if (!cambiarPanel) {
        /* solo texto */
      } else if (res.data?.outfit_guardado) {
        if (!outfitGuardado || res.data.outfit_guardado.id !== outfitGuardado.id) {
          setOutfitGuardado(res.data.outfit_guardado);
          setOutfit([]);
          setOutfitIds([]);
        }
      } else if (Array.isArray(res.data?.outfit) && res.data.outfit.length > 0) {
        setOutfit(res.data.outfit);
        setOutfitIds(res.data.outfit.map((p) => p.id));
        setOutfitGuardado(null);
      }
    } catch (err) {
      console.error("❌ Error fashion:", err);
      setChat((prev) => [...prev, {
        role: "assistant",
        text: "⚠️ Ocurrió un error al generar la recomendación.",
      }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleRecommend();
    }
  }

  function handleClearChat() {
    setChat([]);
    setOutfit([]);
    setOutfitIds([]);
    setOutfitGuardado(null);
    setCalConfirmado(false);
    setOcasionActiva(null);
    setMensaje("");
    localStorage.removeItem(STORAGE_CHAT);
    localStorage.removeItem(STORAGE_OUTFIT);
    localStorage.removeItem(STORAGE_OUTFIT_IDS);
    localStorage.removeItem(STORAGE_OUTFIT_GUARDADO);
  }

  function handleHint(text) {
    setMensaje(text);
    setOcasionActiva(null);
    textareaRef.current?.focus();
  }

  function handleGuardarCalendario() {
    const cal = (() => {
      try { return JSON.parse(localStorage.getItem(STORAGE_CALENDARIO)) || {}; }
      catch { return {}; }
    })();

    if (outfitGuardado) {
      cal[fechaSeleccionada] = {
        imagen_url: outfitGuardado.imagen_url,
        descripcion: outfitGuardado.descripcion,
        prendas: outfitGuardado.metadata_ia?.prendas || [],
      };
    } else if (outfit.length > 0) {
      cal[fechaSeleccionada] = {
        imagen_url: outfit[0].imagen_url,
        descripcion: outfit.map((p) => p.descripcion?.split("(")[0]?.trim()).join(", "),
        prendas: outfit.map((p) => ({
          nombre: p.descripcion?.split("(")[0]?.trim(),
          color: p.descripcion?.match(/\(([^)]+)\)/)?.[1] || "",
        })),
      };
    }

    localStorage.setItem(STORAGE_CALENDARIO, JSON.stringify(cal));
    setShowCalPicker(false);
    setCalConfirmado(true);
  }

  const tieneOutfit = outfit.length > 0 || !!outfitGuardado;

  const hints = [
    "Arma un outfit para una cita nocturna",
    "¿Qué me pongo para ir a la oficina?",
    "Algo casual para el fin de semana",
  ];

  return (
    <div className="asistente-fondo">
      <div className="asistente-layout">

        {/* ── CHAT ── */}
        <div className="asistente-card">

          {/* Header */}
          <div className="asistente-header">
            <div className="asistente-header-left">
              <div className="asistente-avatar">✦</div>
              <div className="asistente-header-info">
                <h1>Asistente de Moda</h1>
                <p>
                  <span className="asistente-status-dot" />
                  Activo · Closet IA
                </p>
              </div>
            </div>
            {chat.length > 0 && (
              <button className="btn-clear-chat" onClick={handleClearChat}>
                🗑 Limpiar
              </button>
            )}
          </div>

          {/* Mensajes */}
          <div className="chat-box">
            {chat.length === 0 ? (
              <div className="chat-placeholder">
                <div className="chat-placeholder-icon">✦</div>
                <p className="chat-placeholder-title">Tu estilista personal con IA</p>
                <div className="chat-placeholder-hints">
                  {hints.map((h, i) => (
                    <button key={i} className="chat-hint" onClick={() => handleHint(h)}>
                      <span>"{h}"</span>
                      <span className="chat-hint-arrow">→</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              chat.map((msg, i) => (
                <div key={i} className={`chat-message-row ${msg.role}`}>
                  <div className={`chat-msg-avatar ${msg.role}`}>
                    {msg.role === "assistant" ? "✦" : "👤"}
                  </div>
                  <div className="chat-msg-content">
                    <span className="chat-msg-sender">
                      {msg.role === "assistant" ? "Asistente" : "Tú"}
                    </span>
                    <div className={`chat-bubble ${msg.role}`}>
                      {msg.text}
                    </div>
                  </div>
                </div>
              ))
            )}

            {loading && (
              <div className="chat-message-row assistant">
                <div className="chat-msg-avatar assistant">✦</div>
                <div className="chat-msg-content">
                  <span className="chat-msg-sender">Asistente</span>
                  <div className="chat-bubble assistant">
                    <div className="chat-loader">
                      <span className="dot" />
                      <span className="dot" />
                      <span className="dot" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* ── CHIPS DE OCASIÓN ── */}
          <div className="ocasion-chips-wrap">
            {ocasiones.map((o) => (
              <button
                key={o.id}
                className={`ocasion-chip ${ocasionActiva?.id === o.id ? "activa" : ""}`}
                onClick={() => handleOcasion(o)}
                disabled={loading}
              >
                <span className="ocasion-chip-icon">{o.icon}</span>
                <span>{o.label}</span>
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="asistente-form">
            <div className="asistente-form-inner">
              <textarea
                ref={textareaRef}
                placeholder={
                  ocasionActiva
                    ? `Outfit para ${ocasionActiva.label.toLowerCase()}... (personaliza si quieres)`
                    : "Escribe tu pregunta... (Enter para enviar)"
                }
                value={mensaje}
                onChange={(e) => {
                  setMensaje(e.target.value);
                  if (ocasionActiva && e.target.value !== ocasionActiva.prompt) {
                    setOcasionActiva(null);
                  }
                }}
                onKeyDown={handleKeyDown}
                disabled={loading}
                rows={1}
              />
              <button
                onClick={handleRecommend}
                className="btn-recomendar"
                disabled={loading || !mensaje.trim()}
                title="Enviar"
              >
                <svg className="btn-send-icon" viewBox="0 0 24 24">
                  <path d="M22 2L11 13" />
                  <path d="M22 2L15 22L11 13L2 9L22 2Z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* ── PANEL OUTFIT ── */}
        <div className="outfit-panel">
          <div className="outfit-panel-header">
            <div className="outfit-panel-icon">👔</div>
            <h3>Outfit sugerido</h3>
          </div>

          {outfitGuardado ? (
            <div className="outfit-guardado-preview">
              <img src={outfitGuardado.imagen_url} alt={outfitGuardado.descripcion} />
              <p>{outfitGuardado.descripcion}</p>
              {outfitGuardado.metadata_ia?.prendas?.length > 0 && (
                <div className="outfit-guardado-prendas">
                  {outfitGuardado.metadata_ia.prendas.map((pr, i) => (
                    <span key={i} className="outfit-guardado-chip">
                      {pr.nombre} ({pr.color})
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : outfit.length === 0 ? (
            <div className="outfit-placeholder">
              <span className="outfit-placeholder-icon">✦</span>
              <p>Las prendas recomendadas aparecerán aquí</p>
            </div>
          ) : (
            <VirtualMannequin outfit={outfit} />
          )}

          {tieneOutfit && !loading && (
            <div className="cal-actions">
              {calConfirmado ? (
                <p className="cal-confirmado">✅ Guardado en el calendario</p>
              ) : (
                <button className="btn-add-cal" onClick={() => {
                  setFechaSeleccionada(new Date().toISOString().split("T")[0]);
                  setShowCalPicker(true);
                }}>
                  📅 Agregar al calendario
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal calendario */}
      {showCalPicker && (
        <div className="cal-picker-overlay" onClick={() => setShowCalPicker(false)}>
          <div className="cal-picker-modal" onClick={(e) => e.stopPropagation()}>
            <button className="cal-picker-close" onClick={() => setShowCalPicker(false)}>✕</button>
            <h3>📅 Agregar al calendario</h3>
            <p>Selecciona el día en que usarás este outfit</p>
            <input
              type="date"
              className="cal-picker-input"
              value={fechaSeleccionada}
              onChange={(e) => setFechaSeleccionada(e.target.value)}
            />
            <button className="cal-picker-confirm" onClick={handleGuardarCalendario}>
              Guardar outfit
            </button>
          </div>
        </div>
      )}
    </div>
  );
}