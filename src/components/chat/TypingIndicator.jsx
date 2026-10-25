import React from "react";
import { motion } from "framer-motion";

export default function TypingIndicator({ bare = false }) {
  return (
    <div className={bare ? "wa-typing wa-typing--bare" : "wa-bubble wa-typing assistant"} aria-label="escribiendo">
      {[0, 1, 2].map((i) => (
        <motion.i
          key={i}
          animate={{ y: [0, -4, 0, 0], opacity: [0.45, 1, 0.45, 0.45] }}
          transition={{ duration: 1, repeat: Infinity, ease: "easeInOut", delay: i * 0.15 }}
        />
      ))}
    </div>
  );
}
