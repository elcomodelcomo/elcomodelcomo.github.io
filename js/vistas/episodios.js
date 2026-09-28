// Vista «Por episodio»: cada episodio con sus menciones en orden cronológico.
import { RELEVANCIA } from "../config.js";
import { datos, estado, relevanciaMinima } from "../filtros.js";
import { marcaTiempo } from "../plantillas/referencia.js";
import { esc } from "../utils.js";

const MAX_TEMAS = 12;

function filaHTML({ ref, mencion }) {
  return `<li>${marcaTiempo(mencion)}<span>
    <button class="ref" data-ir-a="${esc(ref.id)}">${esc(ref.nombre)}</button>
    <span class="ctx">${esc(mencion.contexto)}</span></span></li>`;
}

function episodioHTML(ep, idsVisibles, abierto) {
  const minima = relevanciaMinima();
  const menciones = ep.menciones.filter(
    (x) => idsVisibles.has(x.ref.id) && (RELEVANCIA[x.mencion.relevancia] || 0) >= minima
  );
  if (!menciones.length) return "";

  const nReferencias = new Set(menciones.map((x) => x.ref.id)).size;
  const temas = [...new Set(menciones.filter((x) => x.mencion.relevancia === "central").map((x) => x.ref.nombre))];
  const resumenTemas = temas.length
    ? `<p class="ctx">De qué se habla sobre todo: ${temas.slice(0, MAX_TEMAS).map(esc).join(", ")}${temas.length > MAX_TEMAS ? "…" : ""}</p>`
    : "";

  return `<article class="episode">
    <h2>${esc(ep.corto)}</h2>
    ${ep.sub ? `<p class="sub">${esc(ep.sub)}</p>` : ""}
    <p class="meta">${nReferencias} referencias, ${menciones.length} menciones.
      <a href="https://www.youtube.com/watch?v=${esc(ep.id)}" target="_blank" rel="noopener">Ver en YouTube</a></p>
    ${resumenTemas}
    <details${abierto ? " open" : ""}>
      <summary>Ver las ${menciones.length} menciones en orden</summary>
      <ol class="tl">${menciones.map(filaHTML).join("")}</ol>
    </details>
  </article>`;
}

export function pintarEpisodios(lista, { contenedor, barraLetras }) {
  barraLetras.innerHTML = "";
  const ids = new Set(lista.map((r) => r.id));
  const episodios = datos.episodios.filter((e) => !estado.episodio || e.id === estado.episodio);
  const abierto = episodios.length === 1;
  contenedor.innerHTML = episodios.map((ep) => episodioHTML(ep, ids, abierto)).join("");
}
