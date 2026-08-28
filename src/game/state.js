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
 * Combina el estado local con el que llega de la otra pestaña.
 *
 * En la preparación NO hay turnos: los dos jugadores escriben su personaje a la
 * vez, cada uno partiendo de un estado en el que el otro todavía no había escrito.
 * Quedarse con el que llega perdería una de las dos escrituras, así que ahí hay
 * que combinar. Como la combinación no depende de quién la haga, las dos pestañas
 * llegan al mismo resultado por su cuenta.
 *
 * Fuera de la preparación sí hay turnos estrictos, solo actúa un jugador cada vez
 * y el estado que llega siempre es el más reciente.
 */
export function reconcile(local, remote) {
  if (local.phase !== 'setup' || remote.phase !== 'setup') return remote;

  const secretFor = {
    1: local.secretFor[1] ?? remote.secretFor[1],
    2: local.secretFor[2] ?? remote.secretFor[2],
  };
  const listos = secretFor[1] !== null && secretFor[2] !== null;

  return { ...local, secretFor, phase: listos ? 'playing' : 'setup' };
}

/**
 * ¿Este valor tiene forma de estado de partida?
 *
 * El estado nos llega de otra pestaña a través del canal de sincronización, y ahí
 * podría llegar cualquier cosa: una versión vieja del juego, un mensaje corrupto,
 * o —al estar publicado en GitHub Pages, donde todos los proyectos comparten
 * origen— otra página que escriba en el mismo canal. Se comprueba entero, incluido
 * lo que va dentro del historial: un solo campo inesperado ahí bastaría para
 * romper el pintado y dejar la pestaña colgada.
 */
export function isValidState(value) {
  return (
    isObject(value) &&
    ['setup', 'playing', 'finished'].includes(value.phase) &&
    isValidSecrets(value.secretFor) &&
    [1, 2].includes(value.turn) &&
    isValidPending(value.pendingQuestion) &&
    Array.isArray(value.history) &&
    value.history.every(isValidEntry) &&
    (value.winner === null || [1, 2].includes(value.winner))
  );
}

function isObject(value) {
  return value !== null && typeof value === 'object';
}

function isValidSecrets(secretFor) {
  if (!isObject(secretFor)) return false;
  return [1, 2].every((id) => secretFor[id] === null || typeof secretFor[id] === 'string');
}

function isValidPending(pending) {
  if (pending === null) return true;
  return isObject(pending) && [1, 2].includes(pending.from) && typeof pending.text === 'string';
}

function isValidEntry(entry) {
  return (
    isObject(entry) &&
    ['question', 'guess'].includes(entry.kind) &&
    [1, 2].includes(entry.from) &&
    typeof entry.text === 'string' &&
    ANSWERS.includes(entry.answer)
  );
}

/** Comprobaciones comunes a preguntar y arriesgar. */
function requireActivePlayer(state, player) {
  if (state.phase !== 'playing') throw new Error('La partida no está en curso');
  if (state.turn !== player) throw new Error('No es tu turno');
  if (state.pendingQuestion !== null) throw new Error('Hay una pregunta sin responder');
}
