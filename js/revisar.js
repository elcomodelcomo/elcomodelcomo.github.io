// Página de revisión: recorre las referencias «por revisar», guarda una decisión para cada una
// y genera el nuevo data/correcciones.json. Las decisiones se guardan en este navegador.
import { RUTA_COMPLETO, RUTA_CORRECCIONES, TIPOS, etiquetaTipo } from "./config.js";
import { combinar, fichaDe, serializar } from "./revision/correcciones.js";
import { buscarEnWikidata } from "./revision/wikidata.js";
import { compararES, enlaceMencion, esc, normalizar, plural, separarTitulo } from "./utils.js";

const REPOSITORIO = "elcomodelcomo/elcomodelcomo.github.io";
const CLAVE_GUARDADO = "revision-referencias-v1";
const MAX_DICHOS = 5;

const $ = (s) => document.querySelector(s);
const dom = {
  progreso: $("#progreso"), generar: $("#generar"), estado: $("#f-estado"), tipo: $("#f-tipo"), texto: $("#f-texto"),
  masivo: $("#masivo"), cola: $("#cola"), colaResumen: $("#cola-resumen"), colaPlegable: $("#cola-plegable"),
  ficha: $("#ficha"), nombres: $("#nombres"), salida: $("#salida"), salidaJson: $("#salida-json"),
  salidaResumen: $("#salida-resumen"), sobrantesOpcion: $("#sobrantes-opcion"), quitarSobrantes: $("#quitar-sobrantes"),
  sobrantesTexto: $("#sobrantes-texto"),
};

const datos = { refs: [], porId: new Map(), porNombre: new Map(), correcciones: {}, sobrantes: [] };
let decisiones = {};          // id → decisión
let visibles = [];            // ids de la lista con los filtros actuales
let actual = null;            // id de la referencia abierta
const candidatosCache = new Map();

// ---------- Guardado en el navegador ----------
function cargarDecisiones() {
  try { decisiones = JSON.parse(localStorage.getItem(CLAVE_GUARDADO) || "{}").decisiones || {}; }
  catch { decisiones = {}; }
}
function guardarDecisiones() {
  try { localStorage.setItem(CLAVE_GUARDADO, JSON.stringify({ decisiones })); }
  catch { /* sin almacenamiento: las decisiones duran mientras la página esté abierta */ }
}

// ---------- Datos ----------
async function pedirJSON(ruta, opcional = false) {
  const res = await fetch(ruta, { cache: "no-cache" });
  if (!res.ok) {
    if (opcional) return null;
    throw new Error(`no se encuentra ${ruta} (HTTP ${res.status})`);
  }
  return res.json();
}

const sinFicha = (r) => !r.fuente;
const nombreEtiqueta = (r) => `${r.nombre} (${etiquetaTipo(r.tipo)})`;

function preparar(lista) {
  datos.refs = lista
    .map((r) => ({ ...r, _n: normalizar(r.nombre).trim(), _episodios: new Set(r.menciones.map((m) => m.video_id)).size }))
    .sort((a, b) => b.menciones.length - a.menciones.length || compararES(a.nombre, b.nombre));
  datos.porId = new Map(datos.refs.map((r) => [r.id, r]));
  datos.porNombre = new Map();
  for (const r of datos.refs) (datos.porNombre.get(r._n) || datos.porNombre.set(r._n, []).get(r._n)).push(r);
  dom.nombres.innerHTML = [...new Set(datos.refs.map((r) => r.nombre))].map((n) => `<option value="${esc(n)}">`).join("");
  dom.tipo.insertAdjacentHTML("beforeend", Object.entries(TIPOS)
    .filter(([t]) => datos.refs.some((r) => r.tipo === t))
    .map(([t, [plural]]) => `<option value="${t}">${esc(plural)}</option>`).join(""));
}

const ambiguo = (r) => (datos.porNombre.get(r._n) || []).length > 1;

// Posibles duplicados: otra referencia cuyo nombre contiene todas las palabras de este (o al revés).
const VACIAS = new Set(["de", "del", "la", "el", "los", "las", "the", "and", "y", "of"]);
const palabras = (n) => new Set(n.split(" ").filter((p) => p.length > 2 && !VACIAS.has(p)));
function parecidas(r) {
  const mias = palabras(r._n);
  if (!mias.size) return [];
  return datos.refs.filter((o) => {
    if (o.id === r.id) return false;
    const suyas = palabras(o._n);
    if (!suyas.size) return false;
    const [corta, larga] = mias.size <= suyas.size ? [mias, suyas] : [suyas, mias];
    return [...corta].every((p) => larga.has(p));
  }).slice(0, 6);
}

