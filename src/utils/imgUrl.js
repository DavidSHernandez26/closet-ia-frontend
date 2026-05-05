const SUPA_OBJECT = "/storage/v1/object/public";
const SUPA_RENDER = "/storage/v1/render/image/public";

/**
 * Transforma una URL de Supabase Storage al endpoint de image transformation
 * para servir WebP redimensionado. URLs externas (OAuth avatars, etc.) se
 * devuelven sin modificar.
 *
 * @param {string} url   URL original
 * @param {number} width Ancho máximo en píxeles (default 800)
 * @returns {string}
 */
export function supaImg(url, width = 800) {
  if (!url?.includes(SUPA_OBJECT)) return url;
  return (
    url.replace(SUPA_OBJECT, SUPA_RENDER) +
    `?width=${width}&quality=80&format=webp`
  );
}
