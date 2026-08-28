/**
 * La vista: lo que de la sala puede ver un jugador concreto.
 *
 * En la v1 las dos pestañas tenían el estado entero y el secreto era "de honor":
 * abrir F12 bastaba para leer el personaje del rival. Con servidor eso se arregla
 * aquí, y solo aquí. El servidor nunca envía la sala; envía esto.
 *
 * La regla es una sola y hay un test que la vigila sobre el JSON ya serializado:
 * **el personaje que tú tienes que adivinar no sale de esta función** hasta que la
 * partida termina y ya no hay nada que proteger. El que escribiste tú sí sale: lo
 * escribiste tú.
 */

import { opponent } from './state.js';

export function projectView(room, playerId) {
  const rivalId = opponent(playerId);
  const you = room.players[playerId];
  const rival = room.players[rivalId];

  if (you === null || you === undefined) throw new Error('Esa plaza está libre');

  const game = room.game;
  const isOver = game.phase === 'finished';

  return {
    code: room.code,

    // Sin rival no hay partida que enseñar, aunque las reglas ya estén en 'setup'.
    phase: rival === null ? 'waiting' : game.phase,

    you: { id: playerId, name: you.name },
    rival: rival === null ? null : { id: rivalId, name: rival.name, connected: rival.connected },

    /** El personaje que le tocará adivinar al rival: lo escribiste tú. */
    chosenForRival: game.secretFor[rivalId],

    /** Si el rival ya escribió el tuyo. Solo eso: cuál es, no. */
    rivalHasChosen: game.secretFor[playerId] !== null,

    /** Quién eras. Se revela al terminar y ni un momento antes. */
    yourCharacter: isOver ? game.secretFor[playerId] : null,

    turn: game.turn,
    pendingQuestion: game.pendingQuestion,
    history: game.history,
    winner: isOver ? game.winner : null,
    score: room.score,
  };
}
