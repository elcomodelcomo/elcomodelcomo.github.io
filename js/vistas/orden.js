// Orden de referencias compartido por el índice y el mosaico.
import { mencionesVisibles, ordenActual } from "../filtros.js";
import { compararAZ } from "../utils.js";

export function ordenar(lista) {
  if (ordenActual() === "menciones") {
    return lista.sort((a, b) => mencionesVisibles(b).length - mencionesVisibles(a).length || compararAZ(a.nombre, b.nombre));
  }
  return lista.sort((a, b) => compararAZ(a.nombre, b.nombre));
}
