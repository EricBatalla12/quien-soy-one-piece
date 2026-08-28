/**
 * Reglas del juego. Capa pura: aquí no se toca el DOM ni el navegador.
 *
 * Cada acción recibe el estado actual y devuelve uno nuevo, sin modificar el que
 * le llega. Si la acción no es válida, lanza un Error con el motivo: la interfaz
 * ya evita ofrecer acciones imposibles, así que estas comprobaciones son la red
 * de seguridad que garantiza que las reglas se cumplen aunque la interfaz falle.
 */

import { isBlank, sameName } from './normalize.js';

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
    secretFor: { 1: null, 2: null }, // personaje que cada jugador debe adivinar
    turn: 1,
    pendingQuestion: null, // { from, text } mientras espera respuesta
    history: [], // { kind, from, text, answer }
    winner: null,
  };
}

/**
 * Un jugador escribe el personaje que su RIVAL deberá adivinar.
 * La partida arranca sola cuando los dos lo han hecho (criterio 2).
 */
export function setSecret(state, player, name) {
  if (state.phase !== 'setup') throw new Error('La preparación ya ha terminado');
  if (isBlank(name)) throw new Error('El personaje no puede estar vacío');

  const rival = opponent(player);
  if (state.secretFor[rival] !== null) throw new Error('Ya has elegido personaje');

  const secretFor = { ...state.secretFor, [rival]: name.trim() };
  const listos = secretFor[1] !== null && secretFor[2] !== null;

  return { ...state, secretFor, phase: listos ? 'playing' : 'setup' };
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
 * El jugador de turno arriesga un nombre.
 * Si acierta gana (criterio 6); si falla, cede el turno y la partida sigue (criterio 7).
 */
export function guess(state, player, name) {
  requireActivePlayer(state, player);
  if (isBlank(name)) throw new Error('El nombre no puede estar vacío');

  const acierta = sameName(name, state.secretFor[player]);
  const history = [
    ...state.history,
    { kind: 'guess', from: player, text: name.trim(), answer: acierta ? 'sí' : 'no' },
  ];

  if (acierta) return { ...state, phase: 'finished', winner: player, history };
  return { ...state, turn: opponent(player), history };
}

/** Vuelve a empezar de cero. */
export function reset() {
  return createGame();
}

/**
 * ¿Este valor tiene forma de estado de partida?
 *
 * El estado nos llega de otra pestaña a través del canal de sincronización, y ahí
 * podría llegar cualquier cosa (una versión vieja del juego, un mensaje corrupto).
 * Antes de pintarlo comprobamos que es lo que esperamos.
 */
export function isValidState(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    ['setup', 'playing', 'finished'].includes(value.phase) &&
    typeof value.secretFor === 'object' &&
    value.secretFor !== null &&
    [1, 2].includes(value.turn) &&
    Array.isArray(value.history) &&
    (value.winner === null || [1, 2].includes(value.winner))
  );
}

/** Comprobaciones comunes a preguntar y arriesgar. */
function requireActivePlayer(state, player) {
  if (state.phase !== 'playing') throw new Error('La partida no está en curso');
  if (state.turn !== player) throw new Error('No es tu turno');
  if (state.pendingQuestion !== null) throw new Error('Hay una pregunta sin responder');
}
