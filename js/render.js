// Pinta la página a partir del estado: cabecera, controles y la vista activa.
import { nombreTipo, ORDENES } from "./config.js";
import { datos, estado, ordenActual, referenciasFiltradas } from "./filtros.js";
import { pintarIndice } from "./vistas/indice.js";
import { pintarMosaico } from "./vistas/mosaico.js";
import { pintarEpisodios } from "./vistas/episodios.js";
import { pintarMapa } from "./vistas/mapa.js";
import { detenerTandas } from "./vistas/tandas.js";
import { activarLetras } from "./componentes/letras.js";
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
  leyenda: $("#legend"),
  letras: $("#letters"),
  salida: $("#out"),
  archivo: $("#file"),
};

const VISTAS = { indice: pintarIndice, mosaico: pintarMosaico, episodios: pintarEpisodios, mapa: pintarMapa };

/** Se llama una vez por cada juego de datos cargado. */
export function pintarCabecera() {
  const { referencias, episodios } = datos;
  dom.intro.innerHTML = `<strong>${referencias.length.toLocaleString("es-ES")} referencias</strong> (personas, libros, películas, países, empresas…) de los <strong>${episodios.length} últimos episodios</strong> del podcast de antiayuda. Cada minuto enlaza al momento exacto del vídeo.`;
  dom.episodio.innerHTML = `<option value="">Todos los episodios</option>` +
    episodios.map((e) => `<option value="${esc(e.id)}">${esc(e.corto)}</option>`).join("");
  dom.episodio.value = estado.episodio;
}

export function pintarError(mensaje) {
  dom.intro.textContent = mensaje;
  activarLetras(null);
  dom.salida.innerHTML = "";
}

function pintarTipos() {
  // En el mapa solo hay países: los chips de tipo no aplican.
  dom.tipos.hidden = estado.vista === "mapa";
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
  const opciones = ORDENES[estado.vista] || [];
  dom.orden.hidden = !opciones.length;
  dom.orden.innerHTML = opciones.map(([v, texto]) => `<option value="${v}">${esc(texto)}</option>`).join("");
  dom.orden.value = ordenActual();
}

function textoEstado(lista) {
  const enEpisodio = estado.episodio ? ` en «${datos.porId[estado.episodio].corto}»` : "";
  if (estado.vista === "mapa") return plural(lista.filter((r) => r.tipo === "pais").length, "lugar", "lugares") + enEpisodio;
  return plural(lista.length, "referencia", "referencias") + enEpisodio;
}

/** Vuelve a pintar todo lo que depende de los filtros. */
export function pintar() {
  pintarTipos();
  pintarControles();

  // En el mapa se ignoran los chips de tipo: siempre son países.
  const lista = estado.vista === "mapa" ? referenciasFiltradas({ ignorarTipo: true }) : referenciasFiltradas();

  // Cada vista empieza de cero: sin tandas pendientes ni barra de letras (el índice A–Z la vuelve a poner).
  detenerTandas();
  activarLetras(null);

  if (!lista.length) {
    dom.estado.textContent = "";
    dom.salida.innerHTML = `<div class="empty">Nada coincide con «${esc(estado.busqueda || "estos filtros")}».<br>
      <button class="btn" data-accion="reiniciar">Quitar filtros</button></div>`;
    return;
  }

  dom.estado.textContent = textoEstado(lista);
  dom.leyenda.hidden = estado.vista === "mosaico" || estado.vista === "mapa";
  VISTAS[estado.vista](lista, { contenedor: dom.salida, barraLetras: dom.letras, repintar: pintar });
  dom.letras.hidden = !dom.letras.childElementCount;
}
