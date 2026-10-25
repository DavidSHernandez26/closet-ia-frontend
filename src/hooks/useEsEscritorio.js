import { useEffect, useState } from "react";

const QUERY = "(min-width: 901px)";

// true en escritorio (> 900 px), false en celular (≤ 900 px). Se actualiza al cruzar el corte.
export function useEsEscritorio() {
  const [esEscritorio, setEsEscritorio] = useState(
    () => typeof window !== "undefined" && !!window.matchMedia?.(QUERY).matches
  );

  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia(QUERY);
    const onChange = (e) => setEsEscritorio(e.matches);
    setEsEscritorio(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return esEscritorio;
}

export default useEsEscritorio;
