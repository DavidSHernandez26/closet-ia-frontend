import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import "./Asistente.css";
import VirtualMannequin from "../components/VirtualMannequin";
import { API_URL } from "../config";
import { supabase } from "../supabase";
import { getWeather } from "../services/weatherService";
import { haptics } from "../hooks/useHaptics";

// Debe coincidir con getTipo de VirtualMannequin
function getTipoPrenda(descripcion = "") {
  const d = descripcion.toLowerCase();
  if (d.includes("abrigo") || d.includes("chaqueta") || d.includes("jacket") || d.includes("hoodie") || d.includes("sudadera")) return "abrigo";
  if (d.includes("gorra") || d.includes("sombrero") || d.includes("gorro") || d.includes("beanie") || d.includes("snapback")) return "gorra";
  if (d.includes("superior") || d.includes("camiseta") || d.includes("camisa") || d.includes("polo") || d.includes("blusa") || d.includes("playera") || d.includes("top")) return "parte superior";
  if (d.includes("inferior") || d.includes("pantalón") || d.includes("pantalon") || d.includes("jean") || d.includes("short") || d.includes("falda") || d.includes("pants")) return "parte inferior";
  if (d.includes("calzado") || d.includes("tenis") || d.includes("zapato") || d.includes("bota") || d.includes("zapatilla") || d.includes("sandalia") || d.includes("sneaker")) return "calzado";
  // Fallback: usar el tipo almacenado al final de la descripción
  const tipoAlmacenado = descripcion.split(" - ").pop()?.trim().toLowerCase();
  if (["calzado","parte superior","parte inferior","accesorio","abrigo"].includes(tipoAlmacenado)) return tipoAlmacenado;
  return "parte superior";
}

