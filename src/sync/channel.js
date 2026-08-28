/**
 * Sincronización entre las dos pestañas.
 *
 * Es la única capa que sabe que los jugadores están en pestañas distintas. Todo lo
 * demás (las reglas y la interfaz) trabaja con un estado normal y corriente. El día
 * que exista una v2 con servidor, se reescribe este fichero y nada más.
 *
 * OJO: esto no funciona abriendo el HTML con file://. Los navegadores dan un origen
 * opaco a los ficheros locales y BroadcastChannel deja de conectar las pestañas.
 * Hay que servir por HTTP (`npm run dev`).
 *
 * ## El protocolo
 *
 * Solo hay tres mensajes, y ninguna pestaña manda sobre las demás:
 *
 * | Mensaje  | Quién lo manda        | Contenido            | Qué provoca                       |
 * |----------|-----------------------|----------------------|-----------------------------------|
 * | `whois`  | Quien acaba de entrar | nada                 | Que las demás se presenten        |
 * | `iam`    | Quien ya estaba       | su número y la partida | Reparte números y pasa la partida |
 * | `state`  | Quien acaba de jugar  | la partida entera    | Las demás la adoptan              |
 *
 * `whois`/`iam` solo se usan al arrancar; a partir de ahí todo son `state`.
 * La partida no la guarda esta capa: se pide con `getState()` a quien la tiene, para
 * que no existan dos copias que haya que mantener a mano en sintonía.
 */

import { isValidState } from '../game/state.js';

/**
 * Publicado en GitHub Pages, TODOS los proyectos de una cuenta comparten el mismo
 * origen (usuario.github.io), y con él los canales. Un nombre específico evita
 * chocar por accidente con otro proyecto; lo que protege de verdad frente a un
 * mensaje hostil es validar el estado antes de aceptarlo, no el nombre.
 */
const CHANNEL_NAME = 'quien-soy-one-piece/v1';
const IDENTITY_KEY = 'playerId';

/**
 * Cuánto se espera a que las otras pestañas contesten al `whois`.
 *
 * Es el único número arbitrario del fichero y tiene dos lados: cuanto más corto,
 * antes empieza a jugarse, pero más probable es que dos pestañas abiertas casi a la
 * vez no lleguen a verse y las dos se crean el jugador 1 (limitación asumida en la
 * sección 7 de la espec). Los mensajes entre pestañas del mismo navegador tardan
 * menos de un milisegundo, así que 200 va sobradísimo para el caso real.
 */
const PRESENCE_WINDOW_MS = 200;

/**
 * Se conecta al canal y averigua qué jugador es esta pestaña.
 *
 * Al arrancar preguntamos "¿quién hay?" y las pestañas que ya estaban responden con
 * su número y con la partida en curso. Con eso resolvemos dos cosas de una vez:
 * cogemos un número libre, y una pestaña recargada recupera la partida en lugar de
 * quedarse en blanco.
 *
 * `getState()` devuelve la partida tal y como la ve quien nos llama; se le pregunta
 * cada vez que hay que enseñársela a alguien, en lugar de guardar aquí una segunda
 * copia que se iría desincronizando.
 *
 * Devuelve `playerId: null` si ya hay dos jugadores: esta pestaña sobra.
 */
export async function connect({ onRemoteState, getState }) {
  const channel = new BroadcastChannel(CHANNEL_NAME);

  let playerId = null;
  const presence = [];

  channel.addEventListener('message', (event) => {
    const message = event.data;
    if (message === null || typeof message !== 'object') return;

    switch (message.type) {
      case 'whois':
        // Alguien acaba de entrar: le decimos quiénes somos y cómo va la partida.
        channel.postMessage({ type: 'iam', playerId, state: getState() });
        break;

      case 'iam':
        presence.push(message);
        break;

      case 'state':
        // Llega de otra pestaña, así que no nos fiamos de su forma.
        if (!isValidState(message.state)) return;
        onRemoteState(message.state);
        break;
    }
  });

  channel.postMessage({ type: 'whois' });
  await sleep(PRESENCE_WINDOW_MS);

  const taken = new Set(presence.map((m) => m.playerId).filter(isPlayerNumber));
  playerId = choosePlayerId(taken, Number(sessionStorage.getItem(IDENTITY_KEY)));
  if (playerId !== null) sessionStorage.setItem(IDENTITY_KEY, String(playerId));

  return {
    playerId,

    /** La partida que nos haya pasado alguna pestaña, si es que había alguna. */
    initialState: presence.map((m) => m.state).find(isValidState) ?? null,

    /** Difunde el estado a la otra pestaña. */
    publish(state) {
      channel.postMessage({ type: 'state', state });
    },

    close() {
      channel.close();
    },
  };
}

/**
 * Elige número de jugador entre los que quedan libres.
 *
 * `remembered` es el número que esta pestaña ya tenía, guardado en `sessionStorage`
 * —que es por pestaña, a diferencia de `localStorage`, que es compartido—, para que
 * al recargar se recupere el mismo. Se recibe como parámetro en vez de leerlo aquí
 * para que la función sea pura y se pueda testear fuera del navegador.
 */
export function choosePlayerId(taken, remembered) {
  if (isPlayerNumber(remembered) && !taken.has(remembered)) return remembered;

  return [1, 2].find((id) => !taken.has(id)) ?? null;
}

function isPlayerNumber(value) {
  return value === 1 || value === 2;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
