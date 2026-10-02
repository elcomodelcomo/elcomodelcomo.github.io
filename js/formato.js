// Cómo se parte portal_referencias.json (la salida del cuaderno) en los ficheros que carga la web.
// Sin DOM: lo usan el navegador y herramientas/construir.mjs, así las dos cosas no se desincronizan.
//
//   indice.json                 lo justo para buscar, filtrar y listar; es lo único que se descarga al entrar
//   fichas/<xx>.json            detalle de cada referencia, agrupadas por los 2 primeros caracteres del id
//   episodios/<video_id>.json   menciones de un episodio en orden (vista «Episodios»)
//   imagenes.json               portada, foto o logo de cada referencia; se pide al abrir el mosaico o el mapa
//
// Las menciones van como listas cortas en vez de objetos para que pesen menos:
//   en el índice   [episodio, relevancia, 1 si es de la descripción]
//   en las fichas  [video_id, minuto, relevancia, contexto, 1 si es de la descripción, enlace citado]
//   en episodios   [id de la referencia, minuto, relevancia, contexto, 1 si es de la descripción, enlace citado]
import { compararAZ, segundos } from "./utils.js";

export const PREFIJO_FICHAS = 2;
export const RELEVANCIAS = ["", "de_pasada", "secundaria", "central"];
export const DESCRIPCION = "descripcion";

const codigoRelevancia = (r) => Math.max(0, RELEVANCIAS.indexOf(r));
export const esDeDescripcion = (m) => m.origen === DESCRIPCION;

/** Orden dentro de un episodio: por minuto, y lo citado en la descripción del vídeo al final. */
export const posicionMencion = (m) => (esDeDescripcion(m) ? Infinity : segundos(m.minuto));

/** Quita las claves vacías para no escribir "autor": null miles de veces. */
function sinVacios(o) {
  for (const k of Object.keys(o)) {
    const v = o[k];
    if (v == null || v === "" || v === 0 || (Array.isArray(v) && !v.length) || (typeof v === "object" && !Array.isArray(v) && !Object.keys(v).length)) delete o[k];
  }
  return o;
}

/** Quita los campos opcionales vacíos del final: [id, "1:02", 2, "…", 0, null] → [id, "1:02", 2, "…"] */
function recortar(lista, obligatorios) {
  while (lista.length > obligatorios && (lista.at(-1) == null || lista.at(-1) === 0 || lista.at(-1) === "")) lista.pop();
  return lista;
}

/** Parte la lista del cuaderno. Mismos datos → mismos ficheros, para que Git solo vea lo que cambia. */
export function partir(lista) {
  if (!Array.isArray(lista)) throw new Error("el JSON debe ser una lista de referencias");

  const titulos = new Map();
  for (const r of lista) for (const m of r.menciones || []) if (!titulos.has(m.video_id)) titulos.set(m.video_id, m.episodio || m.video_id);
  const episodios = [...titulos].map(([id, t]) => ({ id, t })).sort((a, b) => compararAZ(a.t, b.t) || (a.id < b.id ? -1 : 1));
  const posEpisodio = new Map(episodios.map((e, i) => [e.id, i]));

  const refs = [], fichas = {}, imagenes = {}, porEpisodio = Object.fromEntries(episodios.map((e) => [e.id, []]));
  let identificadas = 0;

  for (const r of [...lista].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))) {
    const menciones = [...(r.menciones || [])].sort((a, b) =>
      posEpisodio.get(a.video_id) - posEpisodio.get(b.video_id) || posicionMencion(a) - posicionMencion(b));
    const { iso, ...extra } = r.extra || {};
    if (r.fuente) identificadas++;
    if (r.imagen) imagenes[r.id] = r.imagen;

    refs.push(sinVacios({
      id: r.id, t: r.tipo, n: r.nombre, a: r.autor, d: r.descripcion, iso,
      to: extra.titulo_original, rv: r.revisar ? 1 : 0,
      m: menciones.map((m) => recortar([posEpisodio.get(m.video_id), codigoRelevancia(m.relevancia), esDeDescripcion(m) ? 1 : 0], 2)),
    }));

    (fichas[r.id.slice(0, PREFIJO_FICHAS)] ||= {})[r.id] = sinVacios({
      img: r.imagen, anio: r.anio, fuente: r.fuente, url: r.url_externa, wd: r.wikidata, x: extra,
      m: menciones.map((m) => recortar([m.video_id, m.minuto, codigoRelevancia(m.relevancia), m.contexto, esDeDescripcion(m) ? 1 : 0, m.url], 4)),
    });

    for (const m of menciones) {
      porEpisodio[m.video_id].push(recortar([r.id, m.minuto, codigoRelevancia(m.relevancia), m.contexto, esDeDescripcion(m) ? 1 : 0, m.url], 4));
    }
  }

  // Dentro de cada episodio, en el orden en que se dicen; a igual minuto, por id para que sea estable.
  const posicion = (x) => (x[4] ? Infinity : segundos(x[1]));
  for (const ms of Object.values(porEpisodio)) ms.sort((a, b) => posicion(a) - posicion(b) || (a[0] < b[0] ? -1 : 1));

  const indice = { v: "", prefijo: PREFIJO_FICHAS, identificadas, episodios, refs };
  return { indice, fichas, episodios: porEpisodio, imagenes };
}

/** Lista corta de una mención → el objeto que usan las plantillas. */
export function leerMencion([video_id, minuto, relevancia, contexto, descripcion, url]) {
  return {
    video_id, minuto: minuto || "", relevancia: RELEVANCIAS[relevancia] || "", contexto: contexto || "",
    origen: descripcion ? DESCRIPCION : "audio", url: url || null,
  };
}
