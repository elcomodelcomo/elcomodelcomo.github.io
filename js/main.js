// Punto de entrada: carga los datos y conecta los eventos de la interfaz.
import { descargarDatos, leerArchivo, prepararDatos } from "./datos.js";
import { datos, estado, reiniciarFiltros } from "./filtros.js";
import { dom, pintar, pintarCabecera, pintarError } from "./render.js";
import { fichaHTML } from "./plantillas/referencia.js";

function usarDatos(lista) {
  Object.assign(datos, prepararDatos(lista));
  if (!datos.porId[estado.episodio]) estado.episodio = "";
  estado.abiertas.clear();
  pintarCabecera();
  pintar();
}

// --- Filtros ------------------------------------------------------------
let espera;
dom.busqueda.addEventListener("input", (e) => {
  clearTimeout(espera);
  espera = setTimeout(() => { estado.busqueda = e.target.value; pintar(); }, 120);
});
dom.episodio.addEventListener("change", (e) => { estado.episodio = e.target.value; pintar(); });
dom.orden.addEventListener("change", (e) => { estado.orden = e.target.value; pintar(); });
dom.relevancia.addEventListener("change", (e) => { estado.relevancia = e.target.value; pintar(); });

// --- Clics (delegados) ---------------------------------------------------
function alternarEntrada(boton) {
  const li = boton.parentElement;
  const id = li.dataset.id;
  const abrir = !estado.abiertas.has(id);
  abrir ? estado.abiertas.add(id) : estado.abiertas.delete(id);
  li.classList.toggle("open", abrir);
  boton.setAttribute("aria-expanded", abrir);
  li.querySelector(".detail").innerHTML = abrir ? fichaHTML(datos.referencias.find((r) => r.id === id)) : "";
}

function irAReferencia(id) {
  const r = datos.referencias.find((x) => x.id === id);
  if (!r) return;
  estado.vista = "indice";
  estado.busqueda = dom.busqueda.value = r.nombre;
  estado.tipos.clear();
  estado.abiertas.add(id);
  pintar();
  document.querySelector(`.entry[data-id="${CSS.escape(id)}"]`)?.scrollIntoView({ block: "center" });
}

document.addEventListener("click", (e) => {
  const el = e.target;
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

  const entrada = el.closest(".entry > button");
  if (entrada) alternarEntrada(entrada);
});

// --- Cargar otro JSON desde el ordenador --------------------------------
dom.archivo.addEventListener("change", async (e) => {
  const archivo = e.target.files[0];
  if (!archivo) return;
  try { usarDatos(await leerArchivo(archivo)); }
  catch (err) { alert(`No se ha podido cargar el archivo: ${err.message}.`); }
  e.target.value = "";
});

// --- Arranque ------------------------------------------------------------
try {
  usarDatos(await descargarDatos());
} catch (err) {
  const local = location.protocol === "file:";
  pintarError(
    local
      ? "Abierta como archivo local, el navegador no deja leer data/portal_referencias.json. Arranca un servidor en la carpeta (python -m http.server) o carga el JSON desde el pie de página."
      : `No se han podido cargar las referencias: ${err.message}. Carga un portal_referencias.json desde el pie de página.`
  );
}
