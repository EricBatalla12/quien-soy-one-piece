/**
 * El selector de personaje: lo que se ha escrito y lo que se ha elegido.
 *
 * Capa pura, como `clues.js`: ni DOM, ni red. Vive en el cliente porque no es parte
 * de la partida —el servidor no sabe que existe— sino de cómo se elige. Buscar es
 * cosa del catálogo (`search`); esto solo lleva la cuenta de en qué punto está el
 * jugador: qué ha escrito, cuál lleva señalada con el teclado y cuál ha elegido.
 *
 * Hasta que hay una elegida no se puede confirmar (criterio 1 de la v3), y por eso
 * `chosenId` es lo único que mira quien manda la acción.
 */

/** Ni escrito ni elegido. Es como empieza y como se queda después de confirmar. */
export function noPicker() {
  return { query: '', chosenId: null, highlight: 0 };
}

/**
 * Se ha escrito en el buscador.
 *
 * Escribir desdice lo elegido: si ya habías elegido a alguien y vuelves a escribir,
 * es que no era ese.
 */
export function searching(query) {
  return { query: typeof query === 'string' ? query : '', chosenId: null, highlight: 0 };
}

/** Se ha elegido un personaje: el buscador se calla y queda el nombre. */
export function chosen(characterId) {
  return { query: '', chosenId: characterId, highlight: 0 };
}

/** ¿Se puede ya confirmar? */
export function isChosen(picker) {
  return picker.chosenId !== null;
}

/**
 * Sube o baja por los resultados con el teclado (criterio 13 de la v3).
 *
 * Se queda en los extremos en vez de dar la vuelta: pasarse de largo sin querer y
 * aparecer al otro lado de la lista despista más de lo que ayuda.
 */
export function moveHighlight(picker, step, count) {
  return { ...picker, highlight: clamp(picker.highlight + step, count) };
}

/**
 * Cuál está señalada ahora mismo, o `null` si no hay resultados.
 *
 * Se recorta contra los resultados de este momento porque la lista cambia con cada
 * tecla: lo que era el cuarto resultado deja de existir en cuanto se escribe una
 * letra más.
 */
export function highlighted(picker, matches) {
  if (matches.length === 0) return null;
  return matches[clamp(picker.highlight, matches.length)];
}

function clamp(index, count) {
  if (count <= 0) return 0;
  return Math.min(Math.max(index, 0), count - 1);
}
