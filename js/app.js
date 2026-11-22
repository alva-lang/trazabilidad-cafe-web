// TrazabilidadCafé · lógica de interfaz (v1)
import { Libro, ErrorNegocio, ETAPAS, PERFILES } from "./ledger.js";

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
const CLAVE = "trazabilidadcafe.v1";

let libro = null;
let perfilActual = "registrador";
let loteAbierto = null;

/* ---------- Carga de datos con fetch ---------- */
async function cargarDatos() {
  const estado = $("#estado-carga");
  try {
    const guardado = leerLocal();
    if (guardado) { libro = new Libro(guardado); }
    else {
      const resp = await fetch("data/lotes.json");
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      libro = new Libro((await resp.json()).lotes);
    }
    estado.hidden = true;
  } catch (err) {
    console.error(err);
    estado.textContent = "No pudimos cargar los lotes. Revisa tu conexión y recarga la página.";
    estado.classList.add("error");
    estado.setAttribute("role", "alert");
    return false;
  }
  return true;
}
const leerLocal = () => { try { const t = localStorage.getItem(CLAVE); return t ? JSON.parse(t) : null; } catch { return null; } };
const guardarLocal = () => { try { localStorage.setItem(CLAVE, JSON.stringify(libro.lotes)); } catch { /* modo privado: se ignora */ } };

