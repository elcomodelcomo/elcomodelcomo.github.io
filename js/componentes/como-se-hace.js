// Ventana «Cómo se hace este índice»: los cuatro pasos de la extracción,
// con las cifras sacadas de los datos que hay cargados en ese momento.
import { datos } from "../filtros.js";

const dialogo = document.querySelector("#como-se-hace");
const cifra = (clave) => dialogo.querySelector(`[data-cifra="${clave}"]`);
const num = (n) => n.toLocaleString("es-ES");

function rellenarCifras() {
  const { referencias, episodios } = datos;
  const menciones = referencias.reduce((n, r) => n + r.menciones.length, 0);
  const identificadas = referencias.filter((r) => r.fuente).length;
  cifra("episodios").textContent = num(episodios.length);
  cifra("menciones").textContent = num(menciones);
  cifra("identificadas").textContent = num(identificadas);
  cifra("referencias").textContent = num(referencias.length);
}

export function abrirComoSeHace() {
  if (datos.referencias.length) rellenarCifras();
  dialogo.showModal();
  dialogo.scrollTop = 0;
}

// Cerrar con el botón o pulsando fuera de la ventana.
dialogo.addEventListener("click", (e) => {
  if (e.target === dialogo || e.target.closest("[data-cerrar]")) dialogo.close();
});
