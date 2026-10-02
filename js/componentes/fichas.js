// Pide las fichas de las entradas desplegadas del índice que aún no las tienen.
import { completarReferencia } from "../datos.js";
import { buscarReferencia } from "../filtros.js";
import { errorFicha, fichaHTML } from "../plantillas/referencia.js";

export function rellenarPendientes(raiz) {
  for (const detalle of raiz.querySelectorAll(".detail[data-pendiente]")) {
    delete detalle.dataset.pendiente;
    const li = detalle.closest("[data-id]");
    const r = buscarReferencia(li?.dataset.id);
    if (!r) continue;
    completarReferencia(r)
      .then(() => { if (detalle.isConnected && li.classList.contains("open")) detalle.innerHTML = fichaHTML(r); })
      .catch((err) => { if (detalle.isConnected) detalle.innerHTML = errorFicha(err); });
  }
}
