// Pintar listas largas poco a poco: una tanda al entrar y otra cada vez que el final
// se acerca a la pantalla. Así el navegador no maqueta miles de filas de golpe.
import { TANDA } from "../config.js";

let observador = null;

/** Deja de vigilar la lista anterior (al cambiar de vista o de filtros). */
export function detenerTandas() {
  observador?.disconnect();
  observador = null;
}

/**
 * anadir(desde, hasta) mete en el DOM los elementos [desde, hasta) de la lista.
 * Devuelve pintarHasta(n), que asegura que ya están pintados los n primeros (para saltar a una letra).
 */
export function pintarPorTandas(contenedor, total, anadir, tanda = TANDA) {
  detenerTandas();
  let pintados = 0;
  const centinela = document.createElement("div");
  centinela.className = "centinela";
  contenedor.append(centinela);

  const yo = new IntersectionObserver((entradas) => {
    if (entradas.some((e) => e.isIntersecting)) pintarHasta(pintados + tanda);
  }, { rootMargin: "0px 0px 1500px 0px" });

  function pintarHasta(n) {
    n = Math.min(n, total);
    if (n > pintados) {
      anadir(pintados, n);
      pintados = n;
    }
    if (pintados >= total) {
      yo.disconnect();
      if (observador === yo) observador = null;
      centinela.remove();
    } else if (observador === yo) {
      // Si tras la tanda el final sigue a la vista (pantalla alta, scroll rápido),
      // volver a observar provoca otro aviso y se pinta la siguiente.
      yo.unobserve(centinela);
      yo.observe(centinela);
    }
  }

  observador = yo;
  pintarHasta(tanda);
  if (observador === yo) yo.observe(centinela);
  return pintarHasta;
}
