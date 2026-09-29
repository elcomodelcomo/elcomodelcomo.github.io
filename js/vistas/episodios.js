// Vista «Por episodio»: cada episodio con sus menciones en orden cronológico.
import { datos, estado, mencionesVisibles, ordenActual } from "../filtros.js";
import { marcaTiempo } from "../plantillas/referencia.js";
import { compararAZ, esc, plural, sinSignosIniciales } from "../utils.js";

const MAX_TEMAS = 12;

function filaHTML({ ref, mencion }) {
  return `<li>${marcaTiempo(mencion)}<span>
    <button class="ref" data-ir-a="${esc(ref.id)}">${esc(ref.nombre)}</button>
    <span class="ctx">${esc(mencion.contexto)}</span></span></li>`;
}

/** Menciones del episodio que pasan los filtros, con su recuento. */
function resumir(ep, idsVisibles) {
  const visibles = new Set();
  const menciones = ep.menciones.filter((x) => {
    const ok = idsVisibles.has(x.ref.id) && mencionesVisibles(x.ref).includes(x.mencion);
    if (ok) visibles.add(x.ref.id);
    return ok;
  });
  return { ep, menciones, nReferencias: visibles.size };
}

function episodioHTML({ ep, menciones, nReferencias }, abierto) {
  const temas = [...new Set(menciones.filter((x) => x.mencion.relevancia === "central").map((x) => x.ref.nombre))];
  const resumenTemas = temas.length
    ? `<p class="ctx">De qué se habla sobre todo: ${temas.slice(0, MAX_TEMAS).map(esc).join(", ")}${temas.length > MAX_TEMAS ? "…" : ""}</p>`
    : "";
  return `<article class="episode">
    <h2>${esc(ep.corto)}</h2>
    ${ep.sub ? `<p class="sub">${esc(ep.sub)}</p>` : ""}
    <p class="meta"><b>${plural(nReferencias, "referencia", "referencias")}</b>, ${plural(menciones.length, "mención", "menciones")}.
      <a href="https://www.youtube.com/watch?v=${esc(ep.id)}" target="_blank" rel="noopener">Ver en YouTube</a></p>
    ${resumenTemas}
    <details${abierto ? " open" : ""}>
      <summary>Ver las ${menciones.length} menciones en orden</summary>
      <ol class="tl">${menciones.map(filaHTML).join("")}</ol>
    </details>
  </article>`;
}

const COMPARADORES = {
  titulo: (a, b) => compararAZ(sinSignosIniciales(a.ep.corto), sinSignosIniciales(b.ep.corto)),
  referencias: (a, b) => b.nReferencias - a.nReferencias || b.menciones.length - a.menciones.length,
  menciones: (a, b) => b.menciones.length - a.menciones.length || b.nReferencias - a.nReferencias,
};

export function pintarEpisodios(lista, { contenedor, barraLetras }) {
  barraLetras.innerHTML = "";
  const ids = new Set(lista.map((r) => r.id));
  const resumenes = datos.episodios
    .filter((e) => !estado.episodio || e.id === estado.episodio)
    .map((e) => resumir(e, ids))
    .filter((r) => r.menciones.length)
    .sort(COMPARADORES[ordenActual()] || COMPARADORES.titulo);
  const abierto = resumenes.length === 1;
  contenedor.innerHTML = resumenes.map((r) => episodioHTML(r, abierto)).join("");
}
