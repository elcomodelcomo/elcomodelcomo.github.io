// Vista «Mapa»: países mencionados sobre un mapa del mundo y lista con banderas.
import { datos, mencionesVisibles } from "../filtros.js";
import { descargarMapa } from "../datos.js";
import { imgHTML } from "../imagenes.js";
import { textoMenciones } from "../plantillas/referencia.js";
import { conImagenes } from "./mosaico.js";
import { compararES, esc } from "../utils.js";

/** Intensidad del verde: raíz cuadrada para que los países poco citados se sigan viendo. */
const intensidad = (n, max) => (0.3 + 0.7 * Math.sqrt(n / max)).toFixed(2);

function mapaSVG(mapa, paises, max) {
  const porIso = new Map(paises.filter((p) => p.r.extra?.iso).map((p) => [p.r.extra.iso, p]));
  const atributos = (p) =>
    `class="con" fill-opacity="${intensidad(p.n, max)}" data-abrir="${esc(p.r.id)}" tabindex="0" role="button"
     aria-label="${esc(`${p.r.nombre}, ${textoMenciones(p.n)}`)}"><title>${esc(`${p.r.nombre}: ${textoMenciones(p.n)}`)}</title`;

  const trazados = Object.entries(mapa.trazados).map(([iso, d]) => {
    const p = porIso.get(iso);
    return p ? `<path d="${d}" ${atributos(p)}></path>` : `<path class="pais" d="${d}"></path>`;
  }).join("");
  // Los países pequeños (Andorra, Vaticano…) solo se dibujan si se mencionan.
  const puntos = Object.entries(mapa.puntos).map(([iso, [x, y]]) => {
    const p = porIso.get(iso);
    return p ? `<circle cx="${x}" cy="${y}" r="4" ${atributos(p)}></circle>` : "";
  }).join("");

  return `<svg viewBox="0 0 ${mapa.ancho} ${mapa.alto}" role="group" aria-label="Mapa de países mencionados">
    <path class="fondo" d="${mapa.fondo}"></path>${trazados}${puntos}</svg>`;
}

function listaHTML(paises, max) {
  return `<ul class="paises">${paises.map(({ r, n }) => {
    const img = imgHTML(r);
    return `<li><button data-abrir="${esc(r.id)}">
      ${img ? `<span>${img}</span>` : '<span class="sin-bandera"></span>'}
      <span class="n">${esc(r.nombre)}</span>
      <span class="veces">${n}</span>
      <span class="barra" aria-hidden="true"><i style="width:${(100 * n / max).toFixed(1)}%"></i></span>
    </button></li>`;
  }).join("")}</ul>`;
}

export function pintarMapa(lista, { contenedor, repintar }) {
  // Las banderas salen del código ISO: las imágenes solo hacen falta para países que ya no existen,
  // así que no se espera por ellas.
  conImagenes(contenedor, repintar, false);
  const paises = lista
    .filter((r) => r.tipo === "pais")
    .map((r) => ({ r, n: mencionesVisibles(r).length }))
    .sort((a, b) => b.n - a.n || compararES(a.r.nombre, b.r.nombre));

  if (!paises.length) {
    contenedor.innerHTML = `<p class="empty">Ningún país coincide con estos filtros.</p>`;
    return;
  }
  const max = paises[0].n;

  if (!datos.mapa) {
    contenedor.innerHTML = `<p class="status">Cargando el mapa…</p>` + listaHTML(paises, max);
    descargarMapa()
      .then((m) => { datos.mapa = m; repintar(); })
      .catch((err) => { contenedor.querySelector(".status").textContent = `No se ha podido cargar el mapa: ${err.message}.`; });
    return;
  }

  const fuera = paises.filter(({ r }) => {
    const iso = r.extra?.iso;
    return !iso || !(iso in datos.mapa.trazados || iso in datos.mapa.puntos);
  });
  contenedor.innerHTML = `
    <div class="mapa">${mapaSVG(datos.mapa, paises, max)}</div>
    <p class="escala"><span>Menos menciones</span>
      <i style="opacity:.3"></i><i style="opacity:.55"></i><i style="opacity:.8"></i><i></i>
      <span>Más</span></p>
    ${fuera.length ? `<p class="sin-mapa">No aparecen en el mapa: ${fuera.map(({ r }) => esc(r.nombre)).join(", ")}.</p>` : ""}
    ${listaHTML(paises, max)}`;
}
