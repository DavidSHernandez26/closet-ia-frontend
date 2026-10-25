import { test } from "node:test";
import assert from "node:assert/strict";
import * as m from "../src/lib/chat/mensajes.mjs";

const p = (id) => ({ id, imagen_url: `u${id}`, descripcion: `d${id}`, metadata_ia: { grande: "x".repeat(500) } });

test("snapshot de prendas guarda solo 3 campos", () => {
  assert.deepEqual(m.snapshotOutfit({ outfit: [p(1)], outfitGuardado: null }),
    { prendas: [{ id: 1, imagen_url: "u1", descripcion: "d1" }] });
});
test("snapshot de outfit guardado tiene prioridad y se restaura", () => {
  const s = m.snapshotOutfit({ outfit: [p(1)], outfitGuardado: p(9) });
  assert.deepEqual(s, { guardado: { id: 9, imagen_url: "u9", descripcion: "d9" } });
  assert.deepEqual(m.restaurarOutfit(s), { outfit: [], outfitIds: [], outfitGuardado: { id: 9, imagen_url: "u9", descripcion: "d9" } });
  assert.deepEqual(m.restaurarOutfit({ prendas: [{ id: 1 }, { id: 2 }] }).outfitIds, [1, 2]);
  assert.equal(m.snapshotOutfit({ outfit: [], outfitGuardado: null }), null);
});
test("agruparPorDia: viejos sin ts arriba sin separador, luego Ayer y Hoy", () => {
  const ahora = new Date(2026, 9, 25, 12).getTime();
  const ayer = new Date(2026, 9, 24, 20).getTime();
  const r = m.agruparPorDia([{ role: "user", text: "viejo" }, m.crearMensaje("user", "a", { ts: ayer }), m.crearMensaje("assistant", "b", { ts: ahora - 1000 }), m.crearMensaje("user", "c", { ts: ahora })], ahora);
  assert.deepEqual(r.map(x => x.tipo === "dia" ? x.etiqueta : x.msg.text), ["viejo", "Ayer", "a", "Hoy", "b", "c"]);
});
test("formatearHora sin ts", () => { assert.equal(m.formatearHora(undefined), ""); });
test("actualizarSnapshot, ultimoIndiceOutfit, recortarHistorial", () => {
  const chat = [m.crearMensaje("assistant", "", { ts: 1, outfit: { prendas: [{ id: 1 }] } }), m.crearMensaje("user", "x", { ts: 2 })];
  assert.equal(m.ultimoIndiceOutfit(chat), 0);
  const nuevo = m.actualizarSnapshot(chat, 0, { prendas: [{ id: 2 }] });
  assert.notEqual(nuevo, chat);
  assert.deepEqual(nuevo[0].outfit, { prendas: [{ id: 2 }] });
  assert.equal(m.actualizarSnapshot(chat, 1, { prendas: [] }), chat);
  assert.equal(m.recortarHistorial(Array.from({ length: 150 }, (_, i) => ({ text: String(i) }))).length, 100);
});
