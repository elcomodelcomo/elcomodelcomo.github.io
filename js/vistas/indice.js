// Vista «Índice A–Z»: agrupa por letra inicial o lista por número de menciones.
// Se pinta por tandas; al saltar a una letra se pinta de golpe hasta ella.
import { ordenActual } from "../filtros.js";
import { entradaHTML } from "../plantillas/referencia.js";
import { activarLetras, ancla } from "../componentes/letras.js";
import { rellenarPendientes } from "../componentes/fichas.js";
import { ordenar } from "./orden.js";
import { pintarPorTandas } from "./tandas.js";

// Números, «@perfiles» y símbolos van al final, en «#».
const LETRAS = [...("ABCDEFGHIJKLMNOPQRSTUVWXYZ"), "#"];

export function pintarIndice(lista, { contenedor, barraLetras }) {
  ordenar(lista);

  if (ordenActual() !== "az") {
    contenedor.innerHTML = `<ul class="entries"></ul>`;
    const ul = contenedor.firstElementChild;
    pintarPorTandas(contenedor, lista.length, (desde, hasta) => {
      ul.insertAdjacentHTML("beforeend", lista.slice(desde, hasta).map(entradaHTML).join(""));
      rellenarPendientes(ul);
    });
    return;
  }

  const grupos = {};
  for (const r of lista) (grupos[r._letra] ||= []).push(r);
  const presentes = LETRAS.filter((l) => grupos[l]);

  barraLetras.innerHTML = LETRAS.map((l) =>
    grupos[l] ? `<a href="#${ancla(l)}" data-letra="${l}">${l}</a>` : l === "#" ? "" : `<span aria-hidden="true">${l}</span>`
  ).join("");

  // Las secciones están desde el principio, vacías y ocultas, y se van llenando en orden.
  contenedor.innerHTML = presentes.map((l) => `
    <section class="letter" id="${ancla(l)}" data-letra="${l}" hidden>
      <h2>${l}</h2>
      <ul class="entries"></ul>
    </section>`).join("");
  const secciones = Object.fromEntries([...contenedor.querySelectorAll("section.letter")].map((s) => [s.dataset.letra, s]));

  const ordenadas = presentes.flatMap((l) => grupos[l]);
  const fin = {};
  let n = 0;
  for (const l of presentes) fin[l] = n += grupos[l].length;

  const pintarHasta = pintarPorTandas(contenedor, ordenadas.length, (desde, hasta) => {
    const porLetra = {};
    for (const r of ordenadas.slice(desde, hasta)) (porLetra[r._letra] ||= []).push(entradaHTML(r));
    for (const [l, filas] of Object.entries(porLetra)) {
      const s = secciones[l];
      s.hidden = false;
      s.lastElementChild.insertAdjacentHTML("beforeend", filas.join(""));
      rellenarPendientes(s);
    }
  });

  activarLetras({ contenedor, asegurar: (l) => pintarHasta(fin[l] || 0) });
}
