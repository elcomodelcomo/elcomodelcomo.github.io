// Qué imagen mostrar para cada referencia y qué hacer si no carga.
import { ENCAJE_IMAGEN, ISO_HISTORICOS, urlBandera } from "./config.js";
import { esc } from "./utils.js";

/**
 * Devuelve { src, alternativa } o null.
 * Para los países se usa la bandera actual según el código ISO: la imagen que trae
 * Wikidata a veces es una bandera histórica (p. ej. la de 49 estrellas de EE. UU.).
 */
export function imagenDe(r) {
  const iso = r.extra?.iso;
  if (r.tipo === "pais" && iso && !ISO_HISTORICOS.has(iso)) return { src: urlBandera(iso), alternativa: r.imagen || "" };
  return r.imagen ? { src: r.imagen, alternativa: "" } : null;
}

export const encajeDe = (r) => ENCAJE_IMAGEN[r.tipo] || "poster";

/** <img> con imagen alternativa para el manejador de errores de abajo. */
export function imgHTML(r, alt = "") {
  const im = imagenDe(r);
  if (!im) return "";
  return `<img src="${esc(im.src)}" alt="${esc(alt)}" loading="lazy" decoding="async"${im.alternativa ? ` data-alternativa="${esc(im.alternativa)}"` : ""}>`;
}

/**
 * Si una imagen falla, prueba la alternativa; si no hay, la quita y marca el hueco
 * con .sin-imagen para que el CSS muestre el nombre en su lugar.
 */
export function vigilarImagenesRotas(raiz = document) {
  raiz.addEventListener("error", (e) => {
    const img = e.target;
    if (!(img instanceof HTMLImageElement)) return;
    if (img.dataset.alternativa) {
      const otra = img.dataset.alternativa;
      delete img.dataset.alternativa;
      img.src = otra;
      return;
    }
    img.parentElement?.classList.add("sin-imagen");
    img.remove();
  }, true);
}
