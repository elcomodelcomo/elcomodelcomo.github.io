// Descarga de los datos en CSV, generado en el navegador a partir de lo cargado.
// El JSON completo se descarga con un enlace normal a data/portal_referencias.json.
import { compararAZ, segundos, sinSignosIniciales } from "./utils.js";

// Una fila por mención. Separador «;» y BOM para que Excel en español lo abra con tildes y columnas.
const COLUMNAS = [
  ["nombre", (r) => r.nombre],
  ["tipo", (r) => r.tipo],
  ["autor", (r) => r.autor],
  ["año", (r) => r.anio],
  ["descripción", (r) => r.descripcion],
  ["por_revisar", (r) => (r.revisar ? "sí" : "no")],
  ["enlace_externo", (r) => r.url_externa],
  ["episodio", (r, m) => m.episodio],
  ["minuto", (r, m) => m.minuto],
  ["relevancia", (r, m) => m.relevancia],
  ["contexto", (r, m) => m.contexto],
  ["enlace_youtube", (r, m) => m.enlace],
];

const celda = (v) => {
  const t = v == null ? "" : String(v);
  return /[";\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
};

export function csvDeReferencias(referencias) {
  const filas = [COLUMNAS.map(([nombre]) => nombre).join(";")];
  const porEpisodioYMinuto = (a, b) =>
    compararAZ(sinSignosIniciales(a.episodio), sinSignosIniciales(b.episodio)) || segundos(a.minuto) - segundos(b.minuto);
  for (const r of [...referencias].sort((a, b) => compararAZ(a.nombre, b.nombre))) {
    for (const m of [...r.menciones].sort(porEpisodioYMinuto)) filas.push(COLUMNAS.map(([, valor]) => celda(valor(r, m))).join(";"));
  }
  return "\ufeff" + filas.join("\r\n");
}

export function descargarCSV(referencias, nombreArchivo = "entendi-la-referencia-menciones.csv") {
  const url = URL.createObjectURL(new Blob([csvDeReferencias(referencias)], { type: "text/csv;charset=utf-8" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: nombreArchivo });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
