import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createCatalog } from '../src/game/catalog.js';
import {
  createGame,
  setSecret,
  askQuestion,
  answerQuestion,
  guess,
} from '../src/game/state.js';

/** Un catálogo de mentira: aquí no se lee el del repositorio. */
const CATALOG = createCatalog([
  { id: 'roronoa-zoro', name: 'Roronoa Zoro' },
  { id: 'nico-robin', name: 'Nico Robin' },
  { id: 'sanji', name: 'Sanji' },
]);

/**
 * Partida ya en marcha:
 *   - el jugador 1 debe adivinar a Nico Robin  (lo eligió el jugador 2)
 *   - el jugador 2 debe adivinar a Roronoa Zoro (lo eligió el jugador 1)
 */
function startedGame() {
  let state = createGame();
  state = setSecret(state, 1, 'roronoa-zoro', CATALOG);
  state = setSecret(state, 2, 'nico-robin', CATALOG);
  return state;
}

// ---------------------------------------------------------------------------
// Criterio 2 de la v2: la partida no empieza hasta que los dos han elegido
// ---------------------------------------------------------------------------

test('con un solo personaje elegido la partida sigue en preparación', () => {
  const state = setSecret(createGame(), 1, 'roronoa-zoro', CATALOG);
  assert.equal(state.phase, 'setup');
});

test('cuando los dos han elegido, la partida arranca', () => {
  const state = startedGame();
  assert.equal(state.phase, 'playing');
});

test('el personaje que eliges lo adivina tu rival, no tú', () => {
  const state = startedGame();
  assert.equal(state.secretFor[2], 'roronoa-zoro');
  assert.equal(state.secretFor[1], 'nico-robin');
});

test('la partida guarda el identificador, no el nombre', () => {
  const state = startedGame();
  assert.ok(!JSON.stringify(state.secretFor).includes('Roronoa Zoro'));
});

test('no puedes cambiar tu personaje una vez elegido', () => {
  const state = setSecret(createGame(), 1, 'roronoa-zoro', CATALOG);
  assert.throws(() => setSecret(state, 1, 'sanji', CATALOG), /Ya has elegido/);
});

// ---------------------------------------------------------------------------
// Criterio 5 de la v3: solo se aceptan personajes del catálogo
// ---------------------------------------------------------------------------

test('no se puede elegir un personaje que no esté en el catálogo', () => {
  for (const inventado of ['pepito-grillo', '', null, undefined, 'Roronoa Zoro', '__proto__']) {
    assert.throws(
      () => setSecret(createGame(), 1, inventado, CATALOG),
      /no está en el catálogo/,
      `${String(inventado)} no debería colar`,
    );
  }
});

test('tampoco se puede arriesgar un personaje que no esté en el catálogo', () => {
  assert.throws(() => guess(startedGame(), 1, 'pepito-grillo', CATALOG), /no está en el catálogo/);
});

test('la pregunta no puede estar vacía', () => {
  assert.throws(() => askQuestion(startedGame(), 1, '  '), /no puede estar vacía/);
});

// ---------------------------------------------------------------------------
// Criterio 3 de la v2: un jugador no puede actuar cuando no es su turno
// ---------------------------------------------------------------------------

test('no puedes preguntar si no es tu turno', () => {
  assert.throws(() => askQuestion(startedGame(), 2, '¿Eres espadachín?'), /No es tu turno/);
});

test('no puedes arriesgar si no es tu turno', () => {
  assert.throws(() => guess(startedGame(), 2, 'roronoa-zoro', CATALOG), /No es tu turno/);
});

test('no puedes preguntar dos veces seguidas', () => {
  const state = askQuestion(startedGame(), 1, '¿Eres espadachín?');
  assert.throws(() => askQuestion(state, 1, '¿Y pirata?'), /sin responder/);
});

test('no puedes responder a tu propia pregunta', () => {
  const state = askQuestion(startedGame(), 1, '¿Eres espadachín?');
  assert.throws(() => answerQuestion(state, 1, 'sí'), /tu propia pregunta/);
});

// ---------------------------------------------------------------------------
// Preguntar y responder
// ---------------------------------------------------------------------------

test('responder guarda la pregunta en el historial y pasa el turno', () => {
  let state = askQuestion(startedGame(), 1, '¿Eres espadachín?');
  state = answerQuestion(state, 2, 'a veces');

  assert.equal(state.pendingQuestion, null);
  assert.equal(state.turn, 2, 'quien responde se queda el turno siguiente');
  assert.deepEqual(state.history, [
    { kind: 'question', from: 1, text: '¿Eres espadachín?', answer: 'a veces' },
  ]);
});

test('solo se aceptan las tres respuestas del juego', () => {
  const state = askQuestion(startedGame(), 1, '¿Eres espadachín?');
  assert.throws(() => answerQuestion(state, 2, 'quizá'), /no existe/);
});

test('no se puede responder si nadie ha preguntado', () => {
  assert.throws(() => answerQuestion(startedGame(), 2, 'sí'), /pendiente/);
});

// ---------------------------------------------------------------------------
// Criterios 6 y 7 de la v2, y 6 de la v3: el acierto se decide por identificador
// ---------------------------------------------------------------------------

test('acertar el personaje termina la partida y da la victoria', () => {
  const state = guess(startedGame(), 1, 'nico-robin', CATALOG);
  assert.equal(state.phase, 'finished');
  assert.equal(state.winner, 1);
});

test('fallar cede el turno y la partida continúa', () => {
  const state = guess(startedGame(), 1, 'sanji', CATALOG);
  assert.equal(state.phase, 'playing');
  assert.equal(state.winner, null);
  assert.equal(state.turn, 2);
});

test('el intento fallido queda registrado en el historial, por identificador', () => {
  const state = guess(startedGame(), 1, 'sanji', CATALOG);
  assert.deepEqual(state.history, [
    { kind: 'guess', from: 1, characterId: 'sanji', answer: 'no' },
  ]);
});

test('terminada la partida ya no se puede seguir jugando', () => {
  const state = guess(startedGame(), 1, 'nico-robin', CATALOG);
  assert.throws(() => askQuestion(state, 1, '¿Otra?'), /no está en curso/);
});

// ---------------------------------------------------------------------------
// Garantías generales
// ---------------------------------------------------------------------------

test('las acciones no modifican el estado que reciben', () => {
  const before = startedGame();
  const copy = structuredClone(before);
  askQuestion(before, 1, '¿Eres espadachín?');
  assert.deepEqual(before, copy);
});

test('la partida no guarda nada del rival que no vaya a verse', () => {
  const state = startedGame();
  assert.deepEqual(Object.keys(state.secretFor), ['1', '2']);
});
