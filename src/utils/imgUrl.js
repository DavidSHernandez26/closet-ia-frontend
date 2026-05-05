// Supabase image transformation (/render/image/) requires a Pro plan.
// This function is kept as a pass-through so call sites don't need to change.
export function supaImg(url, _width) {
  return url ?? "";
}
