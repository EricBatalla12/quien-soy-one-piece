import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  createGame,
  setSecret,
  askQuestion,
  answerQuestion,
  guess,
  reset,
  isValidState,
} from '../src/game/state.js';

/**
 * Partida ya en marcha:
 *   - el jugador 1 debe adivinar "Nico Robin" (lo escribió el jugador 2)
 *   - el jugador 2 debe adivinar "Zoro"       (lo escribió el jugador 1)
 */
function partidaEmpezada() {
  let state = createGame();
  state = setSecret(state, 1, 'Zoro');
  state = setSecret(state, 2, 'Nico Robin');
  return state;
}

// ---------------------------------------------------------------------------
// Criterio 2: la partida no empieza hasta que los dos han escrito su personaje
// ---------------------------------------------------------------------------

test('con un solo personaje escrito la partida sigue en preparación', () => {
  const state = setSecret(createGame(), 1, 'Zoro');
  assert.equal(state.phase, 'setup');
});

test('cuando los dos han escrito, la partida arranca', () => {
  const state = partidaEmpezada();
  assert.equal(state.phase, 'playing');
});

test('el personaje que escribes lo adivina tu rival, no tú', () => {
  const state = partidaEmpezada();
  assert.equal(state.secretFor[2], 'Zoro');
  assert.equal(state.secretFor[1], 'Nico Robin');
});

test('no puedes cambiar tu personaje una vez escrito', () => {
  const state = setSecret(createGame(), 1, 'Zoro');
  assert.throws(() => setSecret(state, 1, 'Sanji'), /Ya has elegido/);
});

// ---------------------------------------------------------------------------
// Criterio 9: no se puede enviar una pregunta ni un personaje vacío
// ---------------------------------------------------------------------------

test('el personaje no puede estar vacío', () => {
  assert.throws(() => setSecret(createGame(), 1, '   '), /no puede estar vacío/);
});

test('la pregunta no puede estar vacía', () => {
  assert.throws(() => askQuestion(partidaEmpezada(), 1, '  '), /no puede estar vacía/);
});

test('el nombre que arriesgas no puede estar vacío', () => {
  assert.throws(() => guess(partidaEmpezada(), 1, ''), /no puede estar vacío/);
});

// ---------------------------------------------------------------------------
// Criterio 3: un jugador no puede actuar cuando no es su turno
// ---------------------------------------------------------------------------

test('no puedes preguntar si no es tu turno', () => {
  assert.throws(() => askQuestion(partidaEmpezada(), 2, '¿Eres espadachín?'), /No es tu turno/);
});

test('no puedes arriesgar si no es tu turno', () => {
  assert.throws(() => guess(partidaEmpezada(), 2, 'Zoro'), /No es tu turno/);
});

test('no puedes preguntar dos veces seguidas', () => {
  const state = askQuestion(partidaEmpezada(), 1, '¿Eres espadachín?');
  assert.throws(() => askQuestion(state, 1, '¿Y pirata?'), /sin responder/);
});

test('no puedes responder a tu propia pregunta', () => {
  const state = askQuestion(partidaEmpezada(), 1, '¿Eres espadachín?');
  assert.throws(() => answerQuestion(state, 1, 'sí'), /tu propia pregunta/);
});

// ---------------------------------------------------------------------------
// Preguntar y responder
// ---------------------------------------------------------------------------

test('responder guarda la pregunta en el historial y pasa el turno', () => {
  let state = askQuestion(partidaEmpezada(), 1, '¿Eres espadachín?');
  state = answerQuestion(state, 2, 'a veces');

  assert.equal(state.pendingQuestion, null);
  assert.equal(state.turn, 2, 'quien responde se queda el turno siguiente');
  assert.deepEqual(state.history, [
    { kind: 'question', from: 1, text: '¿Eres espadachín?', answer: 'a veces' },
  ]);
});

test('solo se aceptan las tres respuestas del juego', () => {
  const state = askQuestion(partidaEmpezada(), 1, '¿Eres espadachín?');
  assert.throws(() => answerQuestion(state, 2, 'quizá'), /no existe/);
});

test('no se puede responder si nadie ha preguntado', () => {
  assert.throws(() => answerQuestion(partidaEmpezada(), 2, 'sí'), /pendiente/);
});

// ---------------------------------------------------------------------------
// Criterios 6 y 7: arriesgar bien gana; arriesgar mal cede el turno
// ---------------------------------------------------------------------------

test('acertar el personaje termina la partida y da la victoria', () => {
  const state = guess(partidaEmpezada(), 1, 'Nico Robin');
  assert.equal(state.phase, 'finished');
  assert.equal(state.winner, 1);
});

test('fallar cede el turno y la partida continúa', () => {
  const state = guess(partidaEmpezada(), 1, 'Sanji');
  assert.equal(state.phase, 'playing');
  assert.equal(state.winner, null);
  assert.equal(state.turn, 2);
});

test('el intento fallido queda registrado en el historial', () => {
  const state = guess(partidaEmpezada(), 1, 'Sanji');
  assert.deepEqual(state.history, [{ kind: 'guess', from: 1, text: 'Sanji', answer: 'no' }]);
});

// Criterio 8, ya en su contexto real
test('se acierta aunque se escriba con otras mayúsculas, acentos y espacios', () => {
  const state = guess(partidaEmpezada(), 1, '  NICO   ROBÍN ');
  assert.equal(state.winner, 1);
});

test('terminada la partida ya no se puede seguir jugando', () => {
  const state = guess(partidaEmpezada(), 1, 'Nico Robin');
  assert.throws(() => askQuestion(state, 1, '¿Otra?'), /no está en curso/);
});

// ---------------------------------------------------------------------------
// Garantías generales
// ---------------------------------------------------------------------------

test('las acciones no modifican el estado que reciben', () => {
  const antes = partidaEmpezada();
  const copia = structuredClone(antes);
  askQuestion(antes, 1, '¿Eres espadachín?');
  assert.deepEqual(antes, copia);
});

test('reiniciar devuelve una partida nueva', () => {
  assert.deepEqual(reset(), createGame());
});

test('isValidState acepta un estado bueno y rechaza basura', () => {
  assert.ok(isValidState(createGame()));
  assert.ok(!isValidState(null));
  assert.ok(!isValidState('hola'));
  assert.ok(!isValidState({ phase: 'inventada', turn: 1, history: [], secretFor: {}, winner: null }));
  assert.ok(!isValidState({ phase: 'playing', turn: 7, history: [], secretFor: {}, winner: null }));
});
