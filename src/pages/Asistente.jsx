import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Footprints, Briefcase, Moon, Zap, PartyPopper, Plane, Trash2, Shirt, Mic, MicOff, History, X, Flame } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import axios from "axios";
import "./Asistente.css";
import VirtualMannequin from "../components/VirtualMannequin";
import { API_URL } from "../config";
import { supabase, getAuthHeaders } from "../supabase";
import { getWeather } from "../services/weatherService";
import { haptics } from "../hooks/useHaptics";

const TIPOS_VALIDOS = ["parte superior","parte inferior","calzado","abrigo","gorra","accesorio"];

function getTipoTexto(descripcion = "") {
  const d = descripcion.toLowerCase();
  if (d.includes("abrigo") || d.includes("chaqueta") || d.includes("jacket") || d.includes("hoodie") || d.includes("sudadera")) return "abrigo";
  if (d.includes("gorra") || d.includes("sombrero") || d.includes("gorro") || d.includes("beanie") || d.includes("snapback")) return "gorra";
  if (d.includes("superior") || d.includes("camiseta") || d.includes("camisa") || d.includes("polo") || d.includes("blusa") || d.includes("playera") || d.includes("top")) return "parte superior";
  if (d.includes("inferior") || d.includes("pantalón") || d.includes("pantalon") || d.includes("jean") || d.includes("short") || d.includes("falda") || d.includes("pants")) return "parte inferior";
  if (d.includes("calzado") || d.includes("tenis") || d.includes("zapato") || d.includes("bota") || d.includes("zapatilla") || d.includes("sandalia") || d.includes("sneaker")) return "calzado";
  const tipoFinal = descripcion.split(" - ").pop()?.trim().toLowerCase();
  if (TIPOS_VALIDOS.includes(tipoFinal)) return tipoFinal;
  return "parte superior";
}

// Usa metadata_ia.tipo (más fiable) antes de recurrir al texto
function getCategoriaPrenda(prenda) {
  const meta = prenda.metadata_ia?.tipo?.toLowerCase();
  if (meta && TIPOS_VALIDOS.includes(meta)) return meta;
  return getTipoTexto(prenda.descripcion || "");
}