/* ---------- Enrutador por hash ---------- */
const RUTAS = ["inicio", "consultar", "registrar", "ayuda"];
function parseHash() {
  const [ruta, query = ""] = location.hash.replace(/^#\/?/, "").split("?");
  return { ruta: RUTAS.includes(ruta) ? ruta : "inicio", params: new URLSearchParams(query) };
}
function mostrarVista({ ruta, params }, { enfocar = true } = {}) {
  $$(".view").forEach((v) => { v.hidden = v.dataset.view !== ruta; });
  $$("[data-route]").forEach((a) => (a.dataset.route === ruta ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current")));
  const titulo = $(`#vista-${ruta} h1`).textContent;
  document.title = `${titulo} · TrazabilidadCafé`;
  cerrarMenu();
  if (enfocar) { const m = $("#contenido"); m.focus({ preventScroll: true }); window.scrollTo({ top: 0 }); }
  if (ruta === "consultar") {
    const codigo = params.get("lote");
    if (codigo) abrirDetalle(codigo, { enfocar }); else cerrarDetalle(false);
  }
}
window.addEventListener("hashchange", () => mostrarVista(parseHash()));

/* ---------- Menú móvil ---------- */
const toggle = $(".nav-toggle");
const lista = $("#menu-principal");
toggle.addEventListener("click", () => {
  const abierto = lista.classList.toggle("open");
  toggle.setAttribute("aria-expanded", String(abierto));
});
function cerrarMenu() { lista.classList.remove("open"); toggle.setAttribute("aria-expanded", "false"); }
document.addEventListener("keydown", (e) => { if (e.key === "Escape") { cerrarMenu(); } });

/* ---------- Utilidades de DOM ---------- */
function el(tag, props = {}, ...hijos) {
  const nodo = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === "class") nodo.className = v; else if (k === "text") nodo.textContent = v; else nodo.setAttribute(k, v);
  }
  hijos.flat().forEach((h) => nodo.append(h));
  return nodo;
}
const fechaLarga = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric" });
const corta = (c) => (c ? `${c.slice(0, 6)}…${c.slice(-4)}` : "—");
function toast(msg) {
  const t = $("#toast"); t.textContent = msg; t.hidden = false;
  clearTimeout(toast.id); toast.id = setTimeout(() => { t.hidden = true; }, 3500);
}

/* ---------- Inicio ---------- */
function pintarStats() {
  $("#stat-lotes").textContent = libro.lotes.length;
  $("#stat-eventos").textContent = libro.totalEventos();
  $("#stat-zonas").textContent = libro.zonas().length;
}
$("#form-inicio").addEventListener("submit", (e) => {
  e.preventDefault();
  if (!libro) return;
  const input = $("#codigo-inicio"); const err = $("#error-inicio");
  const codigo = input.value.trim();
  if (!codigo) { mostrarError(input, err, "Escribe el código del lote para continuar."); return; }
  if (!libro.buscar(codigo)) { mostrarError(input, err, `No encontramos el lote «${codigo}». Revisa que esté bien escrito.`); return; }
  limpiarError(input, err);
  location.hash = `#/consultar?lote=${encodeURIComponent(libro.buscar(codigo).codigo)}`;
});
$("#codigo-inicio").addEventListener("input", () => limpiarError($("#codigo-inicio"), $("#error-inicio")));

function mostrarError(input, errorEl, msg) {
  errorEl.textContent = msg; errorEl.hidden = false; input.setAttribute("aria-invalid", "true");
  const base = (input.getAttribute("aria-describedby") || "").split(" ").filter(Boolean);
  if (!base.includes(errorEl.id)) input.setAttribute("aria-describedby", [...base, errorEl.id].join(" "));
  input.focus();
}
function limpiarError(input, errorEl) { errorEl.hidden = true; errorEl.textContent = ""; input.removeAttribute("aria-invalid"); }

/* ---------- Consultar: filtros, búsqueda y tarjetas ---------- */
function poblarFiltros() {
  const zonaSel = $("#filtro-zona"); const etapaSel = $("#filtro-etapa");
  zonaSel.replaceChildren(el("option", { value: "", text: "Todas las zonas" }), ...libro.zonas().map((z) => el("option", { value: z, text: z })));
  etapaSel.replaceChildren(el("option", { value: "", text: "Todas las etapas" }), ...[...ETAPAS, "Sin eventos"].map((e) => el("option", { value: e, text: e })));
}
function lotesFiltrados() {
  const q = $("#buscar").value.trim().toLowerCase();
  const zona = $("#filtro-zona").value; const etapa = $("#filtro-etapa").value;
  return libro.lotes.filter((l) =>
    (!q || l.codigo.toLowerCase().includes(q) || l.zona.toLowerCase().includes(q)) &&
    (!zona || l.zona === zona) && (!etapa || libro.ultimaEtapa(l) === etapa));
}
function pintarLista() {
  if (!libro) return;
  const ul = $("#lista-lotes"); const res = lotesFiltrados();
  ul.replaceChildren(...res.map((l) => {
    const btn = el("button", { type: "button", class: "btn btn-secondary", "aria-label": `Ver historial del lote ${l.codigo}`, text: "Ver historial" });
    btn.addEventListener("click", () => { location.hash = `#/consultar?lote=${encodeURIComponent(l.codigo)}`; });
    return el("li", { class: "card" },
      el("h3", { text: l.codigo }),
      el("p", { text: `${l.zona} · cosecha ${fechaLarga(l.fechaCosecha)}` }),
      el("p", {}, el("span", { class: "tag", text: libro.ultimaEtapa(l) }), ` ${l.eventos.length} evento${l.eventos.length === 1 ? "" : "s"}`),
      btn);
  }));
  $("#conteo-resultados").textContent = res.length === 0
    ? "No hay lotes con esos criterios. Prueba quitar algún filtro."
    : `${res.length} de ${libro.lotes.length} lotes`;
}
["#buscar", "#filtro-zona", "#filtro-etapa"].forEach((s) => $(s).addEventListener("input", pintarLista));
$("#form-consulta").addEventListener("submit", (e) => e.preventDefault());
$("#limpiar-filtros").addEventListener("click", () => { $("#form-consulta").reset(); pintarLista(); $("#buscar").focus(); });

/* ---------- Detalle del lote + QR ---------- */
function urlConsulta(codigo) {
  const base = location.href.split("#")[0];
  return `${base}#/consultar?lote=${encodeURIComponent(codigo)}`;
}
function dibujarQR(codigo) {
  const qr = window.qrcode(0, "M"); qr.addData(urlConsulta(codigo)); qr.make();
  const cont = $("#d-qr");
  cont.innerHTML = qr.createSvgTag({ cellSize: 6, margin: 0, scalable: true });
  cont.setAttribute("aria-label", `Código QR del lote ${codigo}. Apunta a la página de consulta de este lote.`);
  $("#d-qr-texto").textContent = `Código: ${codigo}`;
}
function abrirDetalle(codigo, { enfocar = true } = {}) {
  if (!libro) return;
  const lote = libro.buscar(codigo);
  const art = $("#detalle-lote");
  if (!lote) {
    art.hidden = true; loteAbierto = null;
    toast(`No encontramos el lote «${codigo}».`);
    return;
  }
  loteAbierto = lote.codigo;
  $("#detalle-titulo").textContent = lote.codigo;
  $("#d-zona").textContent = lote.zona;
  $("#d-cosecha").textContent = fechaLarga(lote.fechaCosecha);
  $("#d-n").textContent = lote.eventos.length;
  const v = libro.verificar(lote);
  const b = $("#d-integridad");
  b.className = `badge ${v.ok ? "ok" : "bad"}`;
  b.textContent = v.ok ? "✔ Historial íntegro: las huellas coinciden" : `✖ Historial alterado desde el evento ${v.indiceFallo + 1}`;
  const ol = $("#d-eventos");
  ol.replaceChildren(...(lote.eventos.length
    ? lote.eventos.map((e, i) => el("li", {},
        el("strong", { text: `${i + 1}. ${e.tipo}` }),
        el("span", { text: fechaLarga(e.fecha) }),
        el("span", { class: "meta", text: ` Responsable: ${corta(e.responsable)} · Huella: ${e.huella.slice(0, 16)}…` })))
    : [el("li", { class: "muted", text: "Este lote aún no tiene eventos registrados." })]));
  dibujarQR(lote.codigo);
  art.hidden = false;
  if (enfocar) { art.scrollIntoView({ behavior: "auto", block: "start" }); art.focus({ preventScroll: true }); }
}
function cerrarDetalle(actualizarHash = true) {
  $("#detalle-lote").hidden = true; loteAbierto = null;
  if (actualizarHash && parseHash().params.get("lote")) history.pushState(null, "", "#/consultar");
}
$("#cerrar-detalle").addEventListener("click", () => { cerrarDetalle(); $("#buscar").focus(); });
$("#descargar-qr").addEventListener("click", () => {
  const svg = $("#d-qr svg"); if (!svg) return;
  const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml" });
  const a = el("a", { href: URL.createObjectURL(blob), download: `qr-${loteAbierto}.svg` });
  document.body.append(a); a.click(); a.remove(); URL.revokeObjectURL(a.href);
  toast("QR descargado.");
});

/* ---------- Registrar: perfiles, formularios y bitácora ---------- */
const perfil = () => PERFILES[perfilActual];
function pintarPerfil() { $("#perfil-texto").textContent = perfil().texto; }
$("#perfil").addEventListener("change", (e) => { perfilActual = e.target.value; pintarPerfil(); });

function poblarSelectsRegistro() {
  const zona = $("#lote-zona"); const lote = $("#evento-lote"); const tipo = $("#evento-tipo");
  const zonas = ["Villa Rica", "Pichanaqui", "San Ramón", "Perené", "La Merced", "Vitoc", "San Luis de Shuaro", "Oxapampa"];
  const todas = [...new Set([...zonas, ...libro.zonas()])].sort((a, b) => a.localeCompare(b, "es"));
  zona.replaceChildren(el("option", { value: "", text: "Selecciona una zona" }), ...todas.map((z) => el("option", { value: z, text: z })));
  const prev = lote.value;
  lote.replaceChildren(el("option", { value: "", text: "Selecciona un lote" }), ...libro.lotes.map((l) => el("option", { value: l.codigo, text: `${l.codigo} · ${l.zona}` })));
  lote.value = prev;
  tipo.replaceChildren(el("option", { value: "", text: "Selecciona una etapa" }), ...ETAPAS.map((t) => el("option", { value: t, text: t })));
}

function resultado(id, ok, msg) {
  const p = $(id); p.hidden = false; p.className = `form-result ${ok ? "ok" : "error"}`; p.textContent = msg;
}
function anotar(ok, msg) {
  const ul = $("#bitacora");
  if (ul.firstElementChild?.classList.contains("muted")) ul.replaceChildren();
  const hora = new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  ul.prepend(el("li", { class: ok ? "ok" : "error", text: `${hora} · ${ok ? "Aceptado" : "Rechazado"}: ${msg}` }));
}
function manejarFormulario(form, prefijo, accion) {
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!libro) return;
    $$("[aria-invalid]", form).forEach((i) => i.removeAttribute("aria-invalid"));
    $$(".field-error", form).forEach((p) => { p.hidden = true; });
    $(`#${prefijo}-resultado`).hidden = true;
    const datos = Object.fromEntries(new FormData(form));
    try {
      const msg = accion(datos);
      guardarLocal(); poblarSelectsRegistro(); poblarFiltros(); pintarLista(); pintarStats();
      anotar(true, msg); resultado(`#${prefijo}-resultado`, true, msg); form.reset();
      toast("Operación registrada.");
    } catch (err) {
      if (!(err instanceof ErrorNegocio)) throw err;
      anotar(false, err.message);
      const campoId = { codigo: "lote-codigo", zona: "lote-zona", fecha: `${prefijo}-fecha`, lote: "evento-lote", tipo: "evento-tipo" }[err.campo];
      const input = campoId && $(`#${campoId}`);
      if (input) { mostrarError(input, $(`#${campoId}-error`), err.message); }
      else { resultado(`#${prefijo}-resultado`, false, err.message); }
    }
  });
}
manejarFormulario($("#form-lote"), "lote", (d) => {
  const l = libro.registrarLote({ codigo: d.codigo, zona: d.zona, fechaCosecha: d.fecha }, perfil());
  return `Lote ${l.codigo} registrado en ${l.zona}.`;
});
manejarFormulario($("#form-evento"), "evento", (d) => {
  const ev = libro.agregarEvento({ codigo: d.lote, tipo: d.tipo, fecha: d.fecha }, perfil());
  return `Evento «${ev.tipo}» agregado al lote ${d.lote}.`;
});
$("#restablecer").addEventListener("click", async () => {
  if (!confirm("Se borrarán los lotes y eventos que agregaste y volverán los datos de demostración. ¿Continuar?")) return;
  try { localStorage.removeItem(CLAVE); } catch { /* sin almacenamiento */ }
  libro = null; if (await cargarDatos()) { iniciarVistas(); $("#bitacora").replaceChildren(el("li", { class: "muted", text: "Aún no hay operaciones." })); toast("Datos restablecidos."); }
});

/* ---------- Arranque ---------- */
function iniciarVistas() { pintarStats(); poblarFiltros(); poblarSelectsRegistro(); pintarLista(); pintarPerfil(); }
(async function init() {
  const listo = await cargarDatos();
  if (listo) iniciarVistas();
  mostrarVista(parseHash(), { enfocar: false });
})();
