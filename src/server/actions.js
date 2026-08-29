/**
 * Las acciones de dentro de una sala: del mensaje a la partida.
 *
 * Aquí se junta lo que ya sabían hacer las otras capas y no se decide nada nuevo.
 * Las reglas de la partida las hace cumplir el servidor, así que un jugador no puede
 * saltárselas mandando la acción a mano por el WebSocket (criterio 4 de la v2). El
 * catálogo viaja hasta las reglas por la misma razón: elegir un personaje que no
 * existe también es saltárselas (criterio 5 de la v3).
 */

import { answerQuestion, askQuestion, guess, setSecret } from '../game/state.js';
import { isFull, rematch, withGame } from './rooms.js';

export function applyAction(room, playerId, message, now, catalog) {
  if (!isFull(room)) throw new Error('Espera a que entre tu rival');

  switch (message.type) {
    case 'secret':
      return withGame(room, setSecret(room.game, playerId, message.characterId, catalog), now);
    case 'ask':
      return withGame(room, askQuestion(room.game, playerId, message.text), now);
    case 'answer':
      return withGame(room, answerQuestion(room.game, playerId, message.answer), now);
    case 'guess':
      return withGame(room, guess(room.game, playerId, message.characterId, catalog), now);
    case 'rematch':
      return rematch(room, now);
    default:
      throw new Error('Esa acción no existe');
  }
}
