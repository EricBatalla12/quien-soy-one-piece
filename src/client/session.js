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
