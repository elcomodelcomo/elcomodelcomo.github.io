// HTML de una referencia: fila del índice, ficha y minutos enlazados.
import { etiquetaTipo } from "../config.js";
import { datos, estado, mencionesVisibles } from "../filtros.js";
import { imgHTML } from "../imagenes.js";
import { esc, plural } from "../utils.js";

/** Enlace de minuto; su estilo indica la relevancia de la mención. */
export const marcaTiempo = (m) =>
  `<a class="ts ${esc(m.relevancia)}" href="${esc(m.enlace)}" target="_blank" rel="noopener"
      title="Abrir en YouTube en el ${esc(m.minuto)}">${esc(m.minuto)}</a>`;

export const textoMenciones = (n) => plural(n, "mención", "menciones");

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

const FUENTES = { tmdb: "TMDB", openlibrary: "Open Library", musicbrainz: "MusicBrainz", wikidata: "Wikidata" };

function enlacesFicha(r) {
  const e = r.extra || {};
  const a = (url, texto) => `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(texto)}</a>`;
  const enlaces = [];
  if (r.url_externa) enlaces.push(a(r.url_externa, /wikipedia/.test(r.url_externa) ? "Wikipedia" : `Ficha en ${FUENTES[r.fuente] || r.fuente || "la fuente"}`));
  if (r.wikidata && !/wikidata\.org/.test(r.url_externa || "")) enlaces.push(a(`https://www.wikidata.org/wiki/${r.wikidata}`, "Wikidata"));
  if (e.web) enlaces.push(a(e.web, "Web oficial"));
  return enlaces;
}

function mencionesPorEpisodio(r) {
  const grupos = {};
  for (const m of mencionesVisibles(r)) (grupos[m.video_id] ||= []).push(m);
  return Object.entries(grupos).map(([id, ms]) => {
    const ep = datos.porId[id];
    return `<div class="ep">
      <h4>${esc(ep.corto)} ${ep.sub ? `<small>${esc(ep.sub)}</small>` : ""}</h4>
      ${ms.map((m) => `<div class="ment">${marcaTiempo(m)}<span>${esc(m.contexto)}</span></div>`).join("")}
    </div>`;
  }).join("");
}

/** Ficha: imagen, datos, enlaces y menciones. Se usa en el índice y en la ventana. */
export function fichaHTML(r) {
  const sueltos = datosFicha(r), enlaces = enlacesFicha(r);
  const cabecera = sueltos.length || enlaces.length
    ? `<p class="facts">${sueltos.join(", ")}${sueltos.length && enlaces.length ? "<br>" : ""}${enlaces.join("")}</p>`
    : "";
  const img = imgHTML(r);
  return `<div class="pic${r.tipo === "pais" ? " bandera" : ""}">${img}</div><div>${cabecera}${mencionesPorEpisodio(r)}</div>`;
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
    <div class="detail">${abierta ? fichaHTML(r) : ""}</div>
  </li>`;
}
