import React from "react";
import { formatearHora } from "../../lib/chat/mensajes.mjs";

export default function ChatBubble({ role, text, ts, streaming, children }) {
  const hora = formatearHora(ts);
  return (
    <div className={`chat-bubble wa-bubble ${role}`}>
      {children ?? text}
      {streaming && <span className="stream-cursor" />}
      {(hora || role === "user") && (
        <div className="wa-meta">
          {hora}
          {role === "user" && <span className="wa-tick">✓✓</span>}
        </div>
      )}
    </div>
  );
}