// Compatibilidad con VirtualMannequin que pasa string
function getTipoPrenda(descripcion = "") {
  return getTipoTexto(descripcion);
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

  const [showForecast,   setShowForecast]   = useState(false);
  const [escuchando,     setEscuchando]     = useState(false);
  const [showHistorial,  setShowHistorial]  = useState(false);
  const [racha,          setRacha]          = useState(0);
  const [rachaKey,       setRachaKey]       = useState(0);
  const [historial,      setHistorial]      = useState(() => {
    try { return JSON.parse(localStorage.getItem(`asistente_historial_${usuarioId}`)) || []; }
    catch { return []; }
  });
  const [sugerencias, setSugerencias] = useState([]);

  const reconRef    = useRef(null);
  const streamAbort = useRef(null);

  const chatEndRef       = useRef(null);

  // Cancelar stream al desmontar
  useEffect(() => () => streamAbort.current?.abort(), []);
  const chatBoxRef       = useRef(null);
  const textareaRef      = useRef(null);
  const prendasCacheRef  = useRef(null);
  const forecastRef      = useRef(null);
  const fondoRef         = useRef(null);

  // Teclado estilo WhatsApp: sube al abrir, baja al cerrar
  useEffect(() => {
    const scrollBottom = () => {
      const el = chatBoxRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    };

    const setBottom = (px) => {
      if (!fondoRef.current) return;
      if (px > 0) {
        fondoRef.current.style.bottom = `${px}px`; // inline style gana sobre CSS sin !important
      } else {
        fondoRef.current.style.bottom = "";         // restaura el valor CSS
      }
    };

    let cleanupNative = () => {};
    let isMounted = true;

    if (Capacitor.isNativePlatform()) {
      // Capacitor nativo: usar eventos del Keyboard plugin (da la altura exacta desde la capa nativa)
      import("@capacitor/keyboard").then(({ Keyboard }) => {
        if (!isMounted) return; // componente desmontado antes de que resolviera el import

        let heightBeforeKb = window.innerHeight;

        const h1 = Keyboard.addListener("keyboardWillShow", (info) => {
          heightBeforeKb = window.innerHeight;
          setBottom(info.keyboardHeight);
        });

        const h2 = Keyboard.addListener("keyboardDidShow", () => {
          // Si resize:ionic funcionó, el viewport ya se encogió → limpiar el inline style
          // y dejar que el CSS (bottom:76px) funcione en el viewport más pequeño
          if (window.innerHeight < heightBeforeKb - 50) {
            setBottom(0);
          }
          scrollBottom();
        });

        const h3 = Keyboard.addListener("keyboardWillHide", () => {
          setBottom(0);
        });

        cleanupNative = () => {
          h1.then(h => h.remove());
          h2.then(h => h.remove());
          h3.then(h => h.remove());
        };
      }).catch(err => console.error("Keyboard import failed:", err));
    } else {
      // Safari web: visualViewport da la diferencia entre viewport layout y visual
      const vv = window.visualViewport;
      if (vv) {
        const onVVResize = () => {
          const kbH = Math.max(0, window.innerHeight - vv.height);
          setBottom(kbH > 80 ? kbH : 0);
          scrollBottom();
        };
        vv.addEventListener("resize", onVVResize);
        cleanupNative = () => vv.removeEventListener("resize", onVVResize);
      }
    }

    // ResizeObserver: scroll al fondo cuando el chat-box se encoge (teclado en Capacitor)
    let ro = null;
    const target = chatBoxRef.current;
    if (target && typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(scrollBottom);
      ro.observe(target);
    }

    return () => {
      isMounted = false;
      cleanupNative();
      if (ro) ro.disconnect();
    };
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

  const lastWeatherRef = useRef(0);
  const WEATHER_TTL    = 20 * 60 * 1000; // refrescar si han pasado 20 min o si hay nueva ubicación

  async function actualizarClima(forzar = false) {
    const ahora = Date.now();
    if (!forzar && ahora - lastWeatherRef.current < WEATHER_TTL) return;
    try {
      const w = await getWeather();
      // Si la ciudad cambió, es un viaje — siempre actualiza
      setClima(prev => {
        if (!prev || prev.city !== w.city || forzar) {
          lastWeatherRef.current = ahora;
          return w;
        }
        lastWeatherRef.current = ahora;
        return w;
      });
    } catch { /* sin ubicación — no bloquear */ }
  }

  const appListenerRef = useRef(null);
  useEffect(() => {
    actualizarClima(true); // primera carga siempre

    // Refrescar cuando la app vuelve al frente (viaje, bloqueo de pantalla, etc.)
    const onVisible = () => {
      if (document.visibilityState === "visible") actualizarClima();
    };
    document.addEventListener("visibilitychange", onVisible);

    if (Capacitor.isNativePlatform()) {
      import("@capacitor/app").then(({ App }) => {
        App.addListener("appStateChange", ({ isActive }) => {
          if (isActive) actualizarClima();
        }).then(l => { appListenerRef.current = l; });
      }).catch(() => {});
    }

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      appListenerRef.current?.remove?.();
    };
  }, []);

  // Carga racha y programa notificación diaria
  useEffect(() => {
    if (!usuarioId) return;
    let cancelled = false;
    async function cargarRacha() {
      try {
        const headers = getAuthHeaders();
        const res = await axios.get(`${API_URL}/api/racha`, { headers });
        if (cancelled) return;
        const { racha: r, registroHoy } = res.data;
        setRacha(r);
        programarNotificacion(r, registroHoy);
      } catch {}
    }
    cargarRacha();
    return () => { cancelled = true; };
  }, [usuarioId, rachaKey]);

  useEffect(() => {
    const onRefresh = () => setRachaKey(k => k + 1);
    window.addEventListener('auth-token-refreshed', onRefresh);
    return () => window.removeEventListener('auth-token-refreshed', onRefresh);
  }, []);

  async function programarNotificacion(r, registroHoy) {
    if (!Capacitor.isNativePlatform()) return;
    try {
      const { display } = await LocalNotifications.requestPermissions();
      if (display !== "granted") return;
      await LocalNotifications.cancel({ notifications: [{ id: 77 }] });

      const mañana = new Date();
      mañana.setDate(mañana.getDate() + (registroHoy ? 1 : 0));
      mañana.setHours(19, 0, 0, 0);
      if (mañana <= new Date()) mañana.setDate(mañana.getDate() + 1);

      const body = r > 1
        ? `🔥 Llevas ${r} días seguidos. ¡Elige tu outfit y no pierdas la racha!`
        : "¿Ya tienes tu outfit de hoy? Arma uno con IA ✨";

      await LocalNotifications.schedule({
        notifications: [{
          id: 77,
          title: "Be: Confident",
          body,
          schedule: { at: mañana },
          smallIcon: "ic_launcher",
          iconColor: "#8b5cf6",
        }],
      });
    } catch { /* notificaciones no críticas */ }
  }

  // Prefetch prendas al entrar al modo probador para que el swap sea instantáneo
  useEffect(() => {
    if (modo !== "maniqui" || !usuarioId) return;
    prendasCacheRef.current = null; // invalidar en cada entrada para evitar datos viejos
    let cancelled = false;
    async function prefetchPrendas() {
      try {
        const headers = getAuthHeaders();
        const res = await axios.get(`${API_URL}/api/prendas`, { params: { tipo: "prenda" }, headers });
        if (!cancelled) prendasCacheRef.current = res.data || [];
      } catch {}
    }
    prefetchPrendas();
    return () => { cancelled = true; };
  }, [modo, usuarioId]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_CHAT, JSON.stringify(chat.slice(-100))); } catch {}
  }, [chat]);
  useEffect(() => { localStorage.setItem(STORAGE_OUTFIT, JSON.stringify(outfit)); }, [outfit]);
  useEffect(() => { localStorage.setItem(STORAGE_OUTFIT_IDS, JSON.stringify(outfitIds)); }, [outfitIds]);
  useEffect(() => { localStorage.setItem(STORAGE_OUTFIT_GUARDADO, JSON.stringify(outfitGuardado)); }, [outfitGuardado]);

  useEffect(() => {
    const el = chatBoxRef.current;
    if (el) el.scrollTop = el.scrollHeight;
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
    { id: "casual",  Icon: Footprints,   label: "Casual",  prompt: "Arma un outfit casual y cómodo para el día a día" },
    { id: "trabajo", Icon: Briefcase,    label: "Trabajo", prompt: "Necesito un outfit profesional para ir a trabajar u oficina" },
    { id: "cita",    Icon: Moon,         label: "Cita",    prompt: "Arma un outfit para una cita romántica, que se vea cuidado y atractivo" },
    { id: "deporte", Icon: Zap,          label: "Deporte", prompt: "Arma un outfit deportivo para hacer ejercicio o entrenamiento físico" },
    { id: "salida",  Icon: PartyPopper,  label: "Salida",  prompt: "Arma un outfit para salir de noche con amigos, que se vea moderno y divertido" },
    { id: "viaje",   Icon: Plane,        label: "Viaje",   prompt: "Necesito un outfit cómodo pero estiloso para viajar" },
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

    // Cancelar stream anterior si existe
    streamAbort.current?.abort();
    streamAbort.current = new AbortController();

    setChat((prev) => [...prev, { role: "user", text: texto }]);
    if (typeof textoDirecto !== "string") setMensaje("");
    setOcasionActiva(null);
    setSugerencias([]);
    setLoading(true);
    setCalConfirmado(false);

    const climaPayload = clima ? {
      temp: clima.temp, feels: clima.feels, wind: clima.wind,
      city: clima.city, label: clima.label, rain_prob: clima.rain_prob ?? 0,
    } : null;

    let msgAdded = false;
    let accText = "";

    try {
      const response = await fetch(`${API_URL}/api/fashion/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          mensaje: texto,
          historial: chat.slice(-8),
          outfit_ids_anteriores: outfitIds,
          clima: climaPayload,
        }),
        signal: streamAbort.current.signal,
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const processEvent = (event) => {
        if (event.type === "text") {
          accText += event.chunk;
          if (!msgAdded) {
            msgAdded = true;
            setLoading(false);
            setChat((prev) => [...prev, { role: "assistant", text: accText, streaming: true }]);
          } else {
            setChat((prev) => {
              const next = [...prev];
              const last = next[next.length - 1];
              if (last?.streaming) next[next.length - 1] = { ...last, text: accText };
              return next;
            });
          }
        } else if (event.type === "done") {
          haptics.success();
          setChat((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last?.streaming) next[next.length - 1] = { ...last, streaming: false };
            return next;
          });
          const rawSugs = Array.isArray(event.sugerencias) ? event.sugerencias : [];
          const normalSugs = rawSugs
            .map(s => typeof s === "string" ? { text: s, action: "chat" } : s)
            .filter(s => s && typeof s.text === "string" && s.text.trim());
          setSugerencias(normalSugs);
          const cambiarPanel = event.cambiar_panel ?? true;
          if (cambiarPanel) {
            if (event.outfit_guardado) {
              setOutfitGuardado(event.outfit_guardado);
              setOutfit([]); setOutfitIds([]);
            } else if (event.outfit?.length) {
              setOutfit(event.outfit);
              setOutfitIds(event.outfit.map((p) => p.id));
              setOutfitGuardado(null);
            }
            setRachaKey((k) => k + 1);
          }
          setLoading(false);
        } else if (event.type === "error") {
          throw new Error(event.message);
        }
      };

      outer: while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (raw === "[DONE]") break outer;
          try { processEvent(JSON.parse(raw)); } catch { /* chunk mal formado */ }
        }
      }
    } catch (err) {
      if (err.name === "AbortError") return;
      setChat((prev) => [
        ...prev,
        { role: "assistant", text: "⚠️ Ocurrió un error al generar la recomendación." },
      ]);
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
    /* Guardar sesión en historial antes de borrar */
    if (chat.length > 0) {
      const sesion = {
        id: Date.now(),
        fecha: new Date().toLocaleDateString("es-ES", { day: "numeric", month: "long" }),
        hora: new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }),
        resumen: chat.find(m => m.role === "user")?.text?.slice(0, 60) || "Conversación",
        mensajes: chat,
      };
      const nuevo = [sesion, ...historial].slice(0, 15);
      setHistorial(nuevo);
      localStorage.setItem(`asistente_historial_${usuarioId}`, JSON.stringify(nuevo));
    }
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

  /* ── Voz (Web Speech API) ── */
  function toggleVoz() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    if (escuchando) {
      reconRef.current?.stop();
      setEscuchando(false);
      return;
    }
    const recon = new SR();
    recon.lang = "es-ES";
    recon.continuous = false;
    recon.interimResults = false;
    recon.onresult = (e) => {
      const texto = e.results[0][0].transcript;
      setMensaje(prev => (prev ? prev + " " + texto : texto));
    };
    recon.onend = () => setEscuchando(false);
    recon.onerror = () => setEscuchando(false);
    reconRef.current = recon;
    recon.start();
    setEscuchando(true);
  }

  /* ── Restaurar sesión del historial ── */
  function restaurarSesion(sesion) {
    setChat(sesion.mensajes);
    setShowHistorial(false);
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
      }, { headers: getAuthHeaders() });

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
      }, { headers: getAuthHeaders() });

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
      const res = await axios.get(`${API_URL}/api/prendas`, { params: { tipo: "prenda" }, headers: getAuthHeaders() });
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
    const sinTipo = outfit.filter(p => getTipoPrenda(p.descripcion || "") !== swapTipo);
    const newOutfit = [...sinTipo, prenda];
    setOutfit(newOutfit);
    setOutfitIds(newOutfit.map(p => p.id));
    const nombrePrenda = prenda.descripcion?.split(" - ")[0] || "prenda";
    setChat(prev => {
      const last = prev[prev.length - 1];
      if (last?.role === "user") {
        return [...prev, { role: "assistant", text: `Listo, cambié la prenda por **${nombrePrenda}**. ¿El look quedó bien?` }];
      }
      return [...prev, { role: "assistant", text: `Cambié por **${nombrePrenda}**. ¿Lo ajusto en algo más?` }];
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
    if (!text || typeof text !== "string") return null;
    const unescaped = text.replace(/\\n/g, "\n");
    const normalized = unescaped.replace(/ - \*\*/g, "\n- **").trim();
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
                <div
                  className={`racha-badge ${racha === 0 ? "racha-badge--cero" : ""}`}
                  title={racha > 0
                    ? `${racha} día${racha !== 1 ? "s" : ""} seguido${racha !== 1 ? "s" : ""} con outfit`
                    : "Aún no has generado ningún outfit — ¡empieza hoy!"}
                >
                  <Flame size={14} />
                  <span>{racha}</span>
                </div>
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
                    <Trash2 size={15} />
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
                  <Shirt size={14} /> Probador
                </button>
              </div>
            </div>

            {modo === "chat" ? (
              <>
                {/* Mensajes */}
                <div className="chat-box" ref={chatBoxRef}>
                  {chat.length === 0 ? (
                    <motion.div
                      className="chat-placeholder"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4 }}
                    >
                      <div className="chat-placeholder-icon">✦</div>
                      <p className="chat-placeholder-title">Tu estilista personal con IA</p>
                      <div className="chat-placeholder-hints">
                        {hints.map((h, i) => (
                          <motion.button
                            key={i}
                            className={`chat-hint ${h.autoSend ? "chat-hint--clima" : ""}`}
                            onClick={() => handleHint(h)}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.07 }}
                          >
                            <span>{h.label}</span>
                            <span className="chat-hint-arrow">{h.autoSend ? "✦" : "→"}</span>
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                  ) : (
                    <AnimatePresence initial={false}>
                      {chat.map((msg, i) => (
                        <motion.div
                          key={i}
                          className={`chat-message-row ${msg.role}`}
                          initial={{ opacity: 0, y: 10, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ duration: 0.25, ease: "easeOut" }}
                        >
                          <div className={`chat-msg-avatar ${msg.role}`}>
                            {msg.role === "assistant" ? "✦" : "👤"}
                          </div>
                          <div className="chat-msg-content">
                            <span className="chat-msg-sender">
                              {msg.role === "assistant" ? "Asistente" : "Tú"}
                            </span>
                            <div className={`chat-bubble ${msg.role}`}>
                              {msg.role === "assistant" ? parseChat(msg.text) : msg.text}
                              {msg.streaming && <span className="stream-cursor" />}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
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

                  {/* ── Quick replies (sugerencias) ── */}
                  <AnimatePresence>
                    {!loading && sugerencias.length > 0 && (
                      <motion.div
                        className="sugerencias-wrap"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        {sugerencias.map((sug, i) => {
                          const label = String(sug.text || "");
                          const action = sug.action || "chat";
                          const actionIcon = action === "remove" ? "✕ " : action === "swap" ? "↕ " : "";
                          const TIPO_LABEL = {
                            "abrigo": "la chaqueta", "calzado": "el calzado",
                            "gorra": "la gorra", "parte superior": "la camiseta",
                            "parte inferior": "el pantalón", "accesorio": "el accesorio",
                          };
                          return (
                            <motion.button
                              key={`${label}-${i}`}
                              className={`sugerencia-chip sugerencia-chip--${action}`}
                              onClick={() => {
                                setSugerencias([]);
                                if (action === "remove" && sug.tipo) {
                                  const newOutfit = outfit.filter(p => getTipoPrenda(p.descripcion) !== sug.tipo);
                                  setOutfit(newOutfit);
                                  setOutfitIds(newOutfit.map(p => p.id));
                                  setChat(prev => [
                                    ...prev,
                                    { role: "user", text: label },
                                    { role: "assistant", text: `Listo, quité ${TIPO_LABEL[sug.tipo] || "la prenda"} del look. ¿Lo ajusto en algo más?` },
                                  ]);
                                } else if (action === "swap" && sug.tipo) {
                                  setChat(prev => [...prev, { role: "user", text: label }]);
                                  handleSwap(sug.tipo);
                                } else {
                                  handleRecommend(label);
                                }
                              }}
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: i * 0.06 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              {actionIcon}{label}
                            </motion.button>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>

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
                      <o.Icon size={14} className="ocasion-chip-icon" />
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
                          if (chatBoxRef.current)
                            chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
                        }, 300);
                      }}
                      disabled={loading}
                      rows={1}
                    />
                    <button
                      onClick={toggleVoz}
                      className={`btn-voz ${escuchando ? "escuchando" : ""}`}
                      title={escuchando ? "Detener" : "Hablar"}
                      disabled={loading}
                    >
                      {escuchando ? <MicOff size={16} /> : <Mic size={16} />}
                    </button>
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
                        <o.Icon size={14} className="ocasion-chip-icon" />
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
                <Shirt size={20} className="outfit-panel-icon" />
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
                  <img src={outfitGuardado.imagen_url} alt={outfitGuardado.descripcion} loading="lazy" />
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
                <img src={outfitGuardado.imagen_url} alt="" className="outfit-sheet-thumb" loading="lazy" />
              ) : (
                outfit.slice(0, 3).map((p, i) => (
                  <img key={i} src={p.imagen_url} alt="" className="outfit-sheet-thumb" loading="lazy" />
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
                <img src={outfitGuardado.imagen_url} alt={outfitGuardado.descripcion} loading="lazy" />
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
                      <img src={p.imagen_url} alt={p.descripcion} loading="lazy" />
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

      {/* ── Modal calendario (fuera del fondo para z-index correcto) ── */}
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

      {/* ── Modal swap (fuera del fondo para z-index correcto) ── */}
      {swapTipo && (() => {
        const filtradas = swapPrendas.filter(p => getCategoriaPrenda(p) === swapTipo);
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
                      <img src={p.imagen_url} alt={p.descripcion} loading="lazy" />
                      <span>{p.descripcion?.split(" - ")[0]}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── FAB Historial ── */}
      {historial.length > 0 && (
        <motion.button
          className="asistente-historial-fab"
          onClick={() => setShowHistorial(true)}
          title="Ver historial"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
        >
          <History size={18} />
        </motion.button>
      )}

      {/* ── Modal Historial ── */}
      <AnimatePresence>
        {showHistorial && (
          <motion.div
            className="historial-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowHistorial(false)}
          >
            <motion.div
              className="historial-modal"
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.96 }}
              transition={{ duration: 0.25 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="historial-header">
                <h3>Historial de conversaciones</h3>
                <button className="historial-close" onClick={() => setShowHistorial(false)}>
                  <X size={16} />
                </button>
              </div>
              <div className="historial-list">
                {historial.map(ses => (
                  <div key={ses.id} className="historial-item" onClick={() => restaurarSesion(ses)}>
                    <div className="historial-item-info">
                      <p className="historial-item-resumen">{ses.resumen}</p>
                      <p className="historial-item-fecha">{ses.fecha} · {ses.hora} · {ses.mensajes.length} msgs</p>
                    </div>
                    <span className="historial-item-arrow">→</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
