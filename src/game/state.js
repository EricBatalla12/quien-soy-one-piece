/**
 * Reglas del juego. Capa pura: aquí no se toca el DOM ni el navegador.
 *
 * Corren en el servidor, que es quien las hace cumplir desde la v2. El navegador ya
 * no las aplica: manda la acción y pinta lo que le contesten.
 *
 * Cada acción recibe el estado actual y devuelve uno nuevo, sin modificar el que
 * le llega. Si la acción no es válida, lanza un Error con el motivo: la interfaz
 * ya evita ofrecer acciones imposibles, así que estas comprobaciones son la red
 * de seguridad que garantiza que las reglas se cumplen aunque la interfaz falle.
 */

import { isBlank } from './normalize.js';

/** Las tres respuestas posibles a una pregunta. */
export const ANSWERS = ['sí', 'no', 'a veces'];

/** El rival de un jugador. */
export function opponent(player) {
  return player === 1 ? 2 : 1;
}

/** Estado inicial: partida recién creada, nadie ha escrito su personaje. */
export function createGame() {
  return {
    phase: 'setup', // 'setup' | 'playing' | 'finished'
    secretFor: { 1: null, 2: null }, // identificador del personaje que cada uno adivina
    turn: 1,
    pendingQuestion: null, // { from, text } mientras espera respuesta
    history: [], // { kind: 'question', from, text, answer } | { kind: 'guess', from, characterId, answer }
    winner: null,
  };
}

/**
 * Un jugador elige el personaje que su RIVAL deberá adivinar.
 * La partida arranca sola cuando los dos lo han hecho (criterio 2 de la v2).
 *
 * Lo que se guarda es el identificador, no el nombre: así "Luffy" y "Monkey D. Luffy"
 * dejan de ser dos personajes distintos (sección 1 de la espec v3).
 */
export function setSecret(state, player, characterId, catalog) {
  if (state.phase !== 'setup') throw new Error('La preparación ya ha terminado');
  requireCharacter(catalog, characterId);

  const rivalId = opponent(player);
  if (state.secretFor[rivalId] !== null) throw new Error('Ya has elegido personaje');

  const secretFor = { ...state.secretFor, [rivalId]: characterId };
  const bothReady = secretFor[1] !== null && secretFor[2] !== null;

  return { ...state, secretFor, phase: bothReady ? 'playing' : 'setup' };
}

/** El jugador de turno hace una pregunta al rival. */
export function askQuestion(state, player, text) {
  requireActivePlayer(state, player);
  if (isBlank(text)) throw new Error('La pregunta no puede estar vacía');

  return { ...state, pendingQuestion: { from: player, text: text.trim() } };
}

/**
 * El rival responde. Al responder, el turno pasa a ser suyo: así se alternan.
 */
export function answerQuestion(state, player, answer) {
  if (state.phase !== 'playing') throw new Error('La partida no está en curso');

  const pending = state.pendingQuestion;
  if (pending === null) throw new Error('No hay ninguna pregunta pendiente');
  if (pending.from === player) throw new Error('No puedes responder a tu propia pregunta');
  if (!ANSWERS.includes(answer)) throw new Error('Esa respuesta no existe');

  return {
    ...state,
    pendingQuestion: null,
    history: [...state.history, { kind: 'question', from: pending.from, text: pending.text, answer }],
    turn: player,
  };
}

/**
 * El jugador de turno arriesga un personaje del catálogo.
 * Si acierta gana (criterio 6); si falla, cede el turno y la partida sigue (criterio 7).
 *
 * El acierto se decide comparando identificadores: ya no se puede fallar por escribir
 * mal un nombre, solo por equivocarse de personaje, que es de lo que va el juego.
 */
export function guess(state, player, characterId, catalog) {
  requireActivePlayer(state, player);
  requireCharacter(catalog, characterId);

  const isRight = characterId === state.secretFor[player];
  const history = [
    ...state.history,
    { kind: 'guess', from: player, characterId, answer: isRight ? 'sí' : 'no' },
  ];

  if (isRight) return { ...state, phase: 'finished', winner: player, history };
  return { ...state, turn: opponent(player), history };
}

/**
 * El catálogo es cerrado y el servidor solo acepta lo que hay en él, aunque la acción
 * llegue escrita a mano por el WebSocket (criterio 5 de la v3).
 */
function requireCharacter(catalog, characterId) {
  if (!catalog.has(characterId)) throw new Error('Ese personaje no está en el catálogo');
}

/** Comprobaciones comunes a preguntar y arriesgar. */
function requireActivePlayer(state, player) {
  if (state.phase !== 'playing') throw new Error('La partida no está en curso');
  if (state.turn !== player) throw new Error('No es tu turno');
  if (state.pendingQuestion !== null) throw new Error('Hay una pregunta sin responder');
}
