// Descarga de los datos en CSV, generado en el navegador a partir de lo cargado.
// Se genera a partir del JSON completo (data/portal_referencias.json), que solo se descarga al pedir el CSV.
import { posicionMencion } from "./formato.js";
import { compararAZ, sinSignosIniciales } from "./utils.js";

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
  ["origen", (r, m) => (m.origen === "descripcion" ? "descripción del vídeo" : "audio")],
  ["enlace_youtube", (r, m) => m.enlace],
  ["enlace_citado", (r, m) => m.url],
];

const celda = (v) => {
  const t = v == null ? "" : String(v);
  return /[";\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
};

export function csvDeReferencias(referencias) {
  const filas = [COLUMNAS.map(([nombre]) => nombre).join(";")];
  const porEpisodioYMinuto = (a, b) =>
    compararAZ(sinSignosIniciales(a.episodio), sinSignosIniciales(b.episodio)) || posicionMencion(a) - posicionMencion(b);
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
