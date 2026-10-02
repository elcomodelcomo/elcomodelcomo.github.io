// De las decisiones de la página de revisión a data/correcciones.json. Sin DOM, para poder probarlo en Node.
import { normalizar } from "../utils.js";

export const INSTRUCCIONES_POR_DEFECTO = [
  "Correcciones a mano que se aplican al publicar, encima de lo que genera el cuaderno.",
  "La página revisar.html de la web ayuda a revisar las referencias «por revisar» y genera este fichero.",
];
const LISTAS = ["descartar", "cambiar", "fusionar"];

/** La ficha que identifica a una referencia (el Q de Wikidata, el id de TMDB...), para «si_ficha». */
export const fichaDe = (r) => r.id_externo || r.wikidata || null;

/**
 * Una decisión → [lista, entrada]. «ambiguo» indica que hay varias referencias publicadas con ese nombre.
 *   bien       la ficha está bien (o se deja sin ficha): solo se quita la marca
 *   quitar     la ficha es de otra cosa: se quita
 *   ficha      se pone la ficha de Wikidata elegida a mano
 *   juntar     es la misma que otra referencia
 *   descartar  no es una referencia de verdad
 */
export function entradaDe(d) {
  if (d.accion === "descartar") return ["descartar", d.ambiguo ? { nombre: d.nombre, tipo: d.tipo } : d.nombre];
  if (d.accion === "juntar") return ["fusionar", { de: d.nombre, en: d.en }];
  const e = { nombre: d.nombre };
  if (d.ficha) e.si_ficha = d.ficha;
  else if (d.ambiguo) e.si_tipo = d.tipo;
  if (d.accion === "quitar" || d.accion === "ficha") e.quitar_ficha = true;
  if (d.accion === "ficha") {
    const n = d.nueva;
    Object.assign(e, { fuente: "wikidata", id_externo: n.q, wikidata: n.q });
    if (n.descripcion) e.descripcion = n.descripcion;
    if (n.url) e.url_externa = n.url;
    if (n.imagen) e.imagen = n.imagen;
    if (n.iso) e.iso = n.iso;
  }
  Object.assign(e, d.cambios || {});
  e.revisar = false;
  return ["cambiar", e];
}

const claveCambio = (e) => `${normalizar(e.nombre)}|${e.si_ficha || ""}|${e.si_tipo || ""}`;
const claveDe = { cambiar: claveCambio, fusionar: (e) => normalizar(e.de),
                  descartar: (e) => normalizar(typeof e === "string" ? e : e.nombre) };
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/**
 * El fichero existente + las decisiones nuevas. Una decisión sobre la misma referencia sustituye a la anterior.
 * Si se pasan «sobrantes» (las que ya no hacen nada según el informe de la última publicación), se quitan.
 */
export function combinar(existente, decisiones, sobrantes = []) {
  const salida = { ...existente };
  salida._instrucciones = existente?._instrucciones || INSTRUCCIONES_POR_DEFECTO;
  for (const k of LISTAS) salida[k] = (existente?.[k] || []).filter((e) => !sobrantes.some((s) => igual(s, e)));
  for (const d of decisiones) {
    const [lista, entrada] = entradaDe(d);
    const clave = claveDe[lista](entrada);
    salida[lista] = salida[lista].filter((e) => claveDe[lista](e) !== clave).concat([entrada]);
  }
  return salida;
}

/** JSON legible: una corrección por línea, como está escrito a mano el fichero. */
export function serializar(c) {
  const enLinea = (x) => JSON.stringify(x, null, 1).replace(/\n\s*/g, " ");
  const lista = (xs) => (xs?.length ? `[\n${xs.map((x) => `    ${enLinea(x)}`).join(",\n")}\n  ]` : "[]");
  const partes = [`  "_instrucciones": ${lista(c._instrucciones)}`];
  for (const k of LISTAS) partes.push(`  "${k}": ${lista(c[k])}`);
  for (const [k, v] of Object.entries(c)) {
    if (k !== "_instrucciones" && !LISTAS.includes(k)) partes.push(`  ${JSON.stringify(k)}: ${JSON.stringify(v)}`);
  }
  return `{\n${partes.join(",\n\n")}\n}\n`;
}
