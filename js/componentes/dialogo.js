// Ventana con la ficha de una referencia (desde el mosaico y el mapa).
import { etiquetaTipo } from "../config.js";
import { completarReferencia } from "../datos.js";
import { mencionesVisibles } from "../filtros.js";
import { CARGANDO_FICHA, errorFicha, fichaHTML, textoMenciones } from "../plantillas/referencia.js";
import { esc } from "../utils.js";

const dialogo = document.querySelector("#ficha");
const titulo = dialogo.querySelector("h2");
const subtitulo = dialogo.querySelector(".ficha-cab p");
const cuerpo = dialogo.querySelector(".ficha-cuerpo");

export async function abrirFicha(r) {
  titulo.textContent = r.nombre;
  subtitulo.innerHTML = `${esc(etiquetaTipo(r.tipo))}, ${textoMenciones(mencionesVisibles(r).length)}${r.revisar ? '<span class="flag">por revisar</span>' : ""}`;
  dialogo.dataset.id = r.id;
  cuerpo.innerHTML = r._completa ? `<div class="detail">${fichaHTML(r)}</div>` : CARGANDO_FICHA;
  dialogo.showModal();
  dialogo.scrollTop = 0;
  if (r._completa) return;
  try {
    await completarReferencia(r);
    if (dialogo.open && dialogo.dataset.id === r.id) cuerpo.innerHTML = `<div class="detail">${fichaHTML(r)}</div>`;
  } catch (err) {
    if (dialogo.open && dialogo.dataset.id === r.id) cuerpo.innerHTML = errorFicha(err);
  }
}

// Cerrar con el botón o pulsando fuera de la ventana.
dialogo.addEventListener("click", (e) => {
  if (e.target === dialogo || e.target.closest("[data-cerrar]")) dialogo.close();
});