// ---------- Filtros y lista ----------
const decidida = (r) => Boolean(decisiones[r.id]);
const FILTROS = {
  pendientes: (r) => r.revisar && !decidida(r),
  "sin-ficha": (r) => r.revisar && sinFicha(r),
  dudosa: (r) => r.revisar && !sinFicha(r),
  decididas: decidida,
  todas: () => true,
};

function filtrar() {
  const estado = FILTROS[dom.estado.value], tipo = dom.tipo.value, texto = normalizar(dom.texto.value).trim();
  visibles = datos.refs.filter((r) => estado(r) && (!tipo || r.tipo === tipo) && (!texto || r._n.includes(texto))).map((r) => r.id);
  pintarCola();
  const sinDecidir = visibles.filter((id) => !decisiones[id]).length;
  // Solo con un filtro de tipo o de texto: dar por buenas cientos de referencias de golpe sería demasiado fácil.
  dom.masivo.hidden = !sinDecidir || dom.estado.value === "decididas" || (!tipo && !texto);
  dom.masivo.textContent = `Dar por buenas las ${sinDecidir} sin decidir de la lista`;
  if (!visibles.includes(actual)) abrir(visibles.find((id) => !decisiones[id]) || visibles[0] || null);
}

const MARCAS = { bien: "✓", quitar: "✕", ficha: "★", juntar: "⇄", descartar: "🗑" };
function filaHTML(id) {
  const r = datos.porId.get(id), d = decisiones[id];
  return `<li><button type="button" data-id="${esc(id)}" ${id === actual ? 'aria-current="true"' : ""} class="${d ? "hecha" : ""}">
    <span class="rv-marca" aria-hidden="true">${d ? MARCAS[d.accion] : ""}</span>
    <span class="rv-cola-nombre">${esc(r.nombre)}</span>
    <span class="rv-cola-n">${r.menciones.length}</span>
  </button></li>`;
}

function pintarCola() {
  dom.cola.innerHTML = visibles.map(filaHTML).join("") || `<li class="rv-vacio">No hay referencias con estos filtros.</li>`;
  dom.colaResumen.textContent = `Lista (${visibles.length})`;
}

function actualizarFila(id) {
  const boton = dom.cola.querySelector(`[data-id="${CSS.escape(id)}"]`);
  if (boton) boton.parentElement.outerHTML = filaHTML(id);
}

function pintarProgreso() {
  const porRevisar = datos.refs.filter((r) => r.revisar);
  const hechas = porRevisar.filter(decidida).length;
  const total = Object.keys(decisiones).length;
  dom.progreso.textContent = `${hechas} de ${porRevisar.length} referencias por revisar decididas`
    + (total > hechas ? ` (y ${plural(total - hechas, "cambio", "cambios")} en otras)` : "");
  dom.generar.disabled = !total && !datos.sobrantes.length;
}

// ---------- Ficha de la referencia ----------
function dichosHTML(r) {
  const ms = [...r.menciones].sort((a, b) => (b.relevancia === "central") - (a.relevancia === "central"));
  const filas = ms.slice(0, MAX_DICHOS).map((m) => {
    const marca = m.origen === "descripcion" ? "descr." : m.minuto;
    return `<li><a class="ts ${esc(m.relevancia)}" href="${esc(m.enlace || enlaceMencion(m))}" target="_blank" rel="noopener">${esc(marca)}</a>
      <span>${esc(m.contexto)} <span class="rv-ep">${esc(separarTitulo(m.episodio || "")[0])}</span></span></li>`;
  });
  const mas = ms.length > MAX_DICHOS ? `<li class="rv-mas">y ${plural(ms.length - MAX_DICHOS, "mención más", "menciones más")}</li>` : "";
  return `<ul class="rv-dichos">${filas.join("")}${mas}</ul>`;
}

