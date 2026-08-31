/**
 * La vista: lo que de la sala puede ver un jugador concreto.
 *
 * En la v1 las dos pestañas tenían el estado entero y el secreto era "de honor":
 * abrir F12 bastaba para leer el personaje del rival. Con servidor eso se arregla
 * aquí, y solo aquí. El servidor nunca envía la sala; envía esto.
 *
 * La regla es una sola y hay un test que la vigila sobre el JSON ya serializado:
 * **el personaje que tú tienes que adivinar no sale de esta función** hasta que la
 * partida termina y ya no hay nada que proteger, ni como nombre ni como
 * identificador (criterio 8 de la v3). El que elegiste tú sí sale: lo elegiste tú.
 *
 * Desde la v3 la partida guarda identificadores, pero aquí salen ya resueltos a
 * nombres: el navegador pinta el historial tal cual, sin tener que cruzar nada.
 */

import { findAnime } from './animes.js';
import { opponent } from './state.js';

export function projectView(room, playerId, catalog) {
  const rivalId = opponent(playerId);
  const you = room.players[playerId];
  const rival = room.players[rivalId];

  if (you === null || you === undefined) throw new Error('Esa plaza está libre');

  const game = room.game;
  const isOver = game.phase === 'finished';

  return {
    code: room.code,

    /**
     * De qué anime es la sala. No es un secreto —es lo que los dos están mirando— y
     * el navegador lo necesita para dos cosas: pedir el catálogo correcto y vestirse
     * con su emblema y sus colores.
     */
    anime: { id: room.anime, name: findAnime(room.anime)?.name ?? room.anime },

    // Sin rival no hay partida que enseñar, aunque las reglas ya estén en 'setup'.
    phase: rival === null ? 'waiting' : game.phase,

    you: { id: playerId, name: you.name },
    rival: rival === null ? null : { id: rivalId, name: rival.name, connected: rival.connected },

    /** El personaje que le tocará adivinar al rival: lo elegiste tú. */
    chosenForRival: catalog.nameOf(game.secretFor[rivalId]),

    /** Si el rival ya eligió el tuyo. Solo eso: cuál es, no. */
    rivalHasChosen: game.secretFor[playerId] !== null,

    /** Quién eras. Se revela al terminar y ni un momento antes. */
    yourCharacter: isOver ? catalog.nameOf(game.secretFor[playerId]) : null,

    turn: game.turn,
    pendingQuestion: game.pendingQuestion,
    history: game.history.map((entry) => showEntry(entry, catalog)),
    winner: isOver ? game.winner : null,
    score: room.score,
  };
}

/**
 * Una entrada del historial como se enseña.
 *
 * Las preguntas ya son texto. Los intentos guardan el identificador de lo que se
 * arriesgó, y aquí se cambia por el nombre: el identificador no le sirve de nada al
 * navegador y no tiene por qué viajar. Un personaje que ya no esté en el catálogo
 * —porque se regeneró a mitad de partida— se enseña como lo que es: un desconocido.
 */
function showEntry(entry, catalog) {
  if (entry.kind !== 'guess') return entry;

  return {
    kind: 'guess',
    from: entry.from,
    text: catalog.nameOf(entry.characterId) ?? 'un personaje que ya no está',
    answer: entry.answer,
  };
}
