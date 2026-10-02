// Carga de datos. Aquí no se toca el DOM.
//
// Al entrar solo se descarga data/indice.json. Lo demás se pide cuando hace falta y se guarda en memoria:
// la ficha de una referencia al abrirla, las menciones de un episodio al desplegarlo y las imágenes
// al abrir el mosaico o el mapa. Si no existe indice.json (en local, sin pasar por herramientas/construir.mjs)
// o se carga un JSON desde el pie, se parte en el navegador con el mismo código y todo queda ya en memoria.
import { RUTA_COMPLETO, RUTA_DATOS, RUTA_MAPA } from "./config.js";
import { leerMencion, partir, RELEVANCIAS } from "./formato.js";
import { compararAZ, empiezaPorLetra, normalizar, separarTitulo, sinSignosIniciales } from "./utils.js";

// De dónde salen los datos ahora mismo.
const fuente = {
  version: "",           // cambia con cada publicación; va en las URLs para no mezclar datos viejos y nuevos
  prefijo: 2,            // caracteres del id que dan nombre al fichero de fichas
  fichas: new Map(),     // prefijo → Promise<{ id: ficha }>
  episodios: new Map(),  // video_id → Promise<[mención]>
  imagenes: null,        // Promise<{ id: url }>
  lista: null,           // lista completa (solo si se ha partido en el navegador)
};

async function pedirJSON(ruta) {
  const res = await fetch(ruta);
  if (!res.ok) throw new Error(`no se encuentra ${ruta.split("?")[0]} (HTTP ${res.status})`);
  return res.json();
}

/** Guarda la petición; si falla, la olvida para poder reintentar. */
function recordar(mapa, clave, pedir) {
  if (!mapa.has(clave)) mapa.set(clave, pedir().catch((err) => { mapa.delete(clave); throw err; }));
  return mapa.get(clave);
}

const conVersion = (ruta) => (fuente.version ? `${ruta}?v=${fuente.version}` : ruta);

function letraInicial(nombre) {
  return empiezaPorLetra(nombre) ? normalizar(nombre).charAt(0).toUpperCase() : "#";
}

/** Índice → estructuras que usa la interfaz. Las referencias quedan «ligeras» hasta que se abre su ficha. */
function prepararIndice(indice) {
  const episodios = indice.episodios.map(({ id, t }) => {
    const [corto, sub] = separarTitulo(t);
    return { id, titulo: t, corto, sub };
  });
  const porId = Object.fromEntries(episodios.map((e) => [e.id, e]));
  episodios.sort((a, b) => compararAZ(sinSignosIniciales(a.corto), sinSignosIniciales(b.corto)));

  let menciones = 0;
  const referencias = indice.refs.map((r) => {
    const ms = (r.m || []).map(([e, rel, descripcion]) => ({
      video_id: indice.episodios[e]?.id, relevancia: RELEVANCIAS[rel] || "", origen: descripcion ? "descripcion" : "audio",
    }));
    menciones += ms.length;
    return {
      id: r.id, tipo: r.t, nombre: r.n, autor: r.a || null, descripcion: r.d || null,
      imagen: null, extra: r.iso ? { iso: r.iso } : {}, revisar: !!r.rv, menciones: ms,
      _letra: letraInicial(r.n),
      _texto: normalizar([r.n, r.a, r.d, r.to].join(" ")),
      _completa: false,
    };
  });

  const cifras = { episodios: episodios.length, menciones, identificadas: indice.identificadas || 0, referencias: referencias.length };
  return { referencias, episodios, porId, porRef: new Map(referencias.map((r) => [r.id, r])), cifras };
}

function reiniciarFuente(indice) {
  Object.assign(fuente, { version: indice.v || "", prefijo: indice.prefijo || 2, imagenes: null, lista: null });
  fuente.fichas.clear();
  fuente.episodios.clear();
}

/** Parte la lista en el navegador: todo queda en memoria y no se pide nada más. */
function usarPartidos(lista) {
  const { indice, fichas, episodios, imagenes } = partir(lista);
  reiniciarFuente(indice);
  fuente.lista = lista;
  for (const [p, grupo] of Object.entries(fichas)) fuente.fichas.set(p, Promise.resolve(grupo));
  for (const [id, ms] of Object.entries(episodios)) fuente.episodios.set(id, Promise.resolve(ms));
  fuente.imagenes = Promise.resolve(imagenes);
  return prepararIndice(indice);
}

/** Lo que se carga al entrar en la web. */
export async function cargarDatos() {
  let indice;
  try {
    indice = await pedirJSON(RUTA_DATOS);
  } catch (errIndice) {
    // Sin índice publicado se usa el JSON completo: pesa unas cuatro veces más, pero funciona igual.
    try { return usarPartidos(await pedirJSON(RUTA_COMPLETO)); }
    catch { throw errIndice; }
  }
  reiniciarFuente(indice);
  return prepararIndice(indice);
}

/** Lista elegida con el selector de archivos del pie. */
export const usarLista = (lista) => usarPartidos(lista);

/** Completa una referencia con su ficha (enlaces, fechas, menciones con minuto y contexto). */
export async function completarReferencia(r) {
  if (r._completa) return r;
  const prefijo = r.id.slice(0, fuente.prefijo);
  const grupo = await recordar(fuente.fichas, prefijo, () => pedirJSON(conVersion(`data/fichas/${prefijo}.json`)));
  const f = grupo[r.id];
  if (!f) throw new Error("esta ficha no está en los datos publicados; si se acaban de actualizar, recarga la página");
  Object.assign(r, {
    imagen: f.img || r.imagen, anio: f.anio ?? null, fuente: f.fuente || null, url_externa: f.url || null,
    wikidata: f.wd || null, extra: { ...r.extra, ...f.x },
    menciones: (f.m || []).map(leerMencion),
    _completa: true,
  });
  return r;
}

/** Menciones de un episodio en el orden en que se dicen: [{ ref, mencion }]. */
export async function mencionesDeEpisodio(id, porRef) {
  const filas = await recordar(fuente.episodios, id, () => pedirJSON(conVersion(`data/episodios/${id}.json`)));
  const salida = [];
  for (const [refId, ...resto] of filas) {
    const ref = porRef.get(refId);
    if (ref) salida.push({ ref, mencion: leerMencion([id, ...resto]) });
  }
  return salida;
}

/** Pone su imagen a cada referencia (mosaico y mapa). */
export async function cargarImagenes(referencias) {
  fuente.imagenes ||= pedirJSON(conVersion("data/imagenes.json")).catch((err) => { fuente.imagenes = null; throw err; });
  const imagenes = await fuente.imagenes;
  for (const r of referencias) r.imagen ||= imagenes[r.id] || null;
}

/** La lista completa del cuaderno, para el CSV. */
export const listaCompleta = async () => fuente.lista || pedirJSON(RUTA_COMPLETO);

let mapaPendiente = null;
/** Descarga el mapa del mundo una sola vez (solo cuando se abre la vista «Mapa»). */
export function descargarMapa() {
  mapaPendiente ||= pedirJSON(RUTA_MAPA).catch((err) => { mapaPendiente = null; throw err; });
  return mapaPendiente;
}

/** Lee un JSON elegido por el usuario con el selector de archivos. */
export function leerArchivo(archivo) {
  return new Promise((ok, ko) => {
    const lector = new FileReader();
    lector.onload = () => {
      try { ok(JSON.parse(lector.result)); }
      catch { ko(new Error(`${archivo.name} no es un JSON válido`)); }
    };
    lector.onerror = () => ko(new Error(`no se ha podido leer ${archivo.name}`));
    lector.readAsText(archivo);
  });
}
