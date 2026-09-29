// Funciones auxiliares sin estado ni acceso al DOM.

/** Escapa texto para insertarlo en HTML de forma segura. */
export const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
  );

/** Minúsculas y sin tildes, para búsquedas. */
export const normalizar = (s) =>
  String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/** "1:02:03" → 3723 segundos. */
export const segundos = (minuto) =>
  String(minuto || "0").split(":").reduce((acc, n) => acc * 60 + (+n || 0), 0);

/** Comparador alfabético en español (ignora tildes y mayúsculas). */
export const compararES = new Intl.Collator("es", { sensitivity: "base" }).compare;

/** ¿Empieza por una letra (con o sin tilde)? «@perfil», «1984» o «15M» no. */
export const empiezaPorLetra = (s) => /^[a-zñ]/.test(normalizar(s));

/** Orden A–Z con números y símbolos al final, como en el índice. */
export const compararAZ = (a, b) =>
  (empiezaPorLetra(b) - empiezaPorLetra(a)) || compararES(a, b);

/** Quita signos del principio («¿», «¡», comillas, corchetes) para ordenar títulos. */
export const sinSignosIniciales = (s) => String(s || "").replace(/^[^\p{L}\p{N}]+/u, "");

/** "TÍTULO - Subtítulo" → ["TÍTULO", "Subtítulo"] */
export function separarTitulo(titulo) {
  const t = String(titulo || "");
  const i = t.indexOf(" - ");
  return i > 0 ? [t.slice(0, i), t.slice(i + 3)] : [t, ""];
}

export const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
