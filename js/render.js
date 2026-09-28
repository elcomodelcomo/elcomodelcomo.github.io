// Pinta la página a partir del estado: cabecera, controles y la vista activa.
import { nombreTipo } from "./config.js";
import { datos, estado, referenciasFiltradas } from "./filtros.js";
import { pintarIndice } from "./vistas/indice.js";
import { pintarEpisodios } from "./vistas/episodios.js";
import { esc, plural } from "./utils.js";

const $ = (s) => document.querySelector(s);

export const dom = {
  intro: $("#intro"),
  busqueda: $("#q"),
  episodio: $("#ep"),
  tipos: $("#types"),
  orden: $("#sort"),
  relevancia: $("#rel"),
  estado: $("#status"),
  letras: $("#letters"),
  salida: $("#out"),
  archivo: $("#file"),
};

/** Se llama una vez por cada juego de datos cargado. */
export function pintarCabecera() {
  const { referencias, episodios } = datos;
  dom.intro.innerHTML = `Un índice de las <strong>${referencias.length} referencias</strong> (personas, libros, películas, países, empresas…) que aparecen en los <strong>${episodios.length} últimos episodios</strong> del podcast de antiayuda. Cada minuto enlaza al momento exacto del vídeo.`;
  dom.episodio.innerHTML = `<option value="">Todos los episodios</option>` +
    episodios.map((e) => `<option value="${esc(e.id)}">${esc(e.corto)}</option>`).join("");
  dom.episodio.value = estado.episodio;
}

export function pintarError(mensaje) {
  dom.intro.textContent = mensaje;
  dom.letras.innerHTML = "";
  dom.salida.innerHTML = "";
}

function pintarTipos() {
  const base = referenciasFiltradas({ ignorarTipo: true });
  const cuenta = {}, total = {};
  for (const r of base) cuenta[r.tipo] = (cuenta[r.tipo] || 0) + 1;
  for (const r of datos.referencias) total[r.tipo] = (total[r.tipo] || 0) + 1;
  const tipos = Object.keys(total).sort((a, b) => total[b] - total[a]);

  dom.tipos.innerHTML =
    `<button class="chip" data-tipo="" aria-pressed="${!estado.tipos.size}">Todo<span>${base.length}</span></button>` +
    tipos.map((t) => `<button class="chip" data-tipo="${esc(t)}" aria-pressed="${estado.tipos.has(t)}">${esc(nombreTipo(t))}<span>${cuenta[t] || 0}</span></button>`).join("");
}

function pintarControles() {
  document.querySelectorAll("[data-view]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.view === estado.vista));
  dom.orden.hidden = estado.vista !== "indice";
}

/** Vuelve a pintar todo lo que depende de los filtros. */
export function pintar() {
  pintarTipos();
  pintarControles();

  const lista = referenciasFiltradas();
  const enEpisodio = estado.episodio ? ` en «${datos.porId[estado.episodio].corto}»` : "";

  if (!lista.length) {
    dom.estado.textContent = "";
    dom.letras.innerHTML = "";
    dom.salida.innerHTML = `<div class="empty">Nada coincide con «${esc(estado.busqueda || "estos filtros")}»${esc(enEpisodio)}.<br>
      <button class="btn" data-accion="reiniciar">Quitar filtros</button></div>`;
    return;
  }

  dom.estado.textContent = plural(lista.length, "referencia", "referencias") + enEpisodio;
  const destino = { contenedor: dom.salida, barraLetras: dom.letras };
  (estado.vista === "indice" ? pintarIndice : pintarEpisodios)(lista, destino);
}
