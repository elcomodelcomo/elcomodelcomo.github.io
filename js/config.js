// Configuración de la web. Si el cuaderno añade tipos nuevos, se declaran aquí.

// Ruta del JSON que genera el cuaderno (sección 8, «Exportación para el portal»).
export const RUTA_DATOS = "data/portal_referencias.json";

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

// Peso de cada relevancia, para filtrar y ordenar.
export const RELEVANCIA = { central: 3, secundaria: 2, de_pasada: 1 };

export const nombreTipo = (t) => (TIPOS[t] || [t])[0];
export const etiquetaTipo = (t) => (TIPOS[t] || [t, t])[1];
