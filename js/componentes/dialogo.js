// Ventana con la ficha de una referencia (desde el mosaico y el mapa).
import { etiquetaTipo } from "../config.js";
import { mencionesVisibles } from "../filtros.js";
import { fichaHTML, textoMenciones } from "../plantillas/referencia.js";
import { esc } from "../utils.js";

const dialogo = document.querySelector("#ficha");
const titulo = dialogo.querySelector("h2");
const subtitulo = dialogo.querySelector(".ficha-cab p");
const cuerpo = dialogo.querySelector(".ficha-cuerpo");

export function abrirFicha(r) {
  titulo.textContent = r.nombre;
  subtitulo.innerHTML = `${esc(etiquetaTipo(r.tipo))}, ${textoMenciones(mencionesVisibles(r).length)}${r.revisar ? '<span class="flag">por revisar</span>' : ""}`;
  cuerpo.innerHTML = `<div class="detail">${fichaHTML(r)}</div>`;
  dialogo.showModal();
  dialogo.scrollTop = 0;
}

// Cerrar con el botón o pulsando fuera de la ventana.
dialogo.addEventListener("click", (e) => {
  if (e.target === dialogo || e.target.closest("[data-cerrar]")) dialogo.close();
});
