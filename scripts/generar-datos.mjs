// Genera data/lotes.json con datos ficticios y huellas SHA-256 válidas.
// Uso: node scripts/generar-datos.mjs
import { writeFileSync } from "node:fs";
import { huellaEvento, GENESIS } from "../js/ledger.js";

const REG = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
const ADM = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

const base = [
  ["LOTE-2026-001", "Villa Rica",        "2026-04-12", [["Cosecha","2026-04-12"],["Acopio","2026-04-14"],["Procesamiento","2026-04-18"],["Almacenamiento","2026-04-25"],["Transporte","2026-05-03"],["Entrega","2026-05-06"]]],
  ["LOTE-2026-002", "Pichanaqui",        "2026-05-02", [["Cosecha","2026-05-02"],["Acopio","2026-05-04"],["Procesamiento","2026-05-09"]]],
  ["LOTE-2026-003", "San Ramón",         "2026-05-20", [["Cosecha","2026-05-20"],["Acopio","2026-05-22"],["Procesamiento","2026-05-27"],["Almacenamiento","2026-06-03"]]],
  ["LOTE-2026-004", "Perené",            "2026-06-08", [["Cosecha","2026-06-08"],["Acopio","2026-06-10"]]],
  ["LOTE-2026-005", "La Merced",         "2026-06-25", [["Cosecha","2026-06-25"],["Acopio","2026-06-27"],["Procesamiento","2026-07-02"],["Almacenamiento","2026-07-09"],["Transporte","2026-07-15"]]],
  ["LOTE-2026-006", "Villa Rica",        "2026-07-14", [["Cosecha","2026-07-14"]]],
  ["LOTE-2026-007", "San Luis de Shuaro","2026-08-03", [["Cosecha","2026-08-03"],["Acopio","2026-08-05"],["Procesamiento","2026-08-11"],["Almacenamiento","2026-08-18"],["Transporte","2026-08-26"],["Entrega","2026-08-29"]]],
  ["LOTE-2026-008", "Vitoc",             "2026-09-09", [["Cosecha","2026-09-09"],["Acopio","2026-09-11"],["Procesamiento","2026-09-16"]]],
];

const lotes = base.map(([codigo, zona, fechaCosecha, evs]) => {
  let prev = GENESIS;
  const eventos = evs.map(([tipo, fecha], i) => {
    const responsable = i === 0 ? ADM : REG;
    const huella = huellaEvento(prev, codigo, tipo, fecha, responsable);
    const e = { tipo, fecha, responsable, prev, huella };
    prev = huella;
    return e;
  });
  return { codigo, zona, fechaCosecha, eventos };
});

writeFileSync(new URL("../data/lotes.json", import.meta.url), JSON.stringify({ version: 1, nota: "Datos ficticios para demostración", lotes }, null, 2) + "\n");
console.log(`Generados ${lotes.length} lotes.`);
