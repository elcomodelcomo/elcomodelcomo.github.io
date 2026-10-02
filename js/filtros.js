// Estado de la interfaz y lógica de filtrado. Sin acceso al DOM.
import { ORDENES, RELEVANCIA } from "./config.js";
import { normalizar } from "./utils.js";

/** Datos cargados (se rellenan desde main.js). */
export const datos = { referencias: [], episodios: [], porId: {}, porRef: new Map(), cifras: {}, mapa: null };

/** Lo que el usuario tiene seleccionado en cada momento. */
export const estado = {
  busqueda: "",
  episodio: "",          // video_id o "" para todos
  tipos: new Set(),      // vacío = todos
  vista: "indice",       // "indice" | "mosaico" | "episodios" | "mapa"
  relevancia: "",        // "" | "central" | "secundaria"
  abiertas: new Set(),   // ids de referencias desplegadas en el índice
  episodiosAbiertos: new Set(), // episodios con las menciones desplegadas
  // Orden elegido en cada vista; empieza con la primera opción de ORDENES.
  ordenes: Object.fromEntries(Object.entries(ORDENES).map(([v, ops]) => [v, ops[0]?.[0] || ""])),
};

export const ordenActual = () => estado.ordenes[estado.vista];

export function reiniciarFiltros() {
  Object.assign(estado, { busqueda: "", episodio: "", relevancia: "" });
  estado.tipos.clear();
}

/** Deja la página como al entrar: sin filtros, en el índice y con los órdenes de partida. */
export function volverAlEstadoInicial() {
  reiniciarFiltros();
  estado.vista = "indice";
  estado.abiertas.clear();
  estado.episodiosAbiertos.clear();
  for (const [v, ops] of Object.entries(ORDENES)) estado.ordenes[v] = ops[0]?.[0] || "";
}

/** Relevancia mínima (numérica) según el filtro elegido. */
export const relevanciaMinima = () => RELEVANCIA[estado.relevancia] || 0;

/** Menciones de una referencia que cumplen el filtro de episodio y de relevancia. */
export function mencionesVisibles(r) {
  const minima = relevanciaMinima();
  return r.menciones.filter((m) =>
    (!estado.episodio || m.video_id === estado.episodio) && (RELEVANCIA[m.relevancia] || 0) >= minima
  );
}

/**
 * Referencias que cumplen los filtros actuales.
 * Con ignorarTipo = true se omite el filtro de tipo (sirve para contar los chips).
 */
export function referenciasFiltradas({ ignorarTipo = false } = {}) {
  const q = normalizar(estado.busqueda.trim());
  return datos.referencias.filter((r) => {
    if (q && !r._texto.includes(q)) return false;
    if (!ignorarTipo && estado.tipos.size && !estado.tipos.has(r.tipo)) return false;
    return mencionesVisibles(r).length > 0;
  });
}

export const buscarReferencia = (id) => datos.porRef.get(id);
