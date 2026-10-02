// Vista «Episodios»: cada episodio con sus menciones en orden.
// Los recuentos salen del índice; las menciones con minuto y contexto se piden al desplegar el episodio.
import { datos, estado, mencionesVisibles, ordenActual, relevanciaMinima } from "../filtros.js";
import { mencionesDeEpisodio } from "../datos.js";
import { RELEVANCIA } from "../config.js";
import { enlaceCitado, marcaTiempo } from "../plantillas/referencia.js";
import { compararAZ, compararES, esc, plural, sinSignosIniciales } from "../utils.js";

const MAX_TEMAS = 12;

function filaHTML({ ref, mencion }) {
  return `<li>${marcaTiempo(mencion)}<span>
    <button class="ref" data-ir-a="${esc(ref.id)}">${esc(ref.nombre)}</button>
    <span class="ctx">${esc(mencion.contexto)}${enlaceCitado(mencion)}</span></span></li>`;
}

/** Recuentos por episodio con los filtros actuales, en una sola pasada por las referencias. */
function resumir(lista) {
  const porEpisodio = new Map();
  for (const r of lista) {
    const enEste = new Map();
    for (const m of mencionesVisibles(r)) {
      const c = enEste.get(m.video_id) || { n: 0, central: false };
      c.n++;
      c.central ||= m.relevancia === "central";
      enEste.set(m.video_id, c);
    }
    for (const [id, c] of enEste) {
      const ep = porEpisodio.get(id) || { ep: datos.porId[id], menciones: 0, nReferencias: 0, temas: [] };
      ep.menciones += c.n;
      ep.nReferencias++;
      if (c.central) ep.temas.push([r.nombre, c.n]);
      porEpisodio.set(id, ep);
    }
  }
  return [...porEpisodio.values()].filter((x) => x.ep);
}

function episodioHTML({ ep, menciones, nReferencias, temas }, abierto) {
  // Primero los temas centrales de los que más se habla en el episodio.
  const nombres = temas.sort((a, b) => b[1] - a[1] || compararES(a[0], b[0])).map(([n]) => n);
  const resumenTemas = nombres.length
    ? `<p class="ctx">De qué se habla sobre todo: ${nombres.slice(0, MAX_TEMAS).map(esc).join(", ")}${nombres.length > MAX_TEMAS ? "…" : ""}</p>`
    : "";
  return `<article class="episode">
    <h2>${esc(ep.corto)}</h2>
    ${ep.sub ? `<p class="sub">${esc(ep.sub)}</p>` : ""}
    <p class="meta"><b>${plural(nReferencias, "referencia", "referencias")}</b>, ${plural(menciones, "mención", "menciones")}.
      <a href="https://www.youtube.com/watch?v=${esc(ep.id)}" target="_blank" rel="noopener">Ver en YouTube</a></p>
    ${resumenTemas}
    <details data-episodio="${esc(ep.id)}"${abierto ? " open" : ""}>
      <summary>Ver las ${menciones} menciones en orden</summary>
      <ol class="tl"></ol>
    </details>
  </article>`;
}

const COMPARADORES = {
  titulo: (a, b) => compararAZ(sinSignosIniciales(a.ep.corto), sinSignosIniciales(b.ep.corto)),
  referencias: (a, b) => b.nReferencias - a.nReferencias || b.menciones - a.menciones,
  menciones: (a, b) => b.menciones - a.menciones || b.nReferencias - a.nReferencias,
};

// Referencias que pasan los filtros, para saber qué filas mostrar al desplegar.
let visibles = new Set();

async function rellenar(details) {
  const ol = details.querySelector("ol");
  if (details.dataset.cargado) return;
  details.dataset.cargado = "1";
  ol.innerHTML = `<li class="cargando">Cargando las menciones…</li>`;
  try {
    const minima = relevanciaMinima();
    const filas = (await mencionesDeEpisodio(details.dataset.episodio, datos.porRef))
      .filter(({ ref, mencion }) => visibles.has(ref.id) && (RELEVANCIA[mencion.relevancia] || 0) >= minima);
    if (details.isConnected) ol.innerHTML = filas.map(filaHTML).join("");
  } catch (err) {
    delete details.dataset.cargado;
    if (details.isConnected) ol.innerHTML = `<li class="cargando">No se han podido cargar: ${esc(err.message)}.</li>`;
  }
}

// «toggle» no sube por el DOM: se escucha en fase de captura.
document.addEventListener("toggle", (e) => {
  const details = e.target;
  if (!(details instanceof HTMLDetailsElement) || !details.dataset.episodio) return;
  const id = details.dataset.episodio;
  if (details.open) { estado.episodiosAbiertos.add(id); rellenar(details); }
  else estado.episodiosAbiertos.delete(id);
}, true);

export function pintarEpisodios(lista, { contenedor }) {
  visibles = new Set(lista.map((r) => r.id));
  const resumenes = resumir(lista)
    .filter((x) => !estado.episodio || x.ep.id === estado.episodio)
    .sort(COMPARADORES[ordenActual()] || COMPARADORES.titulo);
  const solo = resumenes.length === 1;
  contenedor.innerHTML = resumenes.map((x) => episodioHTML(x, solo || estado.episodiosAbiertos.has(x.ep.id))).join("");
  for (const d of contenedor.querySelectorAll("details[open]")) rellenar(d);
}
