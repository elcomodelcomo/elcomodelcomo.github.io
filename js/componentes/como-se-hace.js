// Ventana «Cómo se hace este índice»: los cuatro pasos de la extracción,
// con las cifras sacadas de los datos que hay cargados en ese momento.
import { datos } from "../filtros.js";

const dialogo = document.querySelector("#como-se-hace");
const cifra = (clave) => dialogo.querySelector(`[data-cifra="${clave}"]`);
const num = (n) => n.toLocaleString("es-ES");

function rellenarCifras() {
  for (const [clave, n] of Object.entries(datos.cifras)) {
    const el = cifra(clave);
    if (el) el.textContent = num(n);
  }
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