function fichaActualHTML(r) {
  if (sinFicha(r)) return `<p class="rv-sin">No tiene ficha: ninguna fuente encontró nada o se quitó por ser de otra cosa.</p>`;
  const img = r.imagen ? `<span class="rv-img"><img src="${esc(r.imagen)}" alt="" loading="lazy" onerror="this.parentElement.remove()"></span>` : "";
  const fuente = { wikidata: "Wikidata", tmdb: "TMDB", openlibrary: "Open Library", musicbrainz: "MusicBrainz", enlace: "enlace", perfil: "perfil" }[r.fuente] || r.fuente;
  const enlace = r.url_externa ? `<a href="${esc(r.url_externa)}" target="_blank" rel="noopener">Ver la ficha en ${esc(/wikipedia/.test(r.url_externa) ? "Wikipedia" : fuente)}</a>` : "";
  return `<div class="rv-actual">${img}<div>
    <p>${esc(r.descripcion || "Sin descripción")}</p>
    <p class="rv-meta">De ${esc(fuente)}${fichaDe(r) ? `, ${esc(fichaDe(r))}` : ""}. ${enlace}</p>
  </div></div>`;
}

function decisionHTML(d) {
  const texto = {
    bien: d.ficha ? "La ficha está bien" : "Se queda sin ficha",
    quitar: "Quitar la ficha",
    ficha: `Ficha nueva: ${d.nueva?.etiqueta} (${d.nueva?.q})`,
    juntar: `Juntar con «${d.en}»`,
    descartar: "Descartar: no es una referencia",
  }[d.accion];
  const cambios = Object.entries(d.cambios || {}).map(([k, v]) => `${{ tipo: "tipo", nombre_nuevo: "nombre", descripcion: "descripción", url_externa: "enlace" }[k]}: ${k === "tipo" ? etiquetaTipo(v) : v}`);
  return `<div class="rv-decision" role="status">
    <p><b>Decidido.</b> ${esc(texto)}${cambios.length ? `; ${esc(cambios.join("; "))}` : ""}.</p>
    <button class="btn" type="button" data-accion="deshacer">Deshacer <kbd>Z</kbd></button>
  </div>`;
}

function abrir(id) {
  actual = id;
  dom.cola.querySelectorAll("[aria-current]").forEach((b) => b.removeAttribute("aria-current"));
  if (!id) {
    dom.ficha.innerHTML = `<div class="rv-fin"><h2>No queda nada con estos filtros</h2>
      <p>Cambia los filtros de arriba o pulsa «Generar correcciones» para guardar lo decidido.</p></div>`;
    return;
  }
  dom.cola.querySelector(`[data-id="${CSS.escape(id)}"]`)?.setAttribute("aria-current", "true");
  const r = datos.porId.get(id), d = decisiones[id];
  const motivo = !r.revisar ? "Referencia revisada" : sinFicha(r) ? "Por revisar: no tiene ficha" : "Por revisar: ficha dudosa";
  const similares = parecidas(r);
  const tipos = Object.entries(TIPOS).map(([t, [, uno]]) => `<option value="${t}" ${t === r.tipo ? "selected" : ""}>${esc(uno)}</option>`).join("");
  // Sin ficha, lo primero es elegir candidato: la búsqueda va antes que los botones.
  const ACCIONES = `
    <div class="rv-acciones" role="group" aria-label="Decisión">
      <button class="btn rv-principal" type="button" data-accion="bien">${sinFicha(r) ? "Dejar sin ficha" : "La ficha está bien"} <kbd>1</kbd></button>
      ${sinFicha(r) ? "" : `<button class="btn" type="button" data-accion="quitar">Quitar la ficha <kbd>2</kbd></button>`}
      <button class="btn" type="button" data-accion="descartar">Descartar <kbd>3</kbd></button>
      <button class="btn" type="button" data-accion="saltar">Saltar <kbd>→</kbd></button>
    </div>`;
  const BUSCAR = `
    <section class="rv-bloque">
      <h3>Buscar la ficha buena</h3>
      <form class="rv-linea" data-form="buscar">
        <input name="q" value="${esc(r.nombre)}" aria-label="Texto para buscar en Wikidata" autocomplete="off">
        <button class="btn" type="submit">Buscar en Wikidata <kbd>B</kbd></button>
      </form>
      <p class="rv-meta">También en <a href="https://es.wikipedia.org/w/index.php?search=${encodeURIComponent(r.nombre)}" target="_blank" rel="noopener">Wikipedia</a>
        o <a href="https://www.google.com/search?q=${encodeURIComponent(`${r.nombre} ${r.menciones[0]?.contexto || ""}`)}" target="_blank" rel="noopener">Google</a>.</p>
      <div class="rv-candidatos" id="candidatos"></div>
    </section>`;
  dom.ficha.innerHTML = `<article>
    <p class="rv-motivo">${esc(motivo)}</p>
    <h2 class="rv-nombre">${esc(r.nombre)}</h2>
    <p class="rv-datos">${esc(etiquetaTipo(r.tipo))}, ${plural(r.menciones.length, "mención", "menciones")} en ${plural(r._episodios, "episodio", "episodios")}${ambiguo(r) ? ". Hay otra referencia con el mismo nombre" : ""}</p>
    ${d ? decisionHTML(d) : ""}

    ${sinFicha(r) ? "" : `<h3>Ficha actual</h3>${fichaActualHTML(r)}`}

    <h3>Lo que se dijo</h3>
    ${dichosHTML(r)}

${sinFicha(r) ? BUSCAR + ACCIONES : ACCIONES + BUSCAR}

    <section class="rv-bloque">
      <h3>Es la misma que otra referencia</h3>
      ${similares.length ? `<p class="rv-sugerencias">${similares.map((o) =>
        `<button class="chip" type="button" data-juntar="${esc(o.nombre)}">${esc(nombreEtiqueta(o))}, ${o.menciones.length}</button>`).join("")}</p>` : ""}
      <form class="rv-linea" data-form="juntar">
        <input name="en" list="nombres" placeholder="Nombre de la otra referencia" aria-label="Nombre de la otra referencia" autocomplete="off">
        <button class="btn" type="submit">Juntar <kbd>J</kbd></button>
      </form>
    </section>

    <details class="rv-bloque rv-editar">
      <summary>Cambiar tipo, nombre o descripción</summary>
      <p class="rv-meta">Se guarda junto con la decisión que tomes (ficha buena, quitar ficha, ficha nueva…).</p>
      <div class="rv-campos">
        <label>Tipo <select name="tipo">${tipos}</select></label>
        <label>Nombre <input name="nombre_nuevo" value="${esc(r.nombre)}" autocomplete="off"></label>
        <label>Descripción <input name="descripcion" value="${esc(r.descripcion || "")}" autocomplete="off"></label>
        <label>Enlace <input name="url_externa" type="url" value="${esc(r.url_externa || "")}" autocomplete="off"></label>
      </div>
    </details>
  </article>`;
  if (d?.cambios) {
    for (const [k, v] of Object.entries(d.cambios)) { const el = dom.ficha.querySelector(`[name="${k}"]`); if (el) el.value = v; }
  }
  // Sin ficha: se busca en Wikidata nada más abrir, para tener ya los candidatos a la vista.
  if (sinFicha(r) && r.revisar) buscar(r.nombre);
}

