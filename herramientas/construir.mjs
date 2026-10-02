// Prepara la web para publicarla. Lo ejecuta GitHub Actions en cada push (.github/workflows/publicar.yml).
//
//   node herramientas/construir.mjs [carpeta de salida, por defecto _site]
//
// 1. Copia la web a la carpeta de salida (sin el cuaderno ni las herramientas).
// 2. Parte data/portal_referencias.json en data/indice.json, imagenes.json, fichas/ y episodios/.
// 3. Si esbuild está instalado, junta y comprime el JavaScript y el CSS en un fichero de cada.
//
// Para probar en local el resultado: cd _site && python -m http.server 8000
import { createHash } from "node:crypto";
import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { partir } from "../js/formato.js";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const salida = resolve(raiz, process.argv[2] || "_site");
const FUERA = new Set([".git", ".github", "cuaderno", "herramientas", "node_modules", "_site", "README.md", ".gitignore"]);

rmSync(salida, { recursive: true, force: true });
mkdirSync(salida, { recursive: true });
// Se copia entrada a entrada: la salida suele estar dentro del propio repositorio.
for (const nombre of readdirSync(raiz)) {
  if (!FUERA.has(nombre) && join(raiz, nombre) !== salida) cpSync(join(raiz, nombre), join(salida, nombre), { recursive: true });
}

// --- Datos ------------------------------------------------------------------
const lista = JSON.parse(readFileSync(join(raiz, "data/portal_referencias.json"), "utf8"));
const { indice, fichas, episodios, imagenes } = partir(lista);

// La versión cambia si cambia cualquier fichero de datos. La web la añade a las URLs
// de fichas y episodios, así nunca mezcla un índice nuevo con detalles viejos de la caché.
indice.v = createHash("sha256").update(JSON.stringify([indice, fichas, episodios, imagenes])).digest("hex").slice(0, 10);

const datos = join(salida, "data");
const escribir = (ruta, obj) => {
  mkdirSync(dirname(ruta), { recursive: true });
  writeFileSync(ruta, JSON.stringify(obj));
};
escribir(join(datos, "indice.json"), indice);
escribir(join(datos, "imagenes.json"), imagenes);
for (const [prefijo, grupo] of Object.entries(fichas)) escribir(join(datos, "fichas", `${prefijo}.json`), grupo);
for (const [id, ms] of Object.entries(episodios)) escribir(join(datos, "episodios", `${id}.json`), ms);

console.log(`Datos: ${indice.refs.length} referencias, ${indice.episodios.length} episodios, ` +
  `${Object.keys(fichas).length} ficheros de fichas (versión ${indice.v}).`);

// --- JavaScript y CSS en un solo fichero cada uno ---------------------------
let esbuild;
try {
  esbuild = await import("esbuild");
} catch {
  console.log("esbuild no está instalado: se publican los módulos por separado (funciona igual, carga algo más lento).");
}
if (esbuild) {
  await esbuild.build({
    entryPoints: [join(raiz, "js/main.js")], outfile: join(salida, "js/main.js"),
    bundle: true, minify: true, format: "esm", target: "es2022", allowOverwrite: true, logLevel: "warning",
  });
  await esbuild.build({
    entryPoints: [join(raiz, "css/main.css")], outfile: join(salida, "css/main.css"),
    bundle: true, minify: true, external: ["*.woff2"], allowOverwrite: true, logLevel: "warning",
  });
  // Los módulos y hojas sueltas ya van dentro de main.js y main.css.
  for (const carpeta of ["js", "css"]) {
    for (const f of readdirSync(join(salida, carpeta))) {
      if (f !== `main.${carpeta}`) rmSync(join(salida, carpeta, f), { recursive: true, force: true });
    }
  }
  console.log("JavaScript y CSS juntados y comprimidos con esbuild.");
}
