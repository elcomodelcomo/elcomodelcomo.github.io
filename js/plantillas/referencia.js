// HTML de una referencia: fila del índice, ficha y minutos enlazados.
import { etiquetaTipo } from "../config.js";
import { datos, estado, mencionesVisibles } from "../filtros.js";
import { imgHTML } from "../imagenes.js";
import { enlaceMencion, esc, plural } from "../utils.js";

/** Enlace de minuto; su estilo indica la relevancia. Lo citado en la descripción del vídeo lleva «descr.». */
export function marcaTiempo(m) {
  const enlace = esc(m.enlace || enlaceMencion(m));
  if (m.origen === "descripcion") {
    return `<a class="ts descr ${esc(m.relevancia)}" href="${enlace}" target="_blank" rel="noopener"
      title="Citado en la descripción del vídeo">descr.</a>`;
  }
  return `<a class="ts ${esc(m.relevancia)}" href="${enlace}" target="_blank" rel="noopener"
      title="Abrir en YouTube en el ${esc(m.minuto)}">${esc(m.minuto)}</a>`;
}

/** Enlace que traía la descripción del vídeo (artículos, estudios…). */
export const enlaceCitado = (m) =>
  m.url ? ` <a class="citado" href="${esc(m.url)}" target="_blank" rel="noopener">enlace ↗</a>` : "";

export const textoMenciones = (n) => plural(n, "mención", "menciones");

export const CARGANDO_FICHA = `<p class="cargando">Cargando la ficha…</p>`;
export const errorFicha = (err) => `<p class="cargando">No se ha podido cargar la ficha: ${esc(err.message)}.</p>`;

function fechas(r) {
  const e = r.extra || {};
  if (!r.anio) return "";
  if (r.tipo === "persona") return e.anio_fallecimiento ? `${r.anio}–${e.anio_fallecimiento}` : `n. ${r.anio}`;
  return e.anio_fin ? `${r.anio}–${e.anio_fin}` : String(r.anio);
}

function datosFicha(r) {
  const e = r.extra || {};
  const sueltos = [];
  const f = fechas(r);
  if (f) sueltos.push(esc(f));
  if (e.titulo_original && e.titulo_original !== r.nombre) sueltos.push(`título original: <i>${esc(e.titulo_original)}</i>`);
  if (e.autores?.length) sueltos.push(esc([].concat(e.autores).join(", ")));
  if (e.artistas?.length) sueltos.push(esc([].concat(e.artistas).join(", ")));
  return sueltos;
}

const FUENTES = { tmdb: "TMDB", openlibrary: "Open Library", musicbrainz: "MusicBrainz", wikidata: "Wikidata", enlace: "la web" };

function enlacesFicha(r) {
  const e = r.extra || {};
  const a = (url, texto) => `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(texto)}</a>`;
  const enlaces = [];
  if (r.url_externa) {
    const texto = /wikipedia/.test(r.url_externa) ? "Wikipedia"
      : r.tipo === "articulo" ? "Leer el artículo"
      : `Ficha en ${FUENTES[r.fuente] || r.fuente || "la fuente"}`;
    enlaces.push(a(r.url_externa, texto));
  }
  if (r.wikidata && !/wikidata\.org/.test(r.url_externa || "")) enlaces.push(a(`https://www.wikidata.org/wiki/${r.wikidata}`, "Wikidata"));
  if (e.web && e.web !== r.url_externa) enlaces.push(a(e.web, "Web oficial"));
  return enlaces;
}

function mencionesPorEpisodio(r) {
  const grupos = {};
  for (const m of mencionesVisibles(r)) (grupos[m.video_id] ||= []).push(m);
  return Object.entries(grupos).map(([id, ms]) => {
    const ep = datos.porId[id] || { corto: ms[0].episodio || id, sub: "" };
    return `<div class="ep">
      <h4>${esc(ep.corto)} ${ep.sub ? `<small>${esc(ep.sub)}</small>` : ""}</h4>
      ${ms.map((m) => `<div class="ment">${marcaTiempo(m)}<span>${esc(m.contexto)}${enlaceCitado(m)}</span></div>`).join("")}
    </div>`;
  }).join("");
}

/** Ficha: imagen, datos, enlaces y menciones. La referencia tiene que estar completa (ver datos.js). */
export function fichaHTML(r) {
  const sueltos = datosFicha(r), enlaces = enlacesFicha(r);
  const cabecera = sueltos.length || enlaces.length
    ? `<p class="facts">${sueltos.join(", ")}${sueltos.length && enlaces.length ? "<br>" : ""}${enlaces.join("")}</p>`
    : "";
  const img = imgHTML(r);
  return `<div class="pic${r.tipo === "pais" ? " bandera" : ""}">${img}</div><div>${cabecera}${mencionesPorEpisodio(r)}</div>`;
}

/** Contenido del desplegable: la ficha si ya está, o un aviso y la marca para pedirla. */
export function detalleHTML(r) {
  if (!estado.abiertas.has(r.id)) return `<div class="detail"></div>`;
  return r._completa ? `<div class="detail">${fichaHTML(r)}</div>` : `<div class="detail" data-pendiente>${CARGANDO_FICHA}</div>`;
}

/** Fila del índice (plegada o desplegada). */
export function entradaHTML(r) {
  const ms = mencionesVisibles(r);
  const nEpisodios = new Set(ms.map((m) => m.video_id)).size;
  const central = ms.some((m) => m.relevancia === "central");
  const abierta = estado.abiertas.has(r.id);
  const descripcion = [r.autor, r.descripcion].filter(Boolean).join(". ");
  return `<li class="entry${central ? " central" : ""}${abierta ? " open" : ""}" data-id="${esc(r.id)}">
    <button aria-expanded="${abierta}">
      <span><span class="name">${esc(r.nombre)}</span>, <span class="kind">${esc(etiquetaTipo(r.tipo))}</span>${r.revisar ? '<span class="flag">por revisar</span>' : ""}</span>
      <span class="count">${textoMenciones(ms.length)}${nEpisodios > 1 ? `<br>${nEpisodios} episodios` : ""}</span>
      ${descripcion ? `<span class="desc">${esc(descripcion)}</span>` : ""}
    </button>
    ${detalleHTML(r)}
  </li>`;
}