// Lo que el usuario ha cambiado en «Cambiar tipo, nombre o descripción»
function cambiosDelFormulario(r) {
  const valor = (n) => dom.ficha.querySelector(`[name="${n}"]`)?.value.trim() ?? "";
  const cambios = {};
  if (valor("tipo") && valor("tipo") !== r.tipo) cambios.tipo = valor("tipo");
  if (valor("nombre_nuevo") && valor("nombre_nuevo") !== r.nombre) cambios.nombre_nuevo = valor("nombre_nuevo");
  if (valor("descripcion") !== (r.descripcion || "")) cambios.descripcion = valor("descripcion");
  if (valor("url_externa") !== (r.url_externa || "")) cambios.url_externa = valor("url_externa");
  return cambios;
}

// ---------- Decisiones ----------
function decidir(accion, extra = {}) {
  const r = datos.porId.get(actual);
  if (!r) return;
  const cambios = accion === "descartar" || accion === "juntar" ? {} : cambiosDelFormulario(r);
  decisiones[r.id] = { accion, nombre: r.nombre, tipo: r.tipo, ficha: fichaDe(r), ambiguo: ambiguo(r), cambios, ...extra };
  guardarDecisiones();
  actualizarFila(r.id);
  pintarProgreso();
  siguiente();
}

function deshacer() {
  if (!actual || !decisiones[actual]) return;
  delete decisiones[actual];
  guardarDecisiones();
  actualizarFila(actual);
  pintarProgreso();
  abrir(actual);
}

function siguiente(paso = 1) {
  const i = visibles.indexOf(actual);
  // Hacia delante se salta lo ya decidido; hacia atrás se va a la anterior, esté como esté.
  let j = i + paso;
  if (paso > 0) while (j < visibles.length && decisiones[visibles[j]]) j++;
  if (j >= 0 && j < visibles.length) abrir(visibles[j]);
  else if (paso > 0) abrir(visibles.find((id) => !decisiones[id]) || null);
  dom.cola.querySelector('[aria-current="true"]')?.scrollIntoView({ block: "nearest" });
}

