import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { sha256 } from "../js/sha256.js";
import { Libro, PERFILES, ErrorNegocio } from "../js/ledger.js";

const datos = JSON.parse(readFileSync(new URL("../data/lotes.json", import.meta.url)));
const nuevo = () => new Libro(datos.lotes);

test("sha256 coincide con node:crypto", () => {
  for (const t of ["", "abc", "café|2026", "x".repeat(200)]) {
    assert.equal(sha256(t), createHash("sha256").update(t).digest("hex"));
  }
});

test("los datos de demostración tienen cadena íntegra", () => {
  const l = nuevo();
  for (const lote of l.lotes) assert.equal(l.verificar(lote).ok, true, lote.codigo);
});

test("R1/R4: rechaza código vacío, duplicado y campos vacíos", () => {
  const l = nuevo(); const p = PERFILES.registrador;
  assert.throws(() => l.registrarLote({ codigo: "", zona: "Vitoc", fechaCosecha: "2026-01-01" }, p), ErrorNegocio);
  assert.throws(() => l.registrarLote({ codigo: "LOTE-2026-001", zona: "Vitoc", fechaCosecha: "2026-01-01" }, p), /Ya existe/);
  assert.throws(() => l.registrarLote({ codigo: "NUEVO-1", zona: "", fechaCosecha: "2026-01-01" }, p), /zona/);
  assert.throws(() => l.registrarLote({ codigo: "NUEVO-1", zona: "Vitoc", fechaCosecha: "" }, p), /fecha/);
});

test("R2: el consultor no puede escribir", () => {
  const l = nuevo();
  assert.throws(() => l.registrarLote({ codigo: "NUEVO-1", zona: "Vitoc", fechaCosecha: "2026-01-01" }, PERFILES.consultor), /permiso/);
  assert.throws(() => l.agregarEvento({ codigo: "LOTE-2026-004", tipo: "Procesamiento", fecha: "2026-06-20" }, PERFILES.consultor), /permiso/);
});

test("R3: no agrega eventos a lotes inexistentes", () => {
  assert.throws(() => nuevo().agregarEvento({ codigo: "NO-EXISTE", tipo: "Acopio", fecha: "2026-06-20" }, PERFILES.registrador), /no existe/);
});

test("un evento válido se encadena y la verificación sigue siendo correcta", () => {
  const l = nuevo();
  l.agregarEvento({ codigo: "LOTE-2026-004", tipo: "Procesamiento", fecha: "2026-06-20" }, PERFILES.registrador);
  const lote = l.buscar("lote-2026-004");
  assert.equal(lote.eventos.length, 3);
  assert.equal(l.verificar(lote).ok, true);
});

test("la alteración de un dato antiguo se detecta", () => {
  const l = nuevo(); const lote = l.buscar("LOTE-2026-001");
  lote.eventos[1].fecha = "2026-01-01";
  assert.deepEqual(l.verificar(lote), { ok: false, indiceFallo: 1 });
});

test("el evento no puede ser anterior a la cosecha", () => {
  assert.throws(() => nuevo().agregarEvento({ codigo: "LOTE-2026-004", tipo: "Acopio", fecha: "2026-01-01" }, PERFILES.registrador), /anterior/);
});
