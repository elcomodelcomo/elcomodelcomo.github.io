// Prepara la web para publicarla. Lo ejecuta GitHub Actions en cada push (.github/workflows/publicar.yml).
//
//   node herramientas/construir.mjs [carpeta de salida, por defecto _site]
//
// 1. Copia la web a la carpeta de salida (sin el cuaderno ni las herramientas).
// 2. Limpia data/portal_referencias.json con data/correcciones.json (ver js/limpieza.js)
//    y lo parte en data/indice.json, imagenes.json, fichas/ y episodios/.
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
const leer = (ruta) => JSON.parse(readFileSync(join(raiz, ruta), "utf8"));
const original = leer("data/portal_referencias.json");
let correcciones = {};
try { correcciones = leer("data/correcciones.json"); }
catch (err) { if (err.code !== "ENOENT") throw new Error(`data/correcciones.json no es un JSON válido: ${err.message}`); }
const { indice, fichas, episodios, imagenes, lista, informe } = partir(original, correcciones);

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
// La descarga (JSON y CSV) es la versión ya limpia, la misma que se ve en la web.
writeFileSync(join(datos, "portal_referencias.json"), JSON.stringify(lista, null, 1));
// Para la página de revisión: qué correcciones ya no hacen nada.
escribir(join(datos, "informe-limpieza.json"), { avisos: informe.avisos, sobrantes: informe.sobrantes });
for (const [prefijo, grupo] of Object.entries(fichas)) escribir(join(datos, "fichas", `${prefijo}.json`), grupo);
for (const [id, ms] of Object.entries(episodios)) escribir(join(datos, "episodios", `${id}.json`), ms);

// Informe de limpieza en el registro de GitHub Actions, para revisar lo que se ha corregido solo.
console.log(`\nLimpieza: ${original.length} referencias del cuaderno → ${lista.length} publicadas.`);
for (const a of informe.avisos) console.log(`  ⚠ correcciones.json: ${a}`);
if (informe.retipados.length) console.log(`  ${informe.retipados.length} «artistas musicales» pasan a persona: ${informe.retipados.join("; ")}`);
const dudosas = informe.fusionadas.filter((f) => f.revisar);
console.log(`  ${informe.fusionadas.length} grupos de referencias repetidas juntados. Con nombres distintos (revisa que sean lo mismo):`);
for (const f of dudosas) console.log(`    ${f.queda} ← ${f.juntas.join(" + ")}`);
console.log(`\nDatos: ${indice.refs.length} referencias, ${indice.episodios.length} episodios, ` +
  `${Object.keys(fichas).length} ficheros de fichas (versión ${indice.v}).`);

// --- JavaScript y CSS en un solo fichero cada uno ---------------------------
let esbuild;
try {
  esbuild = await import("esbuild");
} catch {
  console.log("esbuild no está instalado: se publican los módulos por separado (funciona igual, carga algo más lento).");
}
if (esbuild) {
  // Dos páginas: la web (main) y la de revisión (revisar)
  const PAGINAS = ["main", "revisar"];
  await esbuild.build({
    entryPoints: PAGINAS.map((p) => join(raiz, `js/${p}.js`)), outdir: join(salida, "js"),
    bundle: true, minify: true, format: "esm", target: "es2022", allowOverwrite: true, logLevel: "warning",
  });
  await esbuild.build({
    entryPoints: PAGINAS.map((p) => join(raiz, `css/${p}.css`)), outdir: join(salida, "css"),
    bundle: true, minify: true, external: ["*.woff2"], allowOverwrite: true, logLevel: "warning",
  });
  // Los módulos y hojas sueltas ya van dentro de los ficheros juntados.
  for (const carpeta of ["js", "css"]) {
    for (const f of readdirSync(join(salida, carpeta))) {
      if (!PAGINAS.some((p) => f === `${p}.${carpeta}`)) rmSync(join(salida, carpeta, f), { recursive: true, force: true });
    }
  }
  console.log("JavaScript y CSS juntados y comprimidos con esbuild.");
}
