// Genera data/mapa-mundo.json: un trazado SVG por país (código ISO alfa-2)
// y un punto para los países demasiado pequeños para verse a esta escala.
// Uso: npm i world-atlas@2 d3-geo@3 topojson-client@3 i18n-iso-countries@7
//      node generar-mapa.mjs ../data/mapa-mundo.json
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { geoEqualEarth, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import paises from "i18n-iso-countries";

const require = createRequire(import.meta.url);
const cargar = (n) => JSON.parse(readFileSync(require.resolve(`world-atlas/${n}`), "utf8"));
const ANCHO = 960, ALTO = 470;

const grueso = feature(cargar("countries-110m.json"), "countries");
const fino = feature(cargar("countries-50m.json"), "countries");
const sinAntartida = { ...grueso, features: grueso.features.filter((f) => f.id !== "010") };

const proyeccion = geoEqualEarth().fitExtent([[4, 4], [ANCHO - 4, ALTO - 4]], sinAntartida);
const trazar = geoPath(proyeccion);
const redondear = (d) => d.replace(/(\d+\.\d)\d+/g, "$1");
const alfa2 = (f) => paises.numericToAlpha2(f.id) || null;

const trazados = {}, sinCodigo = [];
for (const f of sinAntartida.features) {
  const iso = alfa2(f);
  const d = redondear(trazar(f) || "");
  if (!d) continue;
  if (iso) trazados[iso] = (trazados[iso] || "") + d;
  else sinCodigo.push(d);
}

const puntos = {};
for (const f of fino.features) {
  const iso = alfa2(f);
  if (!iso || trazados[iso]) continue;
  const [x, y] = trazar.centroid(f);
  if (Number.isFinite(x)) puntos[iso] = [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
}

const salida = process.argv[2] || "mapa-mundo.json";
writeFileSync(salida, JSON.stringify({ ancho: ANCHO, alto: ALTO, trazados, puntos, fondo: sinCodigo.join("") }));
console.log(`${Object.keys(trazados).length} países con trazado, ${Object.keys(puntos).length} como punto → ${salida}`);
