import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Upload, Scissors, Brain, CheckCircle2, AlertTriangle,
  Camera, Image, Shirt, Layers, ArrowRight, ArrowLeft, RotateCcw,
  X, Plus, Loader2,
} from "lucide-react";
import "./UploadModal.css";
import { supabase } from "../supabase";
import axios from "axios";
import { API_URL } from "../config";
import { useNativeCamera } from "../hooks/useNativeCamera";
import { haptics } from "../hooks/useHaptics";
import { Capacitor } from "@capacitor/core";

async function comprimirImagen(file, maxWidth = 1200, quality = 0.82) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const ratio = Math.min(1, maxWidth / img.naturalWidth);
      const canvas = document.createElement("canvas");
      canvas.width  = Math.round(img.naturalWidth  * ratio);
      canvas.height = Math.round(img.naturalHeight * ratio);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => resolve(blob ? new File([blob], file.name.replace(/\.[^.]+$/, ".webp"), { type: "image/webp" }) : file),
        "image/webp",
        quality,
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

const ETAPAS = [
  { hasta: 20,  label: "Subiendo imagen...",   Icon: Upload       },
  { hasta: 65,  label: "Removiendo fondo...",  Icon: Scissors     },
  { hasta: 90,  label: "Analizando con IA...", Icon: Brain        },
  { hasta: 100, label: "Listo",                Icon: CheckCircle2 },
];
function etapaInfo(p) { return ETAPAS.find(e => p <= e.hasta) || ETAPAS[3]; }

