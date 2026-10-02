// Limpieza de los datos del cuaderno antes de publicarlos. Sin DOM: la usan herramientas/construir.mjs
// y el navegador (cuando parte el JSON él mismo), así la web y la descarga muestran lo mismo.
//
// Orden:
//   1. Correcciones a mano de data/correcciones.json: descartar, cambiar y fusionar.
//   2. Artistas musicales que según su propia descripción no lo son (arquitectos, futbolistas…) pasan a persona.
//   3. Se juntan las referencias que son la misma cosa: mismo elemento de Wikidata, mismo id en TMDB,
//      MusicBrainz u Open Library, o mismo nombre entre persona y artista musical.
//
// Devuelve { lista, informe }; el informe lo escribe construir.mjs en el registro de GitHub Actions.
import { normalizar } from "./utils.js";

const RELEVANCIAS = ["de_pasada", "secundaria", "central"];
const MISMA_PERSONA = new Set(["persona", "artista_musical"]);

// Pistas en la descripción (en castellano o en inglés, según la fuente).
const NO_MUSICA = /\b(arquitect|futbolist|footballer|soccer|filosof|philosoph|skateboard|boxer|boxeador|periodist|journalist|escritor|writer|poeta?\b|poet\b|playwright|dramaturg|youtuber|streamer|twitch|pintor|painter|artista marcial|martial|politic|empresari|businessman|entrenador|coach|militar|military|comedian|humorist|comedy|comedia|actor\b)/;
const MUSICA = /(singer|cantante|cantaor|music|musico|rapper|rapero|\bband\b|banda|grupo musical|composer|compositor|\bdj\b|guitar|\bmc\b|trap|\bpop\b|rock|metal|country|hip hop|reggae|orquesta|orchestra)/;

const vacio = (v) => v == null || v === "" || (Array.isArray(v) && !v.length);

/** Busca referencias por nombre (sin tildes ni mayúsculas) y, si se indica, por tipo. */
function seleccionar(lista, nombre, tipo) {
  const n = normalizar(nombre).trim();
  return lista.filter((r) => normalizar(r.nombre).trim() === n && (!tipo || r.tipo === tipo));
}

/** Qué referencia del grupo tiene la ficha más fiable: sin «por revisar», de Wikidata, con descripción. */
const fiabilidad = (r) => (r.revisar ? 0 : 4) + (r.fuente === "wikidata" ? 2 : 0) + (r.descripcion ? 1 : 0);

/**
 * Junta varias referencias en una.
 *  - nombre: el de la que más se menciona (o el que se indique)
 *  - tipo: el que suma más menciones en el grupo
 *  - ficha (fuente, enlaces, imagen…): la más fiable, o la de «identidad» si se indica
 */
function fusionar(grupo, { identidad = null, nombre = null } = {}) {
  const porMenciones = [...grupo].sort((a, b) => b.menciones.length - a.menciones.length || (a.id < b.id ? -1 : 1));
  const principal = porMenciones[0];
  const base = identidad || [...porMenciones].sort((a, b) => fiabilidad(b) - fiabilidad(a))[0];
  const votos = {};
  for (const x of grupo) votos[x.tipo] = (votos[x.tipo] || 0) + x.menciones.length;
  const tipo = identidad ? identidad.tipo : Object.entries(votos).sort((a, b) => b[1] - a[1])[0][0];
  const r = { ...base, id: principal.id, nombre: nombre || (identidad ? identidad.nombre : principal.nombre), tipo, extra: { ...(base.extra || {}) } };
  // Si a la ficha le falta algo, se rellena con lo que tengan las demás. En las fusiones a mano no:
  // ahí «de» suele estar mal identificada y colaría datos de otra cosa.
  for (const otra of identidad ? [] : porMenciones) {
    for (const k of ["autor", "anio", "descripcion", "imagen", "url_externa", "wikidata"]) if (vacio(r[k]) && !vacio(otra[k])) r[k] = otra[k];
    for (const [k, v] of Object.entries(otra.extra || {})) if (vacio(r.extra[k]) && !vacio(v)) r.extra[k] = v;
  }
  // Menciones sin repetir: la misma en el mismo minuto del mismo episodio cuenta una vez.
  const vistas = new Set();
  r.menciones = [];
  for (const m of grupo.flatMap((x) => x.menciones)) {
    const clave = `${m.video_id}|${m.minuto}|${m.origen || "audio"}`;
    if (!vistas.has(clave)) { vistas.add(clave); r.menciones.push(m); }
  }
  r.revisar = !!base.revisar;
  r.num_episodios = new Set(r.menciones.map((m) => m.video_id)).size;
  r.relevancia_max = RELEVANCIAS[Math.max(...r.menciones.map((m) => RELEVANCIAS.indexOf(m.relevancia)))] || r.relevancia_max;
  return r;
}

