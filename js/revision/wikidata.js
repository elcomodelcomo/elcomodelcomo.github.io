// Búsqueda en Wikidata desde el navegador (la API admite peticiones de otras webs con origin=*).
const API = "https://www.wikidata.org/w/api.php";

async function pedir(parametros) {
  const url = new URL(API);
  for (const [k, v] of Object.entries({ ...parametros, format: "json", origin: "*" })) url.searchParams.set(k, v);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Wikidata respondió ${res.status}`);
  return res.json();
}

const valor = (e, prop) => e.claims?.[prop]?.[0]?.mainsnak?.datavalue?.value;
const texto = (e, campo) => (e[campo]?.es || e[campo]?.en || {}).value || "";
const commons = (fichero) =>
  fichero ? `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fichero.replaceAll(" ", "_"))}?width=300` : "";

/** Candidatos para un texto: [{ q, etiqueta, descripcion, imagen, url, iso }]. */
export async function buscarEnWikidata(textoBuscado) {
  let ids = [];
  for (const idioma of ["es", "en"]) {
    const r = await pedir({ action: "wbsearchentities", search: textoBuscado, language: idioma, uselang: "es", type: "item", limit: "8" });
    ids = (r.search || []).map((x) => x.id);
    if (ids.length) break;
  }
  if (!ids.length) return [];
  const { entities } = await pedir({ action: "wbgetentities", ids: ids.join("|"), props: "labels|descriptions|claims|sitelinks/urls",
                                     languages: "es|en", sitefilter: "eswiki|enwiki" });
  return ids.map((q) => entities[q]).filter(Boolean).map((e) => {
    const iso = valor(e, "P297");
    return {
      q: e.id, etiqueta: texto(e, "labels") || e.id, descripcion: texto(e, "descriptions"),
      imagen: commons((iso && valor(e, "P41")) || valor(e, "P18") || valor(e, "P154")),
      url: (e.sitelinks?.eswiki || e.sitelinks?.enwiki || {}).url || `https://www.wikidata.org/wiki/${e.id}`,
      iso: iso || null,
    };
  });
}
