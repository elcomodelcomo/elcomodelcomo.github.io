// HTML de una referencia: fila del índice y ficha desplegada.
import { etiquetaTipo } from "../config.js";
import { datos, estado, mencionesVisibles } from "../filtros.js";
import { esc, plural } from "../utils.js";

/** Enlace de minuto; su color indica la relevancia de la mención. */
export const marcaTiempo = (m) =>
  `<a class="ts ${esc(m.relevancia)}" href="${esc(m.enlace)}" target="_blank" rel="noopener"
      title="Abrir en YouTube en el ${esc(m.minuto)}">${esc(m.minuto)}</a>`;

function fechas(r) {
  const e = r.extra || {};
  if (!r.anio) return "";
  if (r.tipo === "persona") return e.anio_fallecimiento ? `${r.anio}–${e.anio_fallecimiento}` : `n. ${r.anio}`;
  return e.anio_fin ? `${r.anio}–${e.anio_fin}` : String(r.anio);
}

function datosFicha(r) {
  const e = r.extra || {};
  const datosSueltos = [];
  const f = fechas(r);
  if (f) datosSueltos.push(esc(f));
  if (e.titulo_original && e.titulo_original !== r.nombre) datosSueltos.push(`título original: <i>${esc(e.titulo_original)}</i>`);
  if (e.autores?.length) datosSueltos.push(esc([].concat(e.autores).join(", ")));
  if (e.artistas?.length) datosSueltos.push(esc([].concat(e.artistas).join(", ")));
  return datosSueltos;
}

function enlacesFicha(r) {
  const e = r.extra || {};
  const enlaces = [];
  const a = (url, texto) => `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(texto)}</a>`;
  if (r.url_externa) enlaces.push(a(r.url_externa, /wikipedia/.test(r.url_externa) ? "Wikipedia" : `Ficha en ${r.fuente || "la fuente"}`));
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

/** Ficha desplegada: imagen, datos, enlaces y menciones. */
export function fichaHTML(r) {
  const sueltos = datosFicha(r), enlaces = enlacesFicha(r);
  const imagen = r.imagen ? `<img src="${esc(r.imagen)}" alt="" loading="lazy" onerror="this.remove()">` : "";
  const cabecera = sueltos.length || enlaces.length
    ? `<p class="facts">${sueltos.join(", ")}${sueltos.length && enlaces.length ? "<br>" : ""}${enlaces.join("")}</p>`
    : "";
  return `<div class="pic">${imagen}</div><div>${cabecera}${mencionesPorEpisodio(r)}</div>`;
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
      <span class="count">${plural(ms.length, "mención", "menciones")}${nEpisodios > 1 ? `<br>${nEpisodios} episodios` : ""}</span>
      ${descripcion ? `<span class="desc">${esc(descripcion)}</span>` : ""}
    </button>
    <div class="detail">${abierta ? fichaHTML(r) : ""}</div>
  </li>`;
}
