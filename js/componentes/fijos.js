// Lo que queda fijo en pantalla: la altura de la barra de filtros y de la de letras
// (para que los saltos a una letra no queden tapados) y la flecha para volver arriba.
const raiz = document.documentElement;
const controles = document.querySelector(".controls");
const letras = document.querySelector("#letters");
const subir = document.querySelector("#subir");

function medir() {
  // En móvil la barra de filtros no es fija: no cuenta.
  const fija = getComputedStyle(controles).position === "sticky";
  raiz.style.setProperty("--alto-controles", `${fija ? controles.offsetHeight : 0}px`);
  raiz.style.setProperty("--alto-letras", `${letras.offsetHeight}px`);
}

export function vigilarFijos() {
  const ro = new ResizeObserver(medir);
  ro.observe(controles);
  ro.observe(letras);
  addEventListener("resize", medir);
  medir();

  // La flecha aparece cuando ya has bajado algo más de una pantalla.
  let visible = false;
  const actualizar = () => {
    const toca = scrollY > innerHeight * 1.2;
    if (toca !== visible) subir.classList.toggle("visible", (visible = toca));
  };
  addEventListener("scroll", actualizar, { passive: true });
  actualizar();

  const sinAnimaciones = matchMedia("(prefers-reduced-motion: reduce)");
  subir.addEventListener("click", () => {
    scrollTo({ top: 0, behavior: sinAnimaciones.matches ? "auto" : "smooth" });
  });
}