/** Quita la identificación (cuando la fuente encontró otra cosa con el mismo nombre). */
function quitarFicha(r) {
  return { ...r, fuente: null, id_externo: null, url_externa: null, wikidata: null, imagen: null, descripcion: null, anio: null, extra: {}, revisar: true };
}

// --- 1. Correcciones a mano -------------------------------------------------

function aplicarCorrecciones(lista, c, informe) {
  const avisar = (texto) => informe.avisos.push(texto);

  for (const d of c.descartar || []) {
    const [nombre, tipo] = typeof d === "string" ? [d, null] : [d.nombre, d.tipo];
    const fuera = new Set(seleccionar(lista, nombre, tipo));
    if (!fuera.size) avisar(`descartar: no hay ninguna referencia «${nombre}»`);
    lista = lista.filter((r) => !fuera.has(r));
  }

  for (const cambio of c.cambiar || []) {
    const { nombre, si_tipo, quitar_ficha, ...campos } = cambio;
    const elegidas = seleccionar(lista, nombre, si_tipo);
    if (!elegidas.length) { avisar(`cambiar: no hay ninguna referencia «${nombre}»${si_tipo ? ` de tipo ${si_tipo}` : ""}`); continue; }
    lista = lista.map((r) => {
      if (!elegidas.includes(r)) return r;
      let nueva = quitar_ficha ? quitarFicha(r) : { ...r };
      const { iso, ...resto } = campos;
      Object.assign(nueva, resto);
      if (iso !== undefined) nueva.extra = { ...nueva.extra, iso };
      return nueva;
    });
  }

  for (const { de, en, si_tipo, nombre } of c.fusionar || []) {
    const origen = seleccionar(lista, de, si_tipo);
    const destino = seleccionar(lista, en);
    if (!origen.length || !destino.length) { avisar(`fusionar: no se encuentra «${!origen.length ? de : en}»`); continue; }
    const grupo = [...new Set([...origen, ...destino])];
    const unida = fusionar(grupo, { identidad: destino[0], nombre });
    lista = lista.filter((r) => !grupo.includes(r)).concat(unida);
  }
  return lista;
}

// --- 2. Artistas musicales que no lo son -------------------------------------

function corregirMusicos(lista, informe) {
  return lista.map((r) => {
    if (r.tipo !== "artista_musical") return r;
    const desc = normalizar(r.descripcion || "");
    if (!NO_MUSICA.test(desc) || MUSICA.test(desc)) return r;
    informe.retipados.push(`${r.nombre} (${r.descripcion})`);
    return { ...r, tipo: "persona" };
  });
}

// --- 3. Una sola referencia por cosa ------------------------------------------

function juntarRepetidas(lista, informe) {
  // Unión de conjuntos: dos referencias que comparten cualquier clave acaban en el mismo grupo.
  const padre = lista.map((_, i) => i);
  const raiz = (i) => (padre[i] === i ? i : (padre[i] = raiz(padre[i])));
  const primera = new Map();
  const unir = (clave, i) => {
    if (!primera.has(clave)) primera.set(clave, i);
    else padre[raiz(i)] = raiz(primera.get(clave));
  };
  lista.forEach((r, i) => {
    if (r.wikidata) unir(`wd:${r.wikidata}`, i);
    if (r.fuente && r.fuente !== "wikidata" && r.fuente !== "enlace" && r.id_externo) unir(`${r.fuente}:${r.id_externo}`, i);
    if (MISMA_PERSONA.has(r.tipo)) unir(`persona:${normalizar(r.nombre).trim()}`, i);
  });

  const grupos = new Map();
  lista.forEach((r, i) => { const k = raiz(i); (grupos.get(k) || grupos.set(k, []).get(k)).push(r); });

  const salida = [];
  for (const grupo of grupos.values()) {
    if (grupo.length === 1) { salida.push(grupo[0]); continue; }
    const unida = fusionar(grupo);
    // Si los nombres no se parecen, puede que una de ellas esté mal identificada: se avisa para revisarlo.
    const nombres = [...new Set(grupo.map((x) => `${x.nombre} (${x.tipo})`))];
    const parecidos = grupo.every((x) => {
      const a = normalizar(x.nombre), b = normalizar(unida.nombre);
      return a.includes(b) || b.includes(a);
    });
    informe.fusionadas.push({ queda: `${unida.nombre} (${unida.tipo})`, juntas: nombres, revisar: !parecidos });
    salida.push(unida);
  }
  return salida;
}

/** Aplica todo. «correcciones» es el contenido de data/correcciones.json (puede faltar). */
export function limpiar(listaOriginal, correcciones = {}) {
  const informe = { avisos: [], retipados: [], fusionadas: [] };
  let lista = listaOriginal.map((r) => ({ ...r, menciones: [...(r.menciones || [])] }));
  lista = aplicarCorrecciones(lista, correcciones || {}, informe);
  lista = corregirMusicos(lista, informe);
  lista = juntarRepetidas(lista, informe);
  lista.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return { lista, informe };
}
