/**
 * Tu sitio en una sala, guardado en la pestaña.
 *
 * El token es lo único que demuestra ante el servidor que esa plaza es tuya, así que
 * vive en `sessionStorage`: es propio de cada pestaña, a diferencia de
 * `localStorage`, que es del navegador entero. Gracias a eso dos pestañas del mismo
 * ordenador siguen siendo dos jugadores distintos, como en la v1.
 *
 * A cambio, cerrar la pestaña pierde el token y con él la plaza hasta que la sala
 * caduque. Está asumido en la sección 7 de la espec v2.
 *
 * El almacén se recibe como parámetro para poder testear esto sin navegador. Todo va
 * envuelto en try/catch porque `sessionStorage` lanza, en vez de devolver nada, si
 * el usuario tiene el almacenamiento desactivado.
 */

const KEY = 'quien-soy/session';

/**
 * Las pistas se guardan por sala, no todas juntas: son posiciones del historial de
 * una partida concreta y en otra sala no significarían nada.
 */
const CLUES_KEY = 'quien-soy/clues';

export function readSession(storage) {
  try {
    const session = JSON.parse(storage.getItem(KEY));
    if (session === null || typeof session !== 'object') return null;
    if (typeof session.code !== 'string' || typeof session.token !== 'string') return null;

    return { code: session.code, token: session.token };
  } catch {
    return null;
  }
}

export function writeSession(storage, session) {
  try {
    storage.setItem(KEY, JSON.stringify(session));
  } catch {
    // Sin almacén se puede jugar igual; solo se pierde la partida al recargar.
  }
}

export function clearSession(storage) {
  try {
    storage.removeItem(KEY);
  } catch {
    // Igual que arriba: no poder olvidar el token no debe romper nada.
  }
}

/**
 * El tablero de pistas de una sala.
 *
 * Recargar no debe perderlo, igual que no pierde la partida. Se comprueba lo que
 * hay guardado porque `sessionStorage` es texto que puede tocar cualquiera: una
 * posición que no sea un número entero rompería el pintado del tablero.
 */
export function readClues(storage, code) {
  try {
    const clues = JSON.parse(storage.getItem(`${CLUES_KEY}/${code}`));
    if (!Array.isArray(clues) || !clues.every(isPosition)) return [];

    return clues;
  } catch {
    return [];
  }
}

export function writeClues(storage, code, clues) {
  try {
    storage.setItem(`${CLUES_KEY}/${code}`, JSON.stringify(clues));
  } catch {
    // Sin almacén se juega igual; solo se pierde el tablero al recargar.
  }
}

export function clearClues(storage, code) {
  try {
    storage.removeItem(`${CLUES_KEY}/${code}`);
  } catch {
    // Igual que arriba.
  }
}

function isPosition(value) {
  return Number.isInteger(value) && value >= 0;
}
