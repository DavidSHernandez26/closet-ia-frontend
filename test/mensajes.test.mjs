import { test } from "node:test";
import assert from "node:assert/strict";
import * as m from "../src/lib/chat/mensajes.mjs";

const p = (id) => ({ id, imagen_url: `u${id}`, descripcion: `d${id}`, metadata_ia: { grande: "x".repeat(500) } });

test("snapshot de prendas guarda solo 3 campos", () => {
  assert.deepEqual(m.snapshotOutfit({ outfit: [p(1)], outfitGuardado: null }),
    { prendas: [{ id: 1, imagen_url: "u1", descripcion: "d1" }] });
});
test("snapshot de outfit guardado tiene prioridad y se restaura", () => {
  const prendasIA = [{ nombre: "Camisa", color: "azul" }];
  const g = { ...p(9), metadata_ia: { prendas: prendasIA, grande: "x".repeat(500) } };
  const s = m.snapshotOutfit({ outfit: [p(1)], outfitGuardado: g });
  const esperado = { id: 9, imagen_url: "u9", descripcion: "d9", metadata_ia: { prendas: prendasIA } };
  assert.deepEqual(s, { guardado: esperado });
  assert.deepEqual(m.restaurarOutfit(s), { outfit: [], outfitIds: [], outfitGuardado: esperado });
  // Sin prendas en metadata_ia: no se agrega metadata_ia
  assert.deepEqual(m.snapshotOutfit({ outfitGuardado: p(9) }), { guardado: { id: 9, imagen_url: "u9", descripcion: "d9" } });
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
test("snapshotOutfit ignora entradas nulas", () => {
  assert.deepEqual(m.snapshotOutfit({ outfit: [null, p(1), undefined] }),
    { prendas: [{ id: 1, imagen_url: "u1", descripcion: "d1" }] });
  assert.equal(m.snapshotOutfit({ outfit: [null] }), null);
});
test("aplicarFragmento actualiza el mensaje en streaming aunque haya uno nuevo después", () => {
  const chat = [
    m.crearMensaje("user", "hola", { ts: 1 }),
    { ...m.crearMensaje("assistant", "Ho", { ts: 2 }), streaming: true },
    m.crearMensaje("user", "otro", { ts: 3 }),
  ];
  const r = m.aplicarFragmento(chat, "Hola mundo");
  assert.notEqual(r, chat);
  assert.equal(r[1].text, "Hola mundo");
  assert.equal(r[1].streaming, true);
  assert.equal(r[2].text, "otro");
  assert.equal(chat[1].text, "Ho"); // inmutable
  const sin = [m.crearMensaje("user", "x", { ts: 1 })];
  assert.equal(m.aplicarFragmento(sin, "y"), sin);
});
test("terminarStream quita streaming del mensaje correcto e inserta el outfit justo después", () => {
  const snap = { prendas: [{ id: 1 }] };
  const chat = [
    m.crearMensaje("user", "hola", { ts: 1 }),
    { ...m.crearMensaje("assistant", "Hola", { ts: 2 }), streaming: true },
    m.crearMensaje("user", "otro", { ts: 3 }),
  ];
  const r = m.terminarStream(chat, snap, 10);
  assert.equal(r.length, 4);
  assert.equal(r[1].streaming, undefined);
  assert.equal(r[1].text, "Hola");
  assert.deepEqual(r[2].outfit, snap);
  assert.equal(r[2].role, "assistant");
  assert.equal(r[2].ts, 10);
  assert.equal(r[3].text, "otro");
  assert.equal(chat[1].streaming, true); // inmutable
  // Sin outfit: solo quita streaming
  const r2 = m.terminarStream(chat, null);
  assert.equal(r2.length, 3);
  assert.equal(r2[1].streaming, undefined);
  // Sin mensaje en streaming: el outfit va al final
  const sin = [m.crearMensaje("user", "x", { ts: 1 })];
  const r3 = m.terminarStream(sin, snap, 5);
  assert.equal(r3.length, 2);
  assert.deepEqual(r3[1].outfit, snap);
  assert.equal(m.terminarStream(sin, null), sin);
});