export default function Asistente({ usuarioId }) {
  const STORAGE_CHAT            = `asistente_chat_${usuarioId}`;
  const STORAGE_OUTFIT          = `asistente_outfit_${usuarioId}`;
  const STORAGE_OUTFIT_IDS      = `asistente_outfit_ids_${usuarioId}`;
  const STORAGE_OUTFIT_GUARDADO = `asistente_outfit_guardado_${usuarioId}`;

  const [mensaje, setMensaje]               = useState("");
  const [showOutfitSheet, setShowOutfitSheet] = useState(false);
  const [modo, setModo]                     = useState("chat"); // "chat" | "maniqui"
  const [swapTipo, setSwapTipo]             = useState(null);
  const [swapPrendas, setSwapPrendas]       = useState([]);
  const [swapLoading, setSwapLoading]       = useState(false);
  const [loadingManiqui, setLoadingManiqui] = useState(false);
  const [ocasionManiqui, setOcasionManiqui] = useState(null);
  const [token, setToken]                   = useState("");

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

  const [clima, setClima]                         = useState(null);
  const [loading, setLoading]                     = useState(false);
  const [showCalPicker, setShowCalPicker]         = useState(false);
  const [fechaSeleccionada, setFechaSeleccionada] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [calConfirmado, setCalConfirmado] = useState(false);
  const [ocasionActiva, setOcasionActiva] = useState(null);

  const [showForecast, setShowForecast] = useState(false);

  const chatEndRef       = useRef(null);
  const textareaRef      = useRef(null);
  const prendasCacheRef  = useRef(null);
  const forecastRef      = useRef(null);
  const fondoRef         = useRef(null);

  // Empuja el layout hacia arriba cuando aparece el teclado en iOS Safari
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const onVVResize = () => {
      const keyboardH = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      if (fondoRef.current) {
        fondoRef.current.style.bottom = keyboardH > 50
          ? `${keyboardH}px`
          : "";
      }
      if (keyboardH > 50) {
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      }
    };
    vv.addEventListener("resize", onVVResize);
    return () => vv.removeEventListener("resize", onVVResize);
  }, []);

  useEffect(() => {
    if (!showForecast) return;
    function onClickOutside(e) {
      // Cierra si el clic no es en el strip ni en el chip (que tiene clase clima-chip)
      const enStrip = forecastRef.current?.contains(e.target);
      const enChip  = e.target.closest?.(".clima-chip");
      if (!enStrip && !enChip) setShowForecast(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [showForecast]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) =>
      setToken(data?.session?.access_token || "")
    );
  }, []);

  useEffect(() => {
    getWeather().then(setClima).catch(() => {});
  }, []);

  // Prefetch prendas al entrar al modo probador para que el swap sea instantáneo
  useEffect(() => {
    if (modo === "maniqui" && !prendasCacheRef.current) {
      axios.get(`${API_URL}/api/prendas`)
        .then(res => { prendasCacheRef.current = res.data || []; })
        .catch(() => {});
    }
  }, [modo, usuarioId]);

  useEffect(() => { localStorage.setItem(STORAGE_CHAT, JSON.stringify(chat)); }, [chat]);
  useEffect(() => { localStorage.setItem(STORAGE_OUTFIT, JSON.stringify(outfit)); }, [outfit]);
  useEffect(() => { localStorage.setItem(STORAGE_OUTFIT_IDS, JSON.stringify(outfitIds)); }, [outfitIds]);
  useEffect(() => { localStorage.setItem(STORAGE_OUTFIT_GUARDADO, JSON.stringify(outfitGuardado)); }, [outfitGuardado]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat, loading]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    // requestAnimationFrame evita el reflow forzado (write→read síncrono)
    const raf = requestAnimationFrame(() => {
      el.style.height = "24px";
      el.style.height = `${el.scrollHeight}px`;
    });
    return () => cancelAnimationFrame(raf);
  }, [mensaje]);

  useEffect(() => {
    if (outfit.length > 0 || outfitGuardado) {
      setShowOutfitSheet(false);
    }
  }, [outfit, outfitGuardado]);

  const ocasiones = [
    { id: "casual",  icon: "👟", label: "Casual",  prompt: "Arma un outfit casual y cómodo para el día a día" },
    { id: "trabajo", icon: "💼", label: "Trabajo", prompt: "Necesito un outfit profesional para ir a trabajar u oficina" },
    { id: "cita",    icon: "🌙", label: "Cita",    prompt: "Arma un outfit para una cita romántica, que se vea cuidado y atractivo" },
    { id: "deporte", icon: "⚡", label: "Deporte", prompt: "Quiero un look deportivo o activo para hacer ejercicio o salir a caminar" },
    { id: "salida",  icon: "🎉", label: "Salida",  prompt: "Arma un outfit para salir de noche con amigos, que se vea moderno y divertido" },
    { id: "viaje",   icon: "✈️", label: "Viaje",   prompt: "Necesito un outfit cómodo pero estiloso para viajar" },
  ];

  function handleOcasion(ocas) {
    haptics.light();
    if (ocasionActiva?.id === ocas.id) {
      setOcasionActiva(null);
      setMensaje("");
    } else {
      setOcasionActiva(ocas);
      setMensaje(ocas.prompt);
      textareaRef.current?.focus();
    }
  }

  async function handleRecommend(textoDirecto) {
    const texto = typeof textoDirecto === "string" ? textoDirecto : mensaje;
    if (!texto.trim() || loading) return;
    haptics.medium();

    setChat((prev) => [...prev, { role: "user", text: texto }]);
    if (!textoDirecto) setMensaje("");
    setOcasionActiva(null);
    setLoading(true);
    setCalConfirmado(false);

    try {
      const res = await axios.post(`${API_URL}/api/fashion`, {
        mensaje: texto,
        historial: chat.slice(-8),
        outfit_ids_anteriores: outfitIds,
        clima: clima?.resumen || null,
      });

      haptics.success();
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
    setShowOutfitSheet(false);
    localStorage.removeItem(STORAGE_CHAT);
    localStorage.removeItem(STORAGE_OUTFIT);
    localStorage.removeItem(STORAGE_OUTFIT_IDS);
    localStorage.removeItem(STORAGE_OUTFIT_GUARDADO);
  }

  function handleHint(hint) {
    if (hint.autoSend) {
      handleRecommend(hint.prompt);
    } else {
      setMensaje(hint.prompt);
      setOcasionActiva(null);
      textareaRef.current?.focus();
    }
  }

  async function handleGuardarCalendario() {
    try {
      let imagen_url, descripcion, metadata;
      if (outfitGuardado) {
        imagen_url  = outfitGuardado.imagen_url;
        descripcion = outfitGuardado.descripcion;
        metadata    = outfitGuardado.metadata_ia || {};
      } else if (outfit.length > 0) {
        imagen_url  = outfit[0].imagen_url;
        descripcion = outfit.map((p) => p.descripcion?.split("(")[0]?.trim()).join(", ");
        metadata    = {
          outfit_ids: outfit.map(p => p.id),
          outfit: outfit.map(p => ({ id: p.id, imagen_url: p.imagen_url, descripcion: p.descripcion })),
        };
      } else return;

      await axios.post(`${API_URL}/api/calendario`, {
        fecha: fechaSeleccionada,
        imagen_url,
        descripcion,
        metadata,
      }, { headers: { Authorization: `Bearer ${token}` } });

      setShowCalPicker(false);
      setCalConfirmado(true);
    } catch (err) {
      console.error("Error guardando en calendario:", err);
    }
  }

  async function handleGenerarOutfit() {
    if (loadingManiqui) return;
    const ocas = ocasionManiqui || ocasiones[0];
    setLoadingManiqui(true);
    setCalConfirmado(false);
    try {
      const mensajeGeneracion = outfitIds.length > 0
        ? `${ocas.prompt}. Genera un outfit COMPLETAMENTE DIFERENTE al anterior, usando distintas prendas de mi closet.`
        : ocas.prompt;

      const res = await axios.post(`${API_URL}/api/fashion`, {
        mensaje: mensajeGeneracion,
        historial: [],
        outfit_ids_anteriores: outfitIds,
      });

      if (Array.isArray(res.data?.outfit) && res.data.outfit.length > 0) {
        setOutfit(res.data.outfit);
        setOutfitIds(res.data.outfit.map((p) => p.id));
        setOutfitGuardado(null);
      } else if (res.data?.outfit_guardado) {
        setOutfitGuardado(res.data.outfit_guardado);
        setOutfit([]);
        setOutfitIds([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingManiqui(false);
    }
  }

  async function handleSwap(tipo) {
    setSwapTipo(tipo);
    // Si ya tenemos prendas cacheadas, las usamos sin mostrar loading
    if (prendasCacheRef.current) {
      setSwapPrendas(prendasCacheRef.current);
      return;
    }
    setSwapLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/prendas`);
      prendasCacheRef.current = res.data || [];
      setSwapPrendas(prendasCacheRef.current);
    } catch (err) {
      console.error(err);
      setSwapPrendas([]);
    } finally {
      setSwapLoading(false);
    }
  }

  function handleSeleccionarPrenda(prenda) {
    setOutfit(prev => {
      const sinTipo = prev.filter(p => getTipoPrenda(p.descripcion || "") !== swapTipo);
      return [...sinTipo, prenda];
    });
    setSwapTipo(null);
  }

  const tieneOutfit = outfit.length > 0 || !!outfitGuardado;

  const hints = React.useMemo(() => {
    const climaLabel  = clima ? `${clima.icon} ${clima.temp}° en ${clima.city} · ¿Qué me pongo hoy?` : "Outfit para hoy según el clima";
    const climaPrompt = clima
      ? `El clima en ${clima.city} está a ${clima.temp}°C (sensación ${clima.feels}°C) con ${clima.label.toLowerCase()}. Arma un outfit completo de mi closet perfectamente adaptado para estas condiciones de hoy.`
      : "Arma un outfit para hoy según el clima actual";
    return [
      { label: climaLabel,                            prompt: climaPrompt,                                            autoSend: true  },
      { label: "¿Qué me pongo para trabajar?",        prompt: "Necesito un outfit profesional para ir a trabajar hoy", autoSend: false },
      { label: "Algo casual para el fin de semana",   prompt: "Arma un look casual y cómodo para el fin de semana",   autoSend: false },
    ];
  }, [clima]);

  function parseBold(text) {
    return text.split(/(\*\*[^*]+\*\*)/g).map((seg, j) =>
      seg.startsWith("**") && seg.endsWith("**")
        ? <strong key={j}>{seg.slice(2, -2)}</strong>
        : seg
    );
  }

  function parseChat(text) {
    if (!text) return null;
    const normalized = text.replace(/ - \*\*/g, "\n- **").trim();
    return normalized.split("\n").map((line, i) => {
      if (!line.trim()) return <br key={i} />;
      const isBullet = line.trimStart().startsWith("- ");
      const content  = isBullet ? line.trimStart().slice(2) : line;

      if (isBullet) {
        // Patrón **Label**: descripción → label en su propia línea
        const m = content.match(/^\*\*([^*]+)\*\*[:\s]\s*(.*)/s);
        if (m) {
          return (
            <div key={i} className="chat-item">
              <span className="chat-item-dot">·</span>
              <div className="chat-item-body">
                <strong className="chat-item-label">{m[1]}:</strong>
                {m[2] && <span className="chat-item-desc">{m[2]}</span>}
              </div>
            </div>
          );
        }
        return (
          <div key={i} className="chat-item">
            <span className="chat-item-dot">·</span>
            <span>{parseBold(content)}</span>
          </div>
        );
      }

      return <p key={i} className="chat-para">{parseBold(content)}</p>;
    });
  }

  return (
    <>
      <div ref={fondoRef} className={`asistente-fondo ${tieneOutfit && modo === "chat" ? "sheet-visible" : ""}`}>
        <div className={`asistente-layout ${modo === "maniqui" ? "layout-maniqui" : ""}`}>

          {/* ── CARD PRINCIPAL ── */}
          <div className="asistente-card">

            {/* Header — HUD macOS */}
            <div className="asistente-hud">
              <div className="asistente-mac-dots">
                <span className="asistente-mac-dot red"    />
                <span className="asistente-mac-dot yellow" />
                <span className="asistente-mac-dot green"  />
              </div>

              <div className="asistente-hud-center">
                <div className="asistente-avatar">✦</div>
                <div className="asistente-header-info">
                  <h1>{modo === "chat" ? "Asistente de Moda" : "Probador Virtual"}</h1>
                  <p>
                    <span className="asistente-status-dot" />
                    Activo · Closet IA
                  </p>
                </div>
              </div>

              <div className="asistente-hud-right">
                {clima && (
                  <div
                    className={`clima-chip ${showForecast ? "clima-chip--open" : ""}`}
                    onClick={() => clima.forecast?.length && setShowForecast(p => !p)}
                    title={`${clima.label} · Sensación ${clima.feels}°C · Viento ${clima.wind} km/h`}
                  >
                    <span className="clima-icon">{clima.icon}</span>
                    <span className="clima-temp">{clima.temp}°</span>
                    <span className="clima-ciudad">{clima.city}</span>
                    {clima.forecast?.length > 0 && (
                      <span className="clima-chevron">{showForecast ? "▴" : "▾"}</span>
                    )}
                  </div>
                )}
                {modo === "chat" && chat.length > 0 && (
                  <button className="btn-clear-chat" onClick={handleClearChat}>
                    🗑
                  </button>
                )}
              </div>
            </div>

            {/* ── Pronóstico inline (se abre al hacer clic en el chip de clima) ── */}
            {showForecast && clima?.forecast?.length > 0 && (
              <div className="forecast-inline" ref={forecastRef}>
                {clima.forecast.map((day, i) => (
                  <div key={i} className="cfd-card">
                    <span className="cfd-dia">{day.dia}</span>
                    <span className="cfd-icon">{day.icon}</span>
                    <div className="cfd-temps">
                      <span className="cfd-max">{day.maxTemp}°</span>
                      <span className="cfd-min">{day.minTemp}°</span>
                    </div>
                    <span className="cfd-hint">{day.outfitHint}</span>
                    {day.lluvia >= 40 && (
                      <span className="cfd-lluvia">💧{day.lluvia}%</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* ── Modo toggle ── */}
            <div className="modo-toggle-wrap">
              <div className="modo-toggle">
                <button
                  className={`modo-btn ${modo === "chat" ? "activo" : ""}`}
                  onClick={() => setModo("chat")}
                >
                  💬 Chat
                </button>
                <button
                  className={`modo-btn ${modo === "maniqui" ? "activo" : ""}`}
                  onClick={() => setModo("maniqui")}
                >
                  👔 Probador
                </button>
              </div>
            </div>

            {modo === "chat" ? (
              <>
                {/* Mensajes */}
                <div className="chat-box">
                  {chat.length === 0 ? (
                    <div className="chat-placeholder">
                      <div className="chat-placeholder-icon">✦</div>
                      <p className="chat-placeholder-title">Tu estilista personal con IA</p>
                      <div className="chat-placeholder-hints">
                        {hints.map((h, i) => (
                          <button
                            key={i}
                            className={`chat-hint ${h.autoSend ? "chat-hint--clima" : ""}`}
                            onClick={() => handleHint(h)}
                          >
                            <span>{h.label}</span>
                            <span className="chat-hint-arrow">{h.autoSend ? "✦" : "→"}</span>
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
                            {msg.role === "assistant" ? parseChat(msg.text) : msg.text}
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
                      onFocus={() => {
                        setTimeout(() => {
                          chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
                        }, 350);
                      }}
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
              </>
            ) : (
              /* ── MODO MANIQUÍ ── */
              <div className="maniqui-ctrl">
                <div className="maniqui-ctrl-body">
                  {outfit.length > 0 ? (
                    <div className="maniqui-inline-display">
                      <VirtualMannequin outfit={outfit} onSwap={handleSwap} />
                      <p className="maniqui-swap-hint">
                        Toca una prenda para cambiarla por algo de tu closet
                      </p>
                    </div>
                  ) : (
                    <p className="maniqui-ctrl-hint">
                      Elige una ocasión y genera un outfit completo con tus prendas
                    </p>
                  )}
                  <div className="ocasion-chips-wrap maniqui-chips">
                    {ocasiones.map((o) => (
                      <button
                        key={o.id}
                        className={`ocasion-chip ${ocasionManiqui?.id === o.id ? "activa" : ""}`}
                        onClick={() => setOcasionManiqui(prev => prev?.id === o.id ? null : o)}
                        disabled={loadingManiqui}
                      >
                        <span className="ocasion-chip-icon">{o.icon}</span>
                        <span>{o.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="maniqui-ctrl-footer">
                  <div className="maniqui-generar-row">
                    <button
                      className="btn-generar-outfit"
                      onClick={handleGenerarOutfit}
                      disabled={loadingManiqui}
                    >
                      {loadingManiqui ? (
                        <div className="chat-loader">
                          <span className="dot" /><span className="dot" /><span className="dot" />
                        </div>
                      ) : (
                        "✨ Generar outfit"
                      )}
                    </button>
                    {tieneOutfit && (
                      calConfirmado ? (
                        <span className="cal-confirmado-badge" title="Guardado en el calendario">✅</span>
                      ) : (
                        <button className="btn-add-cal-icon" title="Agregar al calendario" onClick={() => {
                          setFechaSeleccionada(new Date().toISOString().split("T")[0]);
                          setShowCalPicker(true);
                        }}>📅</button>
                      )
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── PANEL OUTFIT desktop — solo en modo chat ── */}
          {modo === "chat" && <div className="outfit-panel">

            {/* HUD macOS */}
            <div className="outfit-panel-hud">
              <div className="asistente-mac-dots">
                <span className="asistente-mac-dot red"    />
                <span className="asistente-mac-dot yellow" />
                <span className="asistente-mac-dot green"  />
              </div>
              <div className="outfit-panel-hud-center">
                <div className="outfit-panel-icon">👔</div>
                <h3>Outfit sugerido</h3>
              </div>
              <div className="outfit-panel-hud-right">
                {tieneOutfit && !loading && (
                  calConfirmado ? (
                    <span className="cal-confirmado-badge" title="Guardado en el calendario">✅</span>
                  ) : (
                    <button className="btn-add-cal-icon" title="Agregar al calendario" onClick={() => {
                      setFechaSeleccionada(new Date().toISOString().split("T")[0]);
                      setShowCalPicker(true);
                    }}>📅</button>
                  )
                )}
              </div>
            </div>

            {/* Contenido */}
            <div className="outfit-panel-body">
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
                <VirtualMannequin
                  outfit={outfit}
                  onSwap={modo === "maniqui" ? handleSwap : undefined}
                />
              )}
            </div>
          </div>}
        </div>

        {/* ── Modal calendario ── */}
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

        {/* ── Modal swap (intercambiar prenda) ── */}
        {swapTipo && (() => {
          const filtradas = swapPrendas.filter(p => getTipoPrenda(p.descripcion || "") === swapTipo);
          const etiquetas = {
            "gorra": "gorras", "abrigo": "chaquetas / abrigos",
            "parte superior": "camisetas", "parte inferior": "pantalones",
            "calzado": "calzado", "accesorio": "accesorios",
          };
          return (
            <div className="cal-picker-overlay" onClick={() => setSwapTipo(null)}>
              <div className="swap-modal" onClick={(e) => e.stopPropagation()}>
                <button className="cal-picker-close" onClick={() => setSwapTipo(null)}>✕</button>
                <h3>Cambiar {etiquetas[swapTipo] || swapTipo}</h3>
                <p>Solo se muestran prendas de esta categoría</p>
                {swapLoading ? (
                  <div className="swap-loading">
                    <div className="chat-loader">
                      <span className="dot" /><span className="dot" /><span className="dot" />
                    </div>
                  </div>
                ) : filtradas.length === 0 ? (
                  <p className="swap-empty">No tienes {etiquetas[swapTipo] || swapTipo} en tu closet.</p>
                ) : (
                  <div className="swap-grid">
                    {filtradas.map(p => (
                      <div key={p.id} className="swap-item" onClick={() => handleSeleccionarPrenda(p)}>
                        <img src={p.imagen_url} alt={p.descripcion} />
                        <span>{p.descripcion?.split(" - ")[0]}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </div>

      {/* ══════════════════════════════════════
          📱 BOTTOM SHEET — fuera del fondo
      ══════════════════════════════════════ */}
      {tieneOutfit && modo === "chat" && (
        <div
          className={`outfit-sheet-backdrop ${showOutfitSheet ? "open" : ""}`}
          onClick={() => setShowOutfitSheet(false)}
        />
      )}

      <div className={`outfit-sheet ${tieneOutfit && modo === "chat" ? "has-outfit" : ""} ${showOutfitSheet && modo === "chat" ? "expanded" : ""}`}>

        {/* Handle — toca para expandir/contraer */}
        <div className="outfit-sheet-handle-wrap" onClick={() => setShowOutfitSheet(!showOutfitSheet)}>
          <div className="outfit-sheet-handle" />
          <div className="outfit-sheet-preview-bar">
            <div className="outfit-sheet-thumbs">
              {outfitGuardado ? (
                <img src={outfitGuardado.imagen_url} alt="" className="outfit-sheet-thumb" />
              ) : (
                outfit.slice(0, 3).map((p, i) => (
                  <img key={i} src={p.imagen_url} alt="" className="outfit-sheet-thumb" />
                ))
              )}
            </div>
            <div className="outfit-sheet-info">
              <p className="outfit-sheet-title">Outfit sugerido</p>
              <p className="outfit-sheet-sub">
                {outfitGuardado
                  ? outfitGuardado.descripcion?.slice(0, 40) + "..."
                  : `${outfit.length} prenda${outfit.length !== 1 ? "s" : ""}`}
              </p>
            </div>
            <span className="outfit-sheet-arrow">{showOutfitSheet ? "↓" : "↑"}</span>
          </div>
        </div>

        {/* Contenido expandido */}
        <div className="outfit-sheet-content">
          {outfitGuardado ? (
            <div style={{ position: "relative" }}>
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
              {calConfirmado ? (
                <span className="cal-confirmado-badge sheet-cal-float" title="Guardado en el calendario">✅</span>
              ) : (
                <button className="btn-add-cal-icon sheet-cal-float" title="Agregar al calendario" onClick={() => {
                  setFechaSeleccionada(new Date().toISOString().split("T")[0]);
                  setShowCalPicker(true);
                }}>📅</button>
              )}
            </div>
          ) : outfit.length > 0 && (
            modo === "maniqui" ? (
              <VirtualMannequin
                outfit={outfit}
                onSwap={handleSwap}
                calAction={calConfirmado ? (
                  <span className="cal-confirmado-badge" title="Guardado en el calendario">✅</span>
                ) : (
                  <button className="btn-add-cal-icon" title="Agregar al calendario" onClick={() => {
                    setFechaSeleccionada(new Date().toISOString().split("T")[0]);
                    setShowCalPicker(true);
                  }}>📅</button>
                )}
              />
            ) : (
              <div style={{ position: "relative" }}>
                <div className="outfit-sheet-grid">
                  {outfit.map((p, i) => (
                    <div key={i} className="outfit-sheet-card">
                      <img src={p.imagen_url} alt={p.descripcion} />
                      <p>{p.descripcion?.split("(")[0]?.trim()}</p>
                    </div>
                  ))}
                </div>
                {calConfirmado ? (
                  <span className="cal-confirmado-badge sheet-cal-float" title="Guardado en el calendario">✅</span>
                ) : (
                  <button className="btn-add-cal-icon sheet-cal-float" title="Agregar al calendario" onClick={() => {
                    setFechaSeleccionada(new Date().toISOString().split("T")[0]);
                    setShowCalPicker(true);
                  }}>📅</button>
                )}
              </div>
            )
          )}
        </div>
      </div>
    </>
  );
}
