// Punto de entrada: carga los datos y conecta los eventos de la interfaz.
import { cargarDatos, completarReferencia, leerArchivo, listaCompleta, usarLista } from "./datos.js";
import { buscarReferencia, datos, estado, reiniciarFiltros, volverAlEstadoInicial } from "./filtros.js";
import { vigilarImagenesRotas } from "./imagenes.js";
import { dom, pintar, pintarCabecera, pintarError } from "./render.js";
import { CARGANDO_FICHA, errorFicha, fichaHTML } from "./plantillas/referencia.js";
import { abrirFicha } from "./componentes/dialogo.js";
import { abrirComoSeHace } from "./componentes/como-se-hace.js";
import { vigilarFijos } from "./componentes/fijos.js";
import { asegurarLetra } from "./componentes/letras.js";
import { olvidarImagenes } from "./vistas/mosaico.js";
import { descargarCSV } from "./descargas.js";

function usarDatos(preparados) {
  Object.assign(datos, preparados);
  olvidarImagenes();
  if (!datos.porId[estado.episodio]) estado.episodio = "";
  estado.abiertas.clear();
  estado.episodiosAbiertos.clear();
  pintarCabecera();
  pintar();
}

vigilarImagenesRotas();
vigilarFijos();

// --- Filtros ------------------------------------------------------------
let espera;
dom.busqueda.addEventListener("input", (e) => {
  clearTimeout(espera);
  espera = setTimeout(() => { estado.busqueda = e.target.value; pintar(); }, 120);
});
dom.episodio.addEventListener("change", (e) => { estado.episodio = e.target.value; pintar(); });
dom.orden.addEventListener("change", (e) => { estado.ordenes[estado.vista] = e.target.value; pintar(); });
dom.relevancia.addEventListener("change", (e) => { estado.relevancia = e.target.value; pintar(); });

// --- Clics (delegados) ---------------------------------------------------
async function alternarEntrada(boton) {
  const li = boton.parentElement;
  const id = li.dataset.id;
  const abrir = !estado.abiertas.has(id);
  abrir ? estado.abiertas.add(id) : estado.abiertas.delete(id);
  li.classList.toggle("open", abrir);
  boton.setAttribute("aria-expanded", abrir);
  const detalle = li.querySelector(".detail");
  if (!abrir) { detalle.innerHTML = ""; return; }

  const r = buscarReferencia(id);
  if (r._completa) { detalle.innerHTML = fichaHTML(r); return; }
  detalle.innerHTML = CARGANDO_FICHA;
  try {
    await completarReferencia(r);
    if (li.isConnected && estado.abiertas.has(id)) detalle.innerHTML = fichaHTML(r);
  } catch (err) {
    if (li.isConnected) detalle.innerHTML = errorFicha(err);
  }
}

function irAReferencia(id) {
  const r = buscarReferencia(id);
  if (!r) return;
  estado.vista = "indice";
  estado.busqueda = dom.busqueda.value = r.nombre;
  estado.tipos.clear();
  estado.abiertas.add(id);
  pintar();
  asegurarLetra(r._letra);
  document.querySelector(`.entry[data-id="${CSS.escape(id)}"]`)?.scrollIntoView({ block: "center" });
}

/** Clic en el logo: vuelve al inicio sin volver a descargar los datos. */
function volverAlInicio() {
  volverAlEstadoInicial();
  dom.busqueda.value = dom.episodio.value = dom.relevancia.value = "";
  pintar();
  window.scrollTo({ top: 0 });
  history.replaceState(null, "", location.pathname);
}

function abrirDesde(el) {
  const r = buscarReferencia(el.dataset.abrir);
  if (r) abrirFicha(r);
}

/** El CSV sale del JSON completo, que solo se descarga en este momento. */
async function prepararCSV(boton) {
  if (boton.getAttribute("aria-busy") === "true") return;
  const texto = boton.textContent;
  boton.setAttribute("aria-busy", "true");
  boton.textContent = "preparando el CSV…";
  try { descargarCSV(await listaCompleta()); }
  catch (err) { alert(`No se ha podido preparar el CSV: ${err.message}.`); }
  finally { boton.textContent = texto; boton.removeAttribute("aria-busy"); }
}

document.addEventListener("click", (e) => {
  const el = e.target;
  if (!(el instanceof Element)) return;

  // Estos dos también funcionan desde dentro de la ventana «Cómo se hace».
  const csv = el.closest('[data-accion="csv"]');
  if (csv) { prepararCSV(csv); return; }
  if (el.closest('[data-accion="como"]')) { abrirComoSeHace(); return; }

  if (el.closest("dialog")) return;

  // Con Ctrl, Cmd o clic central se deja abrir el inicio en otra pestaña.
  // Si los datos no han llegado a cargar, se recarga la página.
  const logo = el.closest("[data-inicio]");
  if (logo) {
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0 || !datos.referencias.length) return;
    e.preventDefault();
    volverAlInicio();
    return;
  }

  const vista = el.closest("[data-view]");
  if (vista) { estado.vista = vista.dataset.view; pintar(); return; }

  const chip = el.closest("[data-tipo]");
  if (chip) {
    const t = chip.dataset.tipo;
    if (!t) estado.tipos.clear();
    else estado.tipos.has(t) ? estado.tipos.delete(t) : estado.tipos.add(t);
    pintar();
    return;
  }

  if (el.closest('[data-accion="reiniciar"]')) {
    reiniciarFiltros();
    dom.busqueda.value = dom.episodio.value = dom.relevancia.value = "";
    pintar();
    return;
  }

  const ir = el.closest("[data-ir-a]");
  if (ir) { irAReferencia(ir.dataset.irA); return; }

  const abrir = el.closest("[data-abrir]");
  if (abrir) { abrirDesde(abrir); return; }

  const entrada = el.closest(".entry > button");
  if (entrada) alternarEntrada(entrada);
});

// Los países del mapa son elementos SVG: se activan también con Intro o espacio.
document.addEventListener("keydown", (e) => {
  const el = e.target;
  if ((e.key === "Enter" || e.key === " ") && el instanceof SVGElement && el.dataset.abrir) {
    e.preventDefault();
    abrirDesde(el);
  }
});

// --- Cargar otro JSON desde el ordenador --------------------------------
dom.archivo.addEventListener("change", async (e) => {
  const archivo = e.target.files[0];
  if (!archivo) return;
  try { usarDatos(await usarLista(await leerArchivo(archivo))); }
  catch (err) { alert(`No se ha podido cargar el archivo: ${err.message}.`); }
  e.target.value = "";
});

// --- Arranque ------------------------------------------------------------
try {
  usarDatos(await cargarDatos());
} catch (err) {
  const local = location.protocol === "file:";
  pintarError(
    local
      ? "Abierta como archivo local, el navegador no deja leer los datos. Arranca un servidor en la carpeta (python -m http.server) o carga el JSON desde el pie de página."
      : `No se han podido cargar las referencias: ${err.message}. Carga un portal_referencias.json desde el pie de página.`
  );
}
