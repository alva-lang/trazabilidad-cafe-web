// Registro de trazabilidad en el navegador.
// Replica las reglas de negocio del contrato TrazabilidadCafe.sol (trabajo de Blockchain):
//  R1 código único y obligatorio · R2 solo administrador/registradores escriben
//  R3 eventos solo en lotes existentes · R4 campos obligatorios · R5 se guarda el responsable
//  R6 consulta pública · RF-06 los eventos confirmados no se editan ni se borran.
// En una versión posterior este módulo puede sustituirse por Ethers.js + el contrato real.
import { sha256 } from "./sha256.js";

export const ETAPAS = ["Cosecha", "Acopio", "Procesamiento", "Almacenamiento", "Transporte", "Entrega"];
export const GENESIS = "0".repeat(64);

export const PERFILES = {
  consultor: { etiqueta: "Consultor", puedeEscribir: false, cuenta: null,
    texto: "Puedes consultar lotes, pero no registrar. Prueba el formulario para ver cómo se rechaza." },
  registrador: { etiqueta: "Registrador autorizado", puedeEscribir: true, cuenta: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    texto: "Puedes registrar lotes y agregar eventos." },
  administrador: { etiqueta: "Administrador", puedeEscribir: true, cuenta: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    texto: "Puedes registrar lotes y agregar eventos, y autorizar registradores." },
};

export class ErrorNegocio extends Error {
  constructor(campo, mensaje) { super(mensaje); this.campo = campo; }
}

export function huellaEvento(prev, codigo, tipo, fecha, responsable) {
  return sha256([prev, codigo, tipo, fecha, responsable].join("|"));
}

const hoyISO = () => new Date().toISOString().slice(0, 10);
const norm = (s) => String(s ?? "").trim();

export class Libro {
  constructor(lotes = []) { this.lotes = structuredClone(lotes); }

  buscar(codigo) {
    const c = norm(codigo).toLowerCase();
    return this.lotes.find((l) => l.codigo.toLowerCase() === c) ?? null;
  }

  zonas() { return [...new Set(this.lotes.map((l) => l.zona))].sort((a, b) => a.localeCompare(b, "es")); }
  totalEventos() { return this.lotes.reduce((n, l) => n + l.eventos.length, 0); }
  ultimaEtapa(lote) { return lote.eventos.at(-1)?.tipo ?? "Sin eventos"; }

  registrarLote({ codigo, zona, fechaCosecha }, perfil) {
    this.#exigirPermiso(perfil);
    codigo = norm(codigo); zona = norm(zona); fechaCosecha = norm(fechaCosecha);
    if (!codigo) throw new ErrorNegocio("codigo", "Escribe el código del lote.");
    if (!/^[A-Za-z0-9-]{3,30}$/.test(codigo)) throw new ErrorNegocio("codigo", "Usa de 3 a 30 caracteres: letras, números y guiones, sin espacios.");
    if (!zona) throw new ErrorNegocio("zona", "Selecciona la zona de procedencia.");
    if (!fechaCosecha) throw new ErrorNegocio("fecha", "Indica la fecha de cosecha.");
    if (fechaCosecha > hoyISO()) throw new ErrorNegocio("fecha", "La fecha de cosecha no puede ser futura.");
    if (this.buscar(codigo)) throw new ErrorNegocio("codigo", `Ya existe un lote con el código ${codigo}. Usa otro código.`);
    const lote = { codigo, zona, fechaCosecha, eventos: [] };
    this.lotes.push(lote);
    return lote;
  }

  agregarEvento({ codigo, tipo, fecha }, perfil) {
    this.#exigirPermiso(perfil);
    codigo = norm(codigo); tipo = norm(tipo); fecha = norm(fecha);
    if (!codigo) throw new ErrorNegocio("lote", "Selecciona el lote.");
    const lote = this.buscar(codigo);
    if (!lote) throw new ErrorNegocio("lote", `El lote ${codigo} no existe. Regístralo primero.`);
    if (!tipo) throw new ErrorNegocio("tipo", "Selecciona la etapa.");
    if (!ETAPAS.includes(tipo)) throw new ErrorNegocio("tipo", "Esa etapa no está permitida.");
    if (!fecha) throw new ErrorNegocio("fecha", "Indica la fecha del evento.");
    if (fecha > hoyISO()) throw new ErrorNegocio("fecha", "La fecha del evento no puede ser futura.");
    if (fecha < lote.fechaCosecha) throw new ErrorNegocio("fecha", "El evento no puede ser anterior a la cosecha del lote.");
    const prev = lote.eventos.at(-1)?.huella ?? GENESIS;
    const ev = { tipo, fecha, responsable: perfil.cuenta, prev, huella: huellaEvento(prev, lote.codigo, tipo, fecha, perfil.cuenta) };
    lote.eventos.push(ev);
    return ev;
  }

  /** Recalcula la cadena de huellas. Devuelve { ok, indiceFallo }. */
  verificar(lote) {
    let prev = GENESIS;
    for (let i = 0; i < lote.eventos.length; i++) {
      const e = lote.eventos[i];
      const esperada = huellaEvento(prev, lote.codigo, e.tipo, e.fecha, e.responsable);
      if (e.prev !== prev || e.huella !== esperada) return { ok: false, indiceFallo: i };
      prev = e.huella;
    }
    return { ok: true, indiceFallo: -1 };
  }

  #exigirPermiso(perfil) {
    if (!perfil?.puedeEscribir) throw new ErrorNegocio("permiso", "Tu perfil no tiene permiso para registrar. Cambia a Registrador o Administrador.");
  }
}
