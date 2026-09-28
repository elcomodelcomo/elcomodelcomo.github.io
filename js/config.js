// Configuración de la web. Si el cuaderno añade tipos nuevos, se declaran aquí.

// Rutas de los datos (relativas a index.html).
export const RUTA_DATOS = "data/portal_referencias.json";
export const RUTA_MAPA = "data/mapa-mundo.json"; // generado con herramientas/generar-mapa.mjs

// tipo del JSON → [nombre del filtro (plural), etiqueta junto al nombre (singular)]
export const TIPOS = {
  persona: ["Personas", "persona"],
  empresa: ["Empresas y organizaciones", "organización"],
  pais: ["Países y lugares", "lugar"],
  evento_historico: ["Hechos históricos", "hecho histórico"],
  libro: ["Libros", "libro"],
  pelicula: ["Películas", "película"],
  serie: ["Series", "serie"],
  programa_tv: ["Programas de TV", "programa de TV"],
  podcast: ["Podcasts", "podcast"],
  artista_musical: ["Música", "artista musical"],
  cancion: ["Canciones", "canción"],
  disco: ["Discos", "disco"],
  rrss: ["Redes sociales", "red social"],
  otro: ["Otros", "otro"],
};

// Cómo encaja la imagen de cada tipo en el mosaico.
//  "bandera": proporción 4:3 sin recortar · "contener": logos, sin recortar · el resto: póster 2:3 recortado
export const ENCAJE_IMAGEN = { pais: "bandera", empresa: "contener", rrss: "contener", podcast: "contener" };

// Códigos ISO históricos sin bandera en flagcdn: se usa la imagen de Wikidata.
export const ISO_HISTORICOS = new Set(["SU", "DD", "YU", "CS"]);
export const urlBandera = (iso) => `https://flagcdn.com/w160/${iso.toLowerCase()}.png`;

// Peso de cada relevancia, para filtrar y ordenar.
export const RELEVANCIA = { central: 3, secundaria: 2, de_pasada: 1 };

// Opciones del desplegable «Ordenar» en cada vista (la primera es la de partida).
export const ORDENES = {
  indice: [["az", "Orden alfabético"], ["menciones", "Más mencionadas primero"]],
  mosaico: [["menciones", "Más mencionadas primero"], ["az", "Orden alfabético"]],
  episodios: [["titulo", "Por título"], ["referencias", "Más referencias primero"], ["menciones", "Más menciones primero"]],
  mapa: [],
};

export const nombreTipo = (t) => (TIPOS[t] || [t])[0];
export const etiquetaTipo = (t) => (TIPOS[t] || [t, t])[1];
