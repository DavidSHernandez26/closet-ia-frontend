import React, { useState } from "react";
import { useUpload } from "../context/UploadContext";
import "./UploadToast.css";

export default function UploadToast() {
  const { estado } = useUpload();
  const [collapsed, setCollapsed] = useState(false);

  if (!estado) return null;

  const { total, done, errors, isUploading } = estado;
  const procesadas = done + errors;
  const current = isUploading ? procesadas + 1 : procesadas;
  const pct = total > 0 ? Math.round((procesadas / total) * 100) : 0;

  return (
    <>
      {/* Mobile: pill toast */}
      <div className={`upload-toast upload-toast-mobile ${isUploading ? "upload-toast--active" : "upload-toast--done"}`}>
        {isUploading ? (
          <>
            <span className="upload-toast-spinner" />
            <span>Subiendo {current} de {total}{total > 1 ? " fotos" : " foto"}…</span>
          </>
        ) : (
          <>
            <span className="upload-toast-check">✓</span>
            <span>
              {done > 0 ? `${done} prenda${done !== 1 ? "s" : ""} subida${done !== 1 ? "s" : ""}` : ""}
              {done > 0 && errors > 0 ? " · " : ""}
              {errors > 0 ? `${errors} rechazada${errors !== 1 ? "s" : ""}` : ""}
            </span>
          </>
        )}
      </div>

      {/* Desktop: expandable panel */}
      <div className={`upload-panel ${isUploading ? "upload-panel--active" : "upload-panel--done"} ${collapsed ? "upload-panel--collapsed" : ""}`}>
        <button
          className="upload-panel-header"
          onClick={() => setCollapsed(c => !c)}
        >
          <span className="upload-panel-title">
            {isUploading ? (
              <><span className="upload-toast-spinner" /> Subiendo fotos</>
            ) : (
              <><span className="upload-toast-check">✓</span> Subida completada</>
            )}
          </span>
          <span className="upload-panel-toggle">{collapsed ? "▲" : "▼"}</span>
        </button>

        {!collapsed && (
          <div className="upload-panel-body">
            <div className="upload-panel-counts">
              <span>{current} de {total} {total > 1 ? "fotos" : "foto"}</span>
              {!isUploading && errors > 0 && (
                <span className="upload-panel-errors">{errors} rechazada{errors !== 1 ? "s" : ""}</span>
              )}
            </div>
            <div className="upload-panel-bar-track">
              <div
                className="upload-panel-bar-fill"
                style={{ width: `${pct}%` }}
              />
            </div>
            {!isUploading && done > 0 && (
              <p className="upload-panel-done-msg">
                {done} prenda{done !== 1 ? "s" : ""} añadida{done !== 1 ? "s" : ""} al closet
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );
}
