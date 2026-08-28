/**
 * Dónde dejar el desplazamiento del historial después de repintar.
 *
 * La interfaz repinta la pantalla entera con cada mensaje del servidor, así que el
 * historial vuelve a empezar arriba y perderías de vista lo último. Aquí se decide a
 * qué altura dejarlo, con una regla prestada de cualquier chat:
 *
 * - si estabas al final, sigues al final y ves llegar lo nuevo;
 * - si habías subido a releer algo, te quedas donde estabas.
 *
 * Es una función pura sobre dos medidas, así que se testea sin navegador.
 */

/** Margen para dar por bueno que estabas "al final": nadie afina al píxel. */
export const BOTTOM_TOLERANCE_PX = 24;

export function nextScrollTop(before, after, tolerance = BOTTOM_TOLERANCE_PX) {
  // Todavía no había historial: se empieza por lo último, que es lo que importa.
  if (before === null) return after.scrollHeight;

  const wasAtBottom = before.scrollHeight - before.clientHeight - before.scrollTop <= tolerance;
  if (wasAtBottom) return after.scrollHeight;

  return Math.max(0, Math.min(before.scrollTop, after.scrollHeight - after.clientHeight));
}
