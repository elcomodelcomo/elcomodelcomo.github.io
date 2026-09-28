// Vista «Índice A–Z»: agrupa por letra inicial o lista por número de menciones.
import { estado, mencionesVisibles } from "../filtros.js";
import { entradaHTML } from "../plantillas/referencia.js";
import { compararES } from "../utils.js";

const LETRAS = ["#", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];
const ancla = (l) => `l-${l === "#" ? "num" : l}`;

export function pintarIndice(lista, { contenedor, barraLetras }) {
  if (estado.orden === "menciones") {
    lista.sort((a, b) => mencionesVisibles(b).length - mencionesVisibles(a).length || compararES(a.nombre, b.nombre));
    barraLetras.innerHTML = "";
    contenedor.innerHTML = `<ul class="entries">${lista.map(entradaHTML).join("")}</ul>`;
    return;
  }

  lista.sort((a, b) => compararES(a.nombre, b.nombre));
  const grupos = {};
  for (const r of lista) (grupos[r._letra] ||= []).push(r);

  barraLetras.innerHTML = LETRAS.map((l) =>
    grupos[l] ? `<a href="#${ancla(l)}">${l}</a>` : l === "#" ? "" : `<span aria-hidden="true">${l}</span>`
  ).join("");

  contenedor.innerHTML = LETRAS.filter((l) => grupos[l]).map((l) => `
    <section class="letter" id="${ancla(l)}">
      <h2>${l}</h2>
      <ul class="entries">${grupos[l].map(entradaHTML).join("")}</ul>
    </section>`).join("");
}
