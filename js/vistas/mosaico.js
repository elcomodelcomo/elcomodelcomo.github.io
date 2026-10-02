// Vista «Mosaico»: portadas de libros y películas, banderas, fotos y logos.
// Las imágenes van en data/imagenes.json, que solo se pide la primera vez que se abre el mosaico.
import { etiquetaTipo } from "../config.js";
import { cargarImagenes } from "../datos.js";
import { datos, estado, mencionesVisibles } from "../filtros.js";
import { encajeDe, imgHTML } from "../imagenes.js";
import { textoMenciones } from "../plantillas/referencia.js";
import { esc } from "../utils.js";
import { ordenar } from "./orden.js";
import { pintarPorTandas } from "./tandas.js";

let imagenesListas = false;
let pidiendo = null;

function teselaHTML(r) {
  const ms = mencionesVisibles(r);
  const central = ms.some((m) => m.relevancia === "central");
  const img = imgHTML(r);
  return `<li${central ? ' class="central"' : ""}>
    <button class="tile" data-abrir="${esc(r.id)}" data-encaje="${encajeDe(r)}" aria-label="${esc(`${r.nombre}, ${etiquetaTipo(r.tipo)}`)}">
      <span class="img${img ? "" : " sin-imagen"}" data-texto="${esc(r.nombre)}">${img}</span>
      <span class="nombre">${esc(r.nombre)}</span>
      <span class="veces">${esc(etiquetaTipo(r.tipo))}, ${textoMenciones(ms.length)}</span>
    </button>
  </li>`;
}

/**
 * Las vistas con imágenes las piden la primera vez. Con esperar = true (mosaico) se muestra un aviso
 * mientras llegan; con false (mapa) se pinta ya y se repinta al llegar. Devuelve true si se puede pintar.
 */
export function conImagenes(contenedor, repintar, esperar = true) {
  if (imagenesListas) return true;
  pidiendo ||= cargarImagenes(datos.referencias)
    .then(() => { imagenesListas = true; if (estado.vista === "mosaico" || estado.vista === "mapa") repintar(); })
    .catch((err) => { if (estado.vista === "mosaico") contenedor.innerHTML = `<p class="status">No se han podido cargar las imágenes: ${esc(err.message)}.</p>`; })
    .finally(() => { pidiendo = null; });
  if (esperar) contenedor.innerHTML = `<p class="status">Cargando imágenes…</p>`;
  return !esperar;
}

/** Al cargar otros datos hay que volver a pedir las imágenes. */
export const olvidarImagenes = () => { imagenesListas = false; };

export function pintarMosaico(lista, { contenedor, repintar }) {
  if (!conImagenes(contenedor, repintar)) return;
  ordenar(lista);
  contenedor.innerHTML = `<ul class="mosaico"></ul>`;
  const ul = contenedor.firstElementChild;
  pintarPorTandas(contenedor, lista.length, (desde, hasta) => {
    ul.insertAdjacentHTML("beforeend", lista.slice(desde, hasta).map(teselaHTML).join(""));
  }, 120);
}
