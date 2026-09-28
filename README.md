# Todo lo que sale en Cómo

Índice web de las referencias (personas, libros, películas, países…) que se mencionan en
[Cómo, el podcast de antiayuda](https://www.youtube.com/channel/UCu1hOYlEjV1bvE1_wtO_8zw).
Los datos los genera el cuaderno `PoC_COMO_v3.ipynb` (sección 8, «Exportación para el portal»).

Web hecha por un oyente, sin relación oficial con el podcast. El logo (`img/logo.png`) pertenece a Cómo.

## Vistas

- **Índice**: A–Z o por número de menciones, con ficha desplegable.
- **Mosaico**: portadas de libros y películas, banderas, fotos y logos.
- **Episodios**: menciones de cada episodio en orden; se puede ordenar por título, número de referencias o de menciones.
- **Mapa**: países mencionados, más verdes cuanto más se citan, y lista con banderas.

## Estructura

```
index.html                  Solo estructura
img/logo.png                Logo del podcast con fondo transparente
data/
  portal_referencias.json   Salida del cuaderno. Sustituirlo actualiza la web
  mapa-mundo.json           Siluetas de los países ya proyectadas (ver herramientas/)
css/
  tokens.css                Paleta (negro y verde del logo) y tipografías
  base.css                  Reset, estilos generales y utilidades
  components.css            Botones, chips, minutos, ventana de ficha
  layout.css                Cabecera, barra de filtros, letras, pie
  indice.css · mosaico.css · episodios.css · mapa.css   Una hoja por vista
js/
  main.js                   Arranque y eventos
  config.js                 Tipos, órdenes por vista, encaje de imágenes, rutas
  datos.js                  Carga y preparación de datos (sin DOM)
  filtros.js                Estado de la interfaz y filtrado (sin DOM)
  imagenes.js               Qué imagen usar y qué hacer si falla
  render.js                 Pinta cabecera, chips y la vista activa
  utils.js                  Funciones auxiliares puras
  plantillas/referencia.js  HTML de una referencia y su ficha
  componentes/dialogo.js    Ventana con la ficha (mosaico y mapa)
  vistas/                   indice.js, mosaico.js, episodios.js, mapa.js, orden.js
herramientas/
  generar-mapa.mjs          Script de Node que genera data/mapa-mundo.json
```

## Imágenes

Las portadas y fotos se cargan directamente desde las fuentes que guarda el cuaderno
(TMDB, Open Library, Wikimedia, Cover Art Archive). Las banderas se piden a
[flagcdn.com](https://flagcdn.com) a partir del código ISO, porque la imagen que trae
Wikidata a veces es una bandera histórica. Si una imagen no carga, se muestra el nombre.

## Actualizar los datos

Vuelve a ejecutar el cuaderno, sustituye `data/portal_referencias.json` y haz commit.
El mapa no hace falta regenerarlo: solo cambia si quieres otra proyección o resolución.

## Probar en local

```bash
python -m http.server 8000
```

y abre <http://localhost:8000> (con doble clic en `index.html` el navegador no deja leer los JSON).

## Publicar en GitHub Pages

Sube el contenido de esta carpeta a la raíz de un repositorio público y, en
Settings → Pages, elige «Deploy from a branch», rama `main`, carpeta `/ (root)`.
