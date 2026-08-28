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
 */

import { isValidState } from '../game/state.js';

const CHANNEL_NAME = 'quien-soy-one-piece';
const IDENTITY_KEY = 'playerId';

/** Cuánto esperamos a que las otras pestañas digan quiénes son. */
const PRESENCE_WINDOW_MS = 200;

/**
 * Se conecta al canal y averigua qué jugador es esta pestaña.
 *
 * Al arrancar preguntamos "¿quién hay?" y las pestañas que ya estaban responden con
 * su número y con la partida en curso. Con eso resolvemos dos cosas de una vez:
 * cogemos un número libre, y una pestaña recargada recupera la partida en lugar de
 * quedarse en blanco.
 *
 * Devuelve `playerId: null` si ya hay dos jugadores: esta pestaña sobra.
 */
export async function connect({ onRemoteState }) {
  const channel = new BroadcastChannel(CHANNEL_NAME);

  let playerId = null;
  let currentState = null;
  const presence = [];

  channel.addEventListener('message', (event) => {
    const message = event.data;
    if (message === null || typeof message !== 'object') return;

    switch (message.type) {
      case 'whois':
        // Alguien acaba de entrar: le decimos quiénes somos y cómo va la partida.
        channel.postMessage({ type: 'iam', playerId, state: currentState });
        break;

      case 'iam':
        presence.push(message);
        break;

      case 'state':
        // Llega de otra pestaña, así que no nos fiamos de su forma.
        if (!isValidState(message.state)) return;
        currentState = message.state;
        onRemoteState(message.state);
        break;
    }
  });

  channel.postMessage({ type: 'whois' });
  await sleep(PRESENCE_WINDOW_MS);

  const taken = new Set(presence.map((m) => m.playerId).filter(isPlayerNumber));
  playerId = choosePlayerId(taken);
  if (playerId !== null) sessionStorage.setItem(IDENTITY_KEY, String(playerId));

  // Si alguna pestaña nos ha pasado una partida en curso, la adoptamos.
  currentState = presence.map((m) => m.state).find(isValidState) ?? null;

  return {
    playerId,
    initialState: currentState,

    /** Difunde el estado a la otra pestaña. */
    publish(state) {
      currentState = state;
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
 * `sessionStorage` es por pestaña (a diferencia de `localStorage`, que es
 * compartido), así que al recargar recuperamos el mismo número que teníamos.
 */
function choosePlayerId(taken) {
  const remembered = Number(sessionStorage.getItem(IDENTITY_KEY));
  if (isPlayerNumber(remembered) && !taken.has(remembered)) return remembered;

  return [1, 2].find((id) => !taken.has(id)) ?? null;
}

function isPlayerNumber(value) {
  return value === 1 || value === 2;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
