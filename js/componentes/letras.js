// Barra de letras del índice A–Z: siempre a la vista mientras se baja, marca la letra
// por la que vas y, al pulsar una, pinta hasta ella (si aún no estaba) y salta.
const barra = document.querySelector("#letters");
let actual = null; // { contenedor, asegurar(letra) } mientras el índice está en orden A–Z

export const ancla = (l) => `l-${l === "#" ? "num" : l}`;

/** En móvil la barra se desliza: el fundido de la derecha solo mientras quedan letras por ver. */
function avisarDeMas() {
  barra.classList.toggle("hay-mas", barra.scrollLeft + barra.clientWidth < barra.scrollWidth - 2);
}
barra.addEventListener("scroll", avisarDeMas, { passive: true });
addEventListener("resize", avisarDeMas);

/** La vista del índice la activa con su contenedor; las demás vistas la apagan con null. */
export function activarLetras(config) {
  actual = config;
  if (!config) barra.innerHTML = "";
  else marcarActual();
  avisarDeMas();
}

/** Pinta hasta la letra (si el índice A–Z está activo). Para saltar a una entrada concreta. */
export const asegurarLetra = (letra) => actual?.asegurar(letra);

function marcar(letra) {
  const anterior = barra.querySelector('[aria-current="true"]');
  if (anterior?.dataset.letra === letra) return;
  anterior?.removeAttribute("aria-current");
  const a = letra && barra.querySelector(`a[data-letra="${CSS.escape(letra)}"]`);
  if (!a) return;
  a.setAttribute("aria-current", "true");
  // En móvil la barra se desliza en horizontal: que la letra marcada quede a la vista.
  if (barra.scrollWidth > barra.clientWidth) {
    const izquierda = a.offsetLeft - barra.offsetLeft;
    if (izquierda < barra.scrollLeft || izquierda + a.offsetWidth > barra.scrollLeft + barra.clientWidth) {
      barra.scrollLeft = izquierda - barra.clientWidth / 2 + a.offsetWidth / 2;
    }
  }
}

/** La letra actual es la de la última sección cuyo principio ya ha pasado por debajo de la barra. */
function marcarActual() {
  if (!actual) return;
  const limite = barra.getBoundingClientRect().bottom + 24;
  let letra = null;
  for (const s of actual.contenedor.querySelectorAll("section.letter:not([hidden])")) {
    if (s.getBoundingClientRect().top > limite) break;
    letra = s.dataset.letra;
  }
  marcar(letra);
}

let pendiente = false;
addEventListener("scroll", () => {
  if (pendiente || !actual) return;
  pendiente = true;
  requestAnimationFrame(() => { pendiente = false; marcarActual(); });
}, { passive: true });

barra.addEventListener("click", (e) => {
  const a = e.target instanceof Element && e.target.closest("a[data-letra]");
  if (!a || !actual) return;
  e.preventDefault();
  const letra = a.dataset.letra;
  actual.asegurar(letra);
  document.getElementById(ancla(letra))?.scrollIntoView({ block: "start" });
  marcar(letra);
});
