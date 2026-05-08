import { createContext, useContext, useState, useCallback, useEffect } from "react";

const UploadContext = createContext(null);

export function UploadProvider({ children }) {
  const [estado, setEstado] = useState(null);

  // Bloquear cierre/recarga mientras haya upload activo
  useEffect(() => {
    if (!estado?.isUploading) return;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [estado?.isUploading]);

  const iniciarUpload = useCallback((total) => {
    setEstado({ total, done: 0, errors: 0, isUploading: true });
  }, []);

  const actualizarUpload = useCallback((done, errors) => {
    setEstado(prev => prev ? { ...prev, done, errors } : null);
  }, []);

  const terminarUpload = useCallback((done, errors) => {
    setEstado(prev => prev ? { ...prev, done, errors, isUploading: false } : null);
    setTimeout(() => setEstado(null), 4000);
  }, []);

  return (
    <UploadContext.Provider value={{ estado, iniciarUpload, actualizarUpload, terminarUpload }}>
      {children}
    </UploadContext.Provider>
  );
}

export function useUpload() {
  return useContext(UploadContext);
}