function decidirMasivo() {
  const pendientes = visibles.filter((id) => !decisiones[id]);
  if (!pendientes.length || !confirm(`¿Dar por buenas ${pendientes.length} referencias tal como están (con su ficha o sin ella)?`)) return;
  for (const id of pendientes) {
    const r = datos.porId.get(id);
    decisiones[id] = { accion: "bien", nombre: r.nombre, tipo: r.tipo, ficha: fichaDe(r), ambiguo: ambiguo(r), cambios: {} };
  }
  guardarDecisiones();
  pintarProgreso();
  filtrar();
}

// ---------- Búsqueda en Wikidata ----------
async function buscar(texto) {
  const caja = dom.ficha.querySelector("#candidatos");
  if (!caja || !texto.trim()) return;
  const id = actual;
  caja.innerHTML = `<p class="rv-meta">Buscando «${esc(texto)}» en Wikidata…</p>`;
  try {
    if (!candidatosCache.has(texto)) candidatosCache.set(texto, buscarEnWikidata(texto));
    const candidatos = await candidatosCache.get(texto);
    if (actual !== id) return;
    caja.innerHTML = candidatos.length ? candidatos.map((c, i) => `
      <div class="rv-candidato">
        <span class="rv-img">${c.imagen ? `<img src="${esc(c.imagen)}" alt="" loading="lazy" onerror="this.remove()">` : ""}</span>
        <div>
          <p><b>${esc(c.etiqueta)}</b> ${c.descripcion ? `<span>${esc(c.descripcion)}</span>` : ""}</p>
          <p class="rv-meta"><a href="${esc(c.url)}" target="_blank" rel="noopener">${/wikipedia/.test(c.url) ? "Wikipedia" : "Wikidata"}</a>, ${esc(c.q)}</p>
        </div>
        <button class="btn" type="button" data-candidato="${i}" data-texto="${esc(texto)}">Usar esta</button>
      </div>`).join("")
      : `<p class="rv-meta">Wikidata no tiene nada con ese nombre. Prueba con otro texto, o deja la referencia sin ficha.</p>`;
  } catch (err) {
    candidatosCache.delete(texto);
    if (actual === id) caja.innerHTML = `<p class="rv-meta">No se ha podido consultar Wikidata (${esc(err.message)}). Prueba de nuevo en un momento.</p>`;
  }
}

async function usarCandidato(boton) {
  const candidatos = await candidatosCache.get(boton.dataset.texto);
  const c = candidatos?.[Number(boton.dataset.candidato)];
  if (c) decidir("ficha", { nueva: c });
}

// ---------- Generar el fichero ----------
function generar() {
  const lista = Object.values(decisiones);
  const sobrantes = dom.quitarSobrantes.checked ? datos.sobrantes : [];
  const texto = serializar(combinar(datos.correcciones, lista, sobrantes));
  dom.salidaJson.value = texto;
  const cuenta = (a) => lista.filter((d) => d.accion === a).length;
  dom.salidaResumen.textContent = `${plural(lista.length, "decisión", "decisiones")}: ${cuenta("bien")} dadas por buenas, `
    + `${cuenta("quitar")} sin ficha, ${cuenta("ficha")} con ficha nueva, ${cuenta("juntar")} juntadas y ${cuenta("descartar")} descartadas. `
    + `Se añaden a las correcciones que ya había.`;
  return texto;
}

function abrirSalida() {
  dom.sobrantesOpcion.hidden = !datos.sobrantes.length;
  dom.sobrantesTexto.textContent = `Quitar también ${plural(datos.sobrantes.length, "corrección que ya no hace nada", "correcciones que ya no hacen nada")} (el cuaderno ya lo arregló o la referencia ya no existe)`;
  generar();
  dom.salida.showModal();
}

