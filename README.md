# Todo lo que sale en Cómo

Índice web de las referencias (personas, libros, películas, países…) que se mencionan en
[Cómo, el podcast de antiayuda](https://www.youtube.com/channel/UCu1hOYlEjV1bvE1_wtO_8zw).
Los datos los genera el cuaderno de `cuaderno/` (sección 8, «Exportación para el portal»).
Solo entran los episodios con subtítulos en YouTube: las referencias se sacan de las transcripciones.

Web hecha por un comower, sin relación oficial con el podcast. El logo (`img/logo.svg` e `img/logo.png`) pertenece a Cómo.

## Vistas

- **Índice**: A–Z o por número de menciones, con ficha desplegable. La barra de letras se queda fija al bajar y marca la letra por la que vas.
- **Mosaico**: portadas de libros y películas, banderas, fotos y logos.
- **Episodios**: menciones de cada episodio en orden; se puede ordenar por título, número de referencias o de menciones.
- **Mapa**: países mencionados, más verdes cuanto más se citan, y lista con banderas.

## Estructura

```
index.html                  Solo estructura
img/logo.svg                Logo del podcast en vector (trazado de logo.png): nítido a cualquier tamaño
img/logo.png                Logo original con fondo transparente
fuentes/                    Big Shoulders Display e Instrument Sans (OFL), alojadas aquí
data/
  portal_referencias.json   Salida del cuaderno. Sustituirlo actualiza la web
  correcciones.json         Correcciones a mano que se aplican al publicar (ver «Corregir datos»)
revisar.html                Página para revisar las referencias dudosas (ver «Revisar las referencias dudosas»)
  mapa-mundo.json           Siluetas de los países ya proyectadas (ver herramientas/)
css/
  main.css                  Hoja que enlaza index.html; importa todas las demás
  fuentes.css · tokens.css · base.css · components.css · layout.css
  indice.css · mosaico.css · episodios.css · mapa.css · como-se-hace.css
js/
  main.js                   Arranque y eventos
  config.js                 Tipos, órdenes por vista, encaje de imágenes, rutas
  formato.js                Cómo se parte el JSON en índice, fichas y episodios (web y Node)
  limpieza.js               Junta repetidas, corrige tipos y aplica data/correcciones.json (web y Node)
  datos.js                  Carga del índice y de lo demás bajo demanda (sin DOM)
  filtros.js                Estado de la interfaz y filtrado (sin DOM)
  imagenes.js               Qué imagen usar y qué hacer si falla
  render.js                 Pinta cabecera, chips y la vista activa
  descargas.js              CSV generado en el navegador
  revisar.js                Página de revisión; revision/ tiene la parte sin DOM (correcciones y Wikidata)
  utils.js                  Funciones auxiliares puras
  plantillas/referencia.js  HTML de una referencia y su ficha
  componentes/              Ventanas, barra de letras, flecha para subir, fichas pendientes
  vistas/                   indice.js, mosaico.js, episodios.js, mapa.js, orden.js, tandas.js
herramientas/
  construir.mjs             Prepara la web para publicarla (lo ejecuta GitHub Actions)
  generar-mapa.mjs          Script de Node que genera data/mapa-mundo.json
.github/workflows/
  publicar.yml              Publica en GitHub Pages en cada push
```

## Cómo carga

Al publicar, `herramientas/construir.mjs` parte `portal_referencias.json` en:

- `data/indice.json`: lo justo para buscar, filtrar y listar. Es lo único que se descarga al entrar (unos 180 KB comprimido, frente a los 820 KB del JSON entero).
- `data/fichas/<xx>.json`: el detalle de cada referencia, agrupado por los dos primeros caracteres del id. Se pide al abrir una ficha.
- `data/episodios/<video_id>.json`: las menciones de un episodio en orden. Se pide al desplegarlo.
- `data/imagenes.json`: portadas, fotos y logos. Se pide al abrir el mosaico o el mapa.

El índice y el mosaico se pintan por tandas según se baja. Además, el JavaScript y el CSS
se juntan y comprimen con esbuild en un fichero de cada. Ninguno de estos ficheros generados
se guarda en el repositorio: se crean en cada publicación.

Si no hay `indice.json` (por ejemplo, en local sin construir), la web carga el JSON completo
y lo parte en el navegador con el mismo código. Funciona igual, solo que tarda más en arrancar.

## Revisar las referencias dudosas

`revisar.html` (no enlazada desde la web: entra a mano en `/revisar.html`) recorre las referencias marcadas
«por revisar», de las más mencionadas a las menos. Para cada una enseña lo que se dijo en el podcast y la ficha
encontrada, y permite darla por buena, quitar la ficha, buscar la buena en Wikidata, juntarla con otra,
cambiar el tipo o el nombre, o descartarla. Tiene atajos de teclado (1, 2, 3, J, B, flechas y Z para deshacer).

Las decisiones se guardan en el navegador. «Generar correcciones» las junta con `data/correcciones.json`
(quitando además las correcciones que ya no hacen nada) y da el fichero nuevo para pegarlo en GitHub.

## Corregir datos

Al publicar, `js/limpieza.js` limpia lo que sale del cuaderno antes de partirlo:

- **Junta las referencias repetidas**: las que comparten elemento de Wikidata o ficha de TMDB,
  MusicBrainz u Open Library («Estados Unidos» y «Estados Unidos de América», «Catar» y «Qatar»),
  y las de persona y artista musical con el mismo nombre. Se queda el nombre más mencionado, el
  tipo que suma más menciones y la ficha más fiable.
- **Pasa a persona los «artistas musicales» que no lo son** según su propia descripción
  (futbolista, arquitecto, escritor…).
- **Aplica `data/correcciones.json`**: descartar, cambiar campos (tipo, nombre, quitar una ficha
  mal identificada…) y fusionar. Las instrucciones están dentro del propio fichero. Se puede editar
  desde GitHub con el icono del lápiz; al guardar se vuelve a publicar.

El registro de cada publicación (pestaña «Actions» → el último «Publicar la web» → paso «Construir la web»)
lista lo que se ha corregido solo y las fusiones con nombres distintos, que son las que conviene revisar:
si dos cosas distintas se han juntado, es que una está mal identificada y hay que quitarle la ficha.

La descarga en JSON y CSV es la versión ya corregida.

## Imágenes

Las portadas y fotos se cargan directamente desde las fuentes que guarda el cuaderno
(TMDB, Open Library, Wikimedia, Cover Art Archive). Las banderas se piden a
[flagcdn.com](https://flagcdn.com) a partir del código ISO, porque la imagen que trae
Wikidata a veces es una bandera histórica. Si una imagen no carga, se muestra el nombre.

## Actualizar los datos

Vuelve a ejecutar el cuaderno, sustituye `data/portal_referencias.json` y haz commit.
GitHub Actions publica la web nueva en un par de minutos (pestaña «Actions» del repositorio).
El mapa no hace falta regenerarlo: solo cambia si quieres otra proyección o resolución.

## Probar en local

```bash
python -m http.server 8000
```

y abre <http://localhost:8000> (con doble clic en `index.html` el navegador no deja leer los JSON).
Así se usa el JSON completo. Para probar exactamente lo que se publica:

```bash
npm install --no-save esbuild      # opcional: sin esbuild se publican los módulos sueltos
node herramientas/construir.mjs
cd _site && python -m http.server 8000
```

## Publicar en GitHub Pages

En Settings → Pages → Build and deployment, elige «GitHub Actions» como origen (*Source*).
A partir de ahí, cada push a `main` publica la web con `.github/workflows/publicar.yml`.
