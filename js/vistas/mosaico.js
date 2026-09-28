// Vista «Mosaico»: portadas de libros y películas, banderas, fotos y logos.
import { etiquetaTipo } from "../config.js";
import { mencionesVisibles } from "../filtros.js";
import { encajeDe, imgHTML } from "../imagenes.js";
import { textoMenciones } from "../plantillas/referencia.js";
import { esc } from "../utils.js";
import { ordenar } from "./orden.js";

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

export function pintarMosaico(lista, { contenedor, barraLetras }) {
  barraLetras.innerHTML = "";
  contenedor.innerHTML = `<ul class="mosaico">${ordenar(lista).map(teselaHTML).join("")}</ul>`;
}
