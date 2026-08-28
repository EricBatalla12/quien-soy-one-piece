/**
 * Tu tablero de pistas. Capa pura: ni DOM, ni eventos, ni almacén.
 *
 * Es una libreta personal, no parte de la partida: no viaja al servidor, el rival no
 * la ve y no cambia ninguna regla. Por eso vive entera en el cliente.
 *
 * Una pista no guarda el texto de la pregunta, sino **su posición en el historial**.
 * El historial solo crece y nunca se reescribe, así que esa posición identifica a la
 * pregunta para siempre; y cuando llega la revancha y el historial vuelve a estar
 * vacío, las pistas se quedan sin nada a lo que apuntar y el tablero se vacía solo.
 */

/** Tablero recién estrenado. */
export function noClues() {
  return [];
}

/** Guarda una pregunta del historial. Guardarla dos veces no la duplica. */
export function pinClue(clues, index) {
  if (clues.includes(index)) return clues;
  return [...clues, index];
}

export function unpinClue(clues, index) {
  return clues.filter((pinned) => pinned !== index);
}

export function isPinned(clues, index) {
  return clues.includes(index);
}

/**
 * Lleva una pista a otro sitio del tablero.
 *
 * `to` es la posición que ocupará **en el tablero ya sin ella**, que es como se
 * cuenta al arrastrar: se mira entre qué dos pistas de las demás cae el puntero.
 */
export function moveClue(clues, index, to) {
  const rest = clues.filter((pinned) => pinned !== index);
  if (rest.length === clues.length) return clues; // no estaba en el tablero

  const at = Math.max(0, Math.min(to, rest.length));
  return [...rest.slice(0, at), index, ...rest.slice(at)];
}

/**
 * Las pistas que todavía existen, con su pregunta y su respuesta.
 *
 * Las que apuntan a un historial que ya no está —una revancha— se caen aquí, en el
 * único sitio donde se leen, en vez de tener que ir a limpiarlas cuando eso pasa.
 */
export function liveClues(clues, history) {
  return clues
    .filter((index) => index < history.length)
    .map((index) => ({ index, ...history[index] }));
}

/**
 * Entre qué dos pistas cae el puntero, contando solo las demás.
 *
 * Se busca la primera pista que quede a la derecha del puntero dentro de su misma
 * fila o de una posterior; si no hay ninguna, la pista va al final. Con esto vale
 * tanto para una fila como para varias, porque las de filas de más arriba quedan
 * descartadas por la comparación vertical.
 */
export function dropIndex(rects, point) {
  const found = rects.findIndex(
    (rect) => point.y < rect.bottom && point.x < rect.left + rect.width / 2,
  );

  return found === -1 ? rects.length : found;
}
