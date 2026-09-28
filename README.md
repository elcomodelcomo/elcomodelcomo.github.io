# Todo lo que sale en Cómo

Índice web de las referencias (personas, libros, películas, países…) que se mencionan en
[Cómo, el podcast de antiayuda](https://www.youtube.com/channel/UCu1hOYlEjV1bvE1_wtO_8zw).
Los datos los genera el cuaderno `PoC_COMO_v3.ipynb` (sección 8, «Exportación para el portal»).

## Estructura

```
index.html                  Solo estructura: cabecera, controles, contenedores y pie
data/
  portal_referencias.json   Salida del cuaderno. Sustituirlo actualiza la web
css/
  tokens.css                Colores, tipografías y modo oscuro
  base.css                  Reset, estilos generales y utilidades
  components.css            Botones, chips, marcas de tiempo, etiquetas
  layout.css                Cabecera, barra de filtros, letras, pie
  indice.css                Vista «Índice A–Z»
  episodios.css             Vista «Por episodio»
js/
  main.js                   Arranque y eventos
  config.js                 Tipos de referencia, relevancias y ruta del JSON
  datos.js                  Carga y preparación de datos (sin DOM)
  filtros.js                Estado de la interfaz y filtrado (sin DOM)
  render.js                 Pinta cabecera, chips y la vista activa
  utils.js                  Funciones auxiliares puras
  plantillas/referencia.js  HTML de una referencia y su ficha
  vistas/indice.js          Vista «Índice A–Z»
  vistas/episodios.js       Vista «Por episodio»
```

El flujo es: `main.js` carga el JSON con `datos.js` → lo guarda en `filtros.js` →
`render.js` decide qué vista pintar → las vistas usan `plantillas/` para generar el HTML.

## Actualizar los datos

Vuelve a ejecutar el cuaderno y sustituye `data/portal_referencias.json` por el nuevo.
Haz commit y GitHub Pages lo publica solo.

Si el cuaderno añade un tipo nuevo de referencia, añádelo en `js/config.js` para darle un
nombre legible (si no, se muestra el identificador tal cual).

## Probar en local

El navegador no deja leer el JSON si abres `index.html` con doble clic (`file://`).
Arranca un servidor en la carpeta:

```bash
python -m http.server 8000
```

y abre <http://localhost:8000>.

## Publicar en GitHub Pages

1. Sube el contenido de esta carpeta a la raíz de un repositorio público.
2. En Settings → Pages elige «Deploy from a branch», rama `main`, carpeta `/ (root)`.
3. La web queda en `https://<usuario>.github.io/<repositorio>/`.

No hace falta ningún paso de compilación: son archivos estáticos con módulos de JavaScript nativos.
