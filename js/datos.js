// Carga del JSON y preparación de las estructuras que usa la interfaz.
// Aquí no se toca el DOM: solo datos.
import { RUTA_DATOS } from "./config.js";
import { normalizar, segundos, separarTitulo, compararES } from "./utils.js";

/** Descarga el JSON publicado junto a la web. */
export async function descargarDatos(ruta = RUTA_DATOS) {
  const res = await fetch(ruta, { cache: "no-cache" });
  if (!res.ok) throw new Error(`no se encuentra ${ruta} (HTTP ${res.status})`);
  return res.json();
}

/** Lee un JSON elegido por el usuario con el selector de archivos. */
export function leerArchivo(archivo) {
  return new Promise((ok, ko) => {
    const lector = new FileReader();
    lector.onload = () => {
      try { ok(JSON.parse(lector.result)); }
      catch (e) { ko(new Error(`${archivo.name} no es un JSON válido`)); }
    };
    lector.onerror = () => ko(new Error(`no se ha podido leer ${archivo.name}`));
    lector.readAsText(archivo);
  });
}

function letraInicial(nombre) {
  const c = normalizar(nombre).charAt(0);
  return /[a-z]/.test(c) ? c.toUpperCase() : "#";
}

/**
 * Convierte la lista cruda del cuaderno en:
 *  - referencias: cada referencia con menciones ordenadas y campos de búsqueda
 *  - episodios: lista de episodios con sus menciones en orden cronológico
 *  - porId: episodios indexados por video_id
 */
export function prepararDatos(lista) {
  if (!Array.isArray(lista)) throw new Error("el JSON debe ser una lista de referencias");

  const referencias = lista.map((r) => {
    const menciones = [...(r.menciones || [])].sort((a, b) => segundos(a.minuto) - segundos(b.minuto));
    return {
      ...r,
      menciones,
      _letra: letraInicial(r.nombre),
      _texto: normalizar([r.nombre, r.autor, r.descripcion, r.extra?.titulo_original].join(" ")),
      _episodios: new Set(menciones.map((m) => m.video_id)),
    };
  });

  const porId = {};
  for (const r of referencias) {
    for (const m of r.menciones) {
      const ep = (porId[m.video_id] ||= { id: m.video_id, titulo: m.episodio, menciones: [] });
      ep.menciones.push({ ref: r, mencion: m });
    }
  }
  const episodios = Object.values(porId);
  for (const ep of episodios) {
    ep.menciones.sort((a, b) => segundos(a.mencion.minuto) - segundos(b.mencion.minuto));
    [ep.corto, ep.sub] = separarTitulo(ep.titulo);
  }
  episodios.sort((a, b) => compararES(a.corto, b.corto));

  return { referencias, episodios, porId };
}
