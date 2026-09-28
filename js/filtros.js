// Estado de la interfaz y lógica de filtrado. Sin acceso al DOM.
import { RELEVANCIA } from "./config.js";
import { normalizar } from "./utils.js";

/** Datos cargados (se rellenan desde main.js). */
export const datos = { referencias: [], episodios: [], porId: {} };

/** Lo que el usuario tiene seleccionado en cada momento. */
export const estado = {
  busqueda: "",
  episodio: "",          // video_id o "" para todos
  tipos: new Set(),      // vacío = todos
  vista: "indice",       // "indice" | "episodios"
  orden: "az",           // "az" | "menciones"
  relevancia: "",        // "" | "central" | "secundaria"
  abiertas: new Set(),   // ids de referencias desplegadas
};

export function reiniciarFiltros() {
  Object.assign(estado, { busqueda: "", episodio: "", relevancia: "" });
  estado.tipos.clear();
}

/** Relevancia mínima (numérica) según el filtro elegido. */
export const relevanciaMinima = () => RELEVANCIA[estado.relevancia] || 0;

/** Menciones de una referencia teniendo en cuenta el episodio elegido. */
export const mencionesVisibles = (r) =>
  estado.episodio ? r.menciones.filter((m) => m.video_id === estado.episodio) : r.menciones;

/**
 * Referencias que cumplen los filtros actuales.
 * Con ignorarTipo = true se omite el filtro de tipo (sirve para contar los chips).
 */
export function referenciasFiltradas({ ignorarTipo = false } = {}) {
  const q = normalizar(estado.busqueda.trim());
  const minima = relevanciaMinima();
  return datos.referencias.filter((r) => {
    if (q && !r._texto.includes(q)) return false;
    if (estado.episodio && !r._episodios.has(estado.episodio)) return false;
    if (!ignorarTipo && estado.tipos.size && !estado.tipos.has(r.tipo)) return false;
    if (minima && !mencionesVisibles(r).some((m) => (RELEVANCIA[m.relevancia] || 0) >= minima)) return false;
    return true;
  });
}