export default function UploadModal({ onClose, onUploaded }) {
  const [step, setStep]             = useState(1);
  const [type, setType]             = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading]   = useState(false);
  const [progreso, setProgreso]     = useState(0);

  const [files,             setFiles]             = useState([]);
  const [previews,          setPreviews]          = useState([]);
  const [statuses,          setStatuses]          = useState([]);
  const [uploadIndex,       setUploadIndex]       = useState(0);
  const [finalOk,           setFinalOk]           = useState(null);
  const [finalMsg,          setFinalMsg]          = useState("");
  const [showSourcePicker,  setShowSourcePicker]  = useState(false);

  const intervaloRef = useRef(null);
  const fileInputRef = useRef(null);
  const { pickPhoto, pickMultiplePhotos } = useNativeCamera();

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => () => clearInterval(intervaloRef.current), []);
  useEffect(() => () => previews.forEach(url => URL.revokeObjectURL(url)), [previews]);

  function iniciarProgreso() {
    setProgreso(0);
    clearInterval(intervaloRef.current);
    intervaloRef.current = setInterval(() => {
      setProgreso(prev => {
        if (prev >= 90) { clearInterval(intervaloRef.current); return 90; }
        const inc = prev < 20 ? 4 : prev < 65 ? 0.8 : 0.3;
        return Math.min(prev + inc, 90);
      });
    }, 200);
  }

  function completarProgreso() {
    clearInterval(intervaloRef.current);
    setProgreso(100);
  }

  const pickType = (t) => { setType(t); setStep(2); };

  const agregarArchivos = useCallback(async (nuevos) => {
    const validos = Array.from(nuevos).filter(f =>
      f.type.startsWith("image/") && f.size <= 10 * 1024 * 1024
    );
    if (!validos.length) return;
    const comprimidos = await Promise.all(validos.map(f => comprimirImagen(f)));
    const urls = comprimidos.map(f => URL.createObjectURL(f));
    setFiles(prev => [...prev, ...comprimidos]);
    setPreviews(prev => [...prev, ...urls]);
    setStatuses(prev => [...prev, ...comprimidos.map(() => "pending")]);
    setFinalMsg("");
  }, []);

  const onDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    agregarArchivos(type === "outfit" ? [e.dataTransfer.files?.[0]] : e.dataTransfer.files);
  };

  const handleFileInput = (e) => { agregarArchivos(e.target.files); e.target.value = ""; };

  const handlePickPhoto = async (sourceOverride = null) => {
    // En web: abre el input multi-archivo directamente
    if (!Capacitor.isNativePlatform()) {
      fileInputRef.current?.click();
      return;
    }
    // En nativo con prenda y sin fuente definida: muestra el picker Cámara/Galería
    if (type === "prenda" && sourceOverride === null) {
      setShowSourcePicker(true);
      return;
    }
    setShowSourcePicker(false);
    // Para galería en nativo: Camera.pickImages() — soporta multi-select y Google Photos
    if (sourceOverride === "photos") {
      const files = await pickMultiplePhotos();
      if (files.length) agregarArchivos(files);
      return;
    }
    // Cámara (o outfit con prompt)
    const f = await pickPhoto(sourceOverride);
    if (f) agregarArchivos([f]);
  };

  const quitarArchivo = (i) => {
    URL.revokeObjectURL(previews[i]);
    setFiles(prev => prev.filter((_, idx) => idx !== i));
    setPreviews(prev => prev.filter((_, idx) => idx !== i));
    setStatuses(prev => prev.filter((_, idx) => idx !== i));
  };

  const resetTodo = () => {
    previews.forEach(url => URL.revokeObjectURL(url));
    setFiles([]); setPreviews([]); setStatuses([]);
    setProgreso(0); setFinalMsg(""); setFinalOk(null); setUploadIndex(0);
  };

  async function onSubmit() {
    if (!files.length || !type) return;
    const total = files.length;
    let subidas = 0, errores = 0;

    try {
      setUploading(true);
      setFinalMsg(""); setFinalOk(null);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("no-auth");
      const user  = session.user;
      const token = session.access_token;

      for (let i = 0; i < total; i++) {
        setUploadIndex(i);
        setStatuses(prev => { const s = [...prev]; s[i] = "uploading"; return s; });
        iniciarProgreso();

        try {
          const fd = new FormData();
          fd.append("imagen", files[i]);
          fd.append("usuario_id", user.id);
          fd.append("tipo", type);
          fd.append("genero", "unisex");
          await axios.post(`${API_URL}/api/subir-prenda`, fd, {
            headers: {
              "Content-Type": "multipart/form-data",
              Authorization: `Bearer ${token}`,
            },
          });
          completarProgreso();
          setStatuses(prev => { const s = [...prev]; s[i] = "done"; return s; });
          haptics.success();
          subidas++;
          if (onUploaded) onUploaded();
        } catch {
          clearInterval(intervaloRef.current);
          setProgreso(0);
          setStatuses(prev => { const s = [...prev]; s[i] = "error"; return s; });
          errores++;
        }

        if (i < total - 1) await new Promise(r => setTimeout(r, 400));
      }

      if (errores === 0) {
        setFinalOk(true);
        setFinalMsg(`${subidas} prenda${subidas !== 1 ? "s" : ""} subida${subidas !== 1 ? "s" : ""} correctamente`);
        setTimeout(() => { resetTodo(); setType(null); setStep(1); }, 2000);
      } else {
        setFinalOk(false);
        setFinalMsg(`${subidas} subida${subidas !== 1 ? "s" : ""} · ${errores} con error`);
      }
    } catch {
      setFinalOk(false);
      setFinalMsg("Error de autenticación. Recarga la página.");
    } finally {
      setUploading(false);
    }
  }

  const esMulti    = type === "prenda";
  const tieneFiles = files.length > 0;
  const pendientes = files.filter((_, i) => statuses[i] === "pending").length;
  const etapa      = etapaInfo(progreso);

  return (
    <div className="up-overlay" onClick={onClose}>
      <div className="up-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">

        {/* ── Header ── */}
        <header className="up-header">
          <div className="up-header-left">
            <span className="up-traffic">
              <span className="up-light up-light-r" />
              <span className="up-light up-light-y" />
              <span className="up-light up-light-g" />
            </span>
          </div>
          <div className="up-step-indicator">
            <span className={`up-step ${step >= 1 ? "active" : ""}`}>
              <span className="up-step-num">1</span>
              <span className="up-step-label">Tipo</span>
            </span>
            <span className="up-step-bar">
              <span className={`up-step-fill ${step >= 2 ? "full" : ""}`} />
            </span>
            <span className={`up-step ${step >= 2 ? "active" : ""}`}>
              <span className="up-step-num">2</span>
              <span className="up-step-label">Imágenes</span>
            </span>
          </div>
          <button className="up-close" onClick={onClose} aria-label="Cerrar">
            <X size={14} />
          </button>
        </header>

        {/* ── Body ── */}
        <div className="up-body">

          {/* Step 1 */}
          {step === 1 && (
            <div className="up-step-1">
              <h2 className="up-title">Subir al closet</h2>
              <p className="up-sub">
                ¿Qué quieres que la IA analice? Selecciona una opción para continuar.
              </p>

              <div className="up-type-grid">
                <button className="up-type-card" onClick={() => pickType("prenda")}>
                  <div className="up-type-icon up-type-icon-lilac">
                    <Shirt size={22} strokeWidth={1.6} />
                    <span className="up-type-glow" />
                  </div>
                  <div className="up-type-text">
                    <h3>Prenda individual</h3>
                    <p>Una o varias prendas — la IA detecta categoría, color y estilo</p>
                  </div>
                  <ArrowRight size={16} className="up-arrow-icon" />
                </button>

                <button className="up-type-card" onClick={() => pickType("outfit")}>
                  <div className="up-type-icon up-type-icon-sage">
                    <Layers size={22} strokeWidth={1.6} />
                    <span className="up-type-glow" />
                  </div>
                  <div className="up-type-text">
                    <h3>Outfit completo</h3>
                    <p>Look entero — la IA separa cada prenda en tu closet</p>
                  </div>
                  <ArrowRight size={16} className="up-arrow-icon" />
                </button>
              </div>

              <div className="up-tip">
                <span className="up-tip-dot" />
                <span>Funciona mejor con fondo claro y la prenda extendida</span>
              </div>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div className="up-step-2">
              <h2 className="up-title">
                {type === "prenda" ? "Subir prendas" : "Subir outfit"}
              </h2>
              <p className="up-sub">
                {type === "prenda"
                  ? "Selecciona una o varias fotos — cada una se analiza por separado."
                  : "Foto del look completo — la IA detectará cada pieza."}
              </p>

              {esMulti && (
                <input ref={fileInputRef} type="file" accept="image/*" multiple
                  style={{ display: "none" }} onChange={handleFileInput} />
              )}

              {!tieneFiles ? (
                <div
                  className={`up-drop ${dragActive ? "drag" : ""}`}
                  onClick={handlePickPhoto}
                  onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={onDrop}
                  role="button" tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && handlePickPhoto()}
                >
                  <div className="up-drop-icon">
                    <Camera size={32} strokeWidth={1.4} />
                    <span className="up-drop-pulse" />
                  </div>
                  <h3 className="up-drop-title">
                    {esMulti ? "Arrastra fotos aquí" : "Arrastra una imagen aquí"}
                  </h3>
                  <p className="up-drop-sub">
                    {esMulti
                      ? "o toca para elegir varias fotos · JPG / PNG / WEBP · máx 10MB c/u"
                      : "o toca para seleccionar · JPG / PNG / WEBP · máx 10MB"}
                  </p>
                  <span className="up-drop-cta">
                    {esMulti ? "Seleccionar fotos" : "Seleccionar archivo"}
                  </span>
                </div>
              ) : (
                <div className="up-multi-wrap">
                  <div className="up-files-grid">
                    {files.map((f, i) => (
                      <div key={i} className={`up-file-thumb up-file-thumb--${statuses[i] || "pending"}`}>
                        <img src={previews[i]} alt={f.name} />
                        <div className="up-file-status-icon">
                          {statuses[i] === "uploading" && <Loader2 size={14} className="up-spin" />}
                          {statuses[i] === "done"      && <CheckCircle2 size={14} className="up-icon-done" />}
                          {statuses[i] === "error"     && <AlertTriangle size={14} className="up-icon-error" />}
                        </div>
                        {!uploading && statuses[i] === "pending" && (
                          <button className="up-file-remove" onClick={() => quitarArchivo(i)}>
                            <X size={10} />
                          </button>
                        )}
                        {uploading && statuses[i] === "uploading" && (
                          <div className="up-file-progress-bar">
                            <div className="up-file-progress-fill" style={{ width: `${progreso}%` }} />
                          </div>
                        )}
                      </div>
                    ))}

                    {!uploading && esMulti && (
                      <button
                        className="up-file-add"
                        onClick={handlePickPhoto}
                        title="Agregar más fotos"
                      >
                        <Plus size={20} strokeWidth={1.8} />
                        <span className="up-file-add-label">Agregar</span>
                      </button>
                    )}
                  </div>

                  {uploading && (
                    <div className="up-multi-progress">
                      <div className="up-multi-progress-header">
                        <span className="up-multi-label">
                          <etapa.Icon size={13} className="up-etapa-icon" />
                          {etapa.label}
                        </span>
                        <span className="up-multi-counter">
                          Subiendo ({uploadIndex + 1}/{files.length})
                        </span>
                      </div>
                      <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${progreso}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {finalMsg && (
                <p className={`mensaje-ia ${finalOk ? "mensaje-ia--ok" : "mensaje-ia--err"}`}>
                  {finalOk
                    ? <CheckCircle2 size={14} className="up-icon-done" />
                    : <AlertTriangle size={14} className="up-icon-error" />}
                  {finalMsg}
                </p>
              )}
            </div>
          )}

        </div>

        {/* ── Source picker nativo (Cámara / Galería) ── */}
        {showSourcePicker && (
          <div className="up-source-overlay" onClick={() => setShowSourcePicker(false)}>
            <div className="up-source-picker" onClick={(e) => e.stopPropagation()}>
              <button className="up-source-btn" onClick={() => handlePickPhoto("camera")}>
                <Camera size={26} strokeWidth={1.5} />
                <span>Tomar foto</span>
              </button>
              <button className="up-source-btn" onClick={() => handlePickPhoto("photos")}>
                <Image size={26} strokeWidth={1.5} />
                <span>Elegir de galería</span>
              </button>
            </div>
          </div>
        )}

        {/* ── Footer ── */}
        <footer className="up-footer">
          {step === 2 && (
            <button className="up-btn up-btn-ghost"
              onClick={() => { resetTodo(); setType(null); setFinalMsg(""); setStep(1); }}
              disabled={uploading}>
              <ArrowLeft size={15} /> Atrás
            </button>
          )}
          <span style={{ flex: 1 }} />
          {step === 2 && tieneFiles && (
            <button className="up-btn up-btn-primary" onClick={onSubmit}
              disabled={uploading || pendientes === 0}>
              {uploading ? (
                <><Loader2 size={14} className="up-spin" /> Subiendo…</>
              ) : files.length === 1 ? (
                <>Subir y analizar <ArrowRight size={14} /></>
              ) : (
                <>Subir {pendientes} prenda{pendientes !== 1 ? "s" : ""} <ArrowRight size={14} /></>
              )}
            </button>
          )}
        </footer>

      </div>
    </div>
  );
}
