import React, { memo, useMemo } from "react";
import { motion } from "framer-motion";
import ChatBubble from "./ChatBubble";
import OutfitMessage from "./OutfitMessage";
import { TRANS } from "../../lib/chat/movimiento";

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

// Fila de mensaje memoizada: solo se vuelve a renderizar si cambia su mensaje.
// `animar` = false para las filas que ya existían (recarga, volver del Probador).
function MessageRow({ msg, index, onOpen, animar }) {
  const contenido = useMemo(
    () => (msg.outfit ? null : msg.role === "assistant" ? parseChat(msg.text) : msg.text),
    [msg.outfit, msg.role, msg.text],
  );
  return (
    <motion.div
      data-msg-index={index}
      className={`wa-row ${msg.role}`}
      initial={animar ? { opacity: 0, y: 10, scale: 0.96 } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={TRANS.mensaje}
    >
      {msg.outfit ? (
        <OutfitMessage snapshot={msg.outfit} ts={msg.ts} onOpen={() => onOpen(index)} />
      ) : (
        <ChatBubble role={msg.role} ts={msg.ts} streaming={msg.streaming}>
          {contenido}
        </ChatBubble>
      )}
    </motion.div>
  );
}

export default memo(MessageRow);