// ---------- Eventos ----------
dom.estado.addEventListener("change", filtrar);
dom.tipo.addEventListener("change", filtrar);
let espera;
dom.texto.addEventListener("input", () => { clearTimeout(espera); espera = setTimeout(filtrar, 150); });
// Intro en el buscador: vuelve a los atajos de teclado sobre la referencia abierta
dom.texto.addEventListener("keydown", (e) => { if (e.key === "Enter") { clearTimeout(espera); filtrar(); e.target.blur(); } });
dom.masivo.addEventListener("click", decidirMasivo);
dom.generar.addEventListener("click", abrirSalida);
dom.quitarSobrantes.addEventListener("change", generar);
$("#cerrar-salida").addEventListener("click", () => dom.salida.close());
$("#copiar").addEventListener("click", async (e) => {
  try { await navigator.clipboard.writeText(dom.salidaJson.value); e.target.textContent = "Copiado"; }
  catch { dom.salidaJson.select(); e.target.textContent = "Selecciona y copia"; }
  setTimeout(() => { e.target.textContent = "Copiar"; }, 2000);
});
$("#descargar").addEventListener("click", () => {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([dom.salidaJson.value], { type: "application/json" }));
  a.download = "correcciones.json";
  a.click();
  URL.revokeObjectURL(a.href);
});
$("#vaciar").addEventListener("click", () => {
  if (!confirm("¿Vaciar todas tus decisiones? Hazlo solo si ya has pegado el fichero en GitHub.")) return;
  decisiones = {};
  guardarDecisiones();
  dom.salida.close();
  pintarProgreso();
  filtrar();
});
$("#enlace-github").href = `https://github.com/${REPOSITORIO}/edit/main/data/correcciones.json`;

dom.cola.addEventListener("click", (e) => {
  const b = e.target.closest("[data-id]");
  if (!b) return;
  abrir(b.dataset.id);
  if (matchMedia("(max-width: 860px)").matches) dom.colaPlegable.open = false;
});

dom.ficha.addEventListener("click", (e) => {
  const el = e.target.closest("button");
  if (!el) return;
  if (el.dataset.accion === "saltar") siguiente();
  else if (el.dataset.accion === "deshacer") deshacer();
  else if (el.dataset.accion) decidir(el.dataset.accion);
  else if (el.dataset.juntar) decidir("juntar", { en: el.dataset.juntar });
  else if (el.dataset.candidato) usarCandidato(el);
});

dom.ficha.addEventListener("submit", (e) => {
  e.preventDefault();
  const form = e.target;
  if (form.dataset.form === "buscar") buscar(form.q.value);
  if (form.dataset.form === "juntar") {
    const en = form.en.value.trim();
    const destino = datos.porNombre.get(normalizar(en).trim());
    if (!destino) { form.en.setCustomValidity("No hay ninguna referencia con ese nombre"); form.en.reportValidity(); return; }
    if (destino.some((o) => o.id === actual)) { form.en.setCustomValidity("Es esta misma referencia"); form.en.reportValidity(); return; }
    decidir("juntar", { en: destino[0].nombre });
  }
});
dom.ficha.addEventListener("input", (e) => { if (e.target.name === "en") e.target.setCustomValidity(""); });

// Atajos de teclado (no mientras se escribe en un campo)
document.addEventListener("keydown", (e) => {
  if (dom.salida.open || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.target.closest("input, textarea, select")) {
    if (e.key === "Escape") e.target.blur();
    return;
  }
  const r = datos.porId.get(actual);
  if (!r) return;
  const acciones = {
    1: () => decidir("bien"), 2: () => !sinFicha(r) && decidir("quitar"), 3: () => decidir("descartar"),
    ArrowRight: () => siguiente(1), ArrowLeft: () => siguiente(-1), z: deshacer, Z: deshacer,
    j: () => dom.ficha.querySelector('[name="en"]')?.focus(), J: () => dom.ficha.querySelector('[name="en"]')?.focus(),
    b: () => dom.ficha.querySelector('[name="q"]')?.focus(), B: () => dom.ficha.querySelector('[name="q"]')?.focus(),
  };
  if (acciones[e.key]) { e.preventDefault(); acciones[e.key](); }
});

// ---------- Arranque ----------
try {
  const [lista, correcciones, informe] = await Promise.all([
    pedirJSON(RUTA_COMPLETO), pedirJSON(RUTA_CORRECCIONES, true), pedirJSON("data/informe-limpieza.json", true),
  ]);
  datos.correcciones = correcciones || {};
  datos.sobrantes = informe?.sobrantes || [];
  cargarDecisiones();
  preparar(lista);
  if (matchMedia("(max-width: 860px)").matches) dom.colaPlegable.open = false;   // en móvil, primero la ficha
  pintarProgreso();
  filtrar();
} catch (err) {
  dom.progreso.textContent = `No se han podido cargar las referencias: ${err.message}.`;
}
