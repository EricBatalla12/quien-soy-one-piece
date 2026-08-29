import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createCatalog } from '../src/game/catalog.js';
import { projectView } from '../src/game/view.js';
import { answerQuestion, askQuestion, createGame, guess, setSecret } from '../src/game/state.js';
import { createRoom, joinRoom, setConnected, withGame } from '../src/server/rooms.js';

const NOW = 1_000_000;

/** Un catálogo de mentira: la vista no lee el del repositorio. */
const CATALOG = createCatalog([
  { id: 'roronoa-zoro', name: 'Roronoa Zoro' },
  { id: 'nico-robin', name: 'Nico Robin' },
  { id: 'sanji', name: 'Sanji' },
]);

/** El jugador 1 debe adivinar a Nico Robin; el jugador 2, a Roronoa Zoro. */
function playingRoom() {
  const room = joinRoom(createRoom({ code: 'NAKAM', name: 'Eric', token: 't1', now: NOW }), {
    name: 'Nami',
    token: 't2',
    now: NOW,
  });

  let game = setSecret(createGame(), 1, 'roronoa-zoro', CATALOG);
  game = setSecret(game, 2, 'nico-robin', CATALOG);
  return withGame(room, game, NOW);
}

/** Todo lo que el servidor le mandaría a este jugador, tal cual viaja por el cable. */
function wire(room, playerId) {
  return JSON.stringify(projectView(room, playerId, CATALOG));
}

// ---------------------------------------------------------------------------
// Criterio 5 de la v2 y 8 de la v3: el secreto es secreto de verdad, ni como
// nombre ni como identificador
// ---------------------------------------------------------------------------

test('tu personaje no viaja en ningún momento de la partida', () => {
  const room = playingRoom();

  for (const rastro of ['Nico Robin', 'nico-robin']) {
    assert.ok(!wire(room, 1).includes(rastro), `el jugador 1 no puede ver "${rastro}"`);
  }
  for (const rastro of ['Roronoa Zoro', 'roronoa-zoro']) {
    assert.ok(!wire(room, 2).includes(rastro), `el jugador 2 no puede ver "${rastro}"`);
  }
});

test('tu personaje tampoco viaja mientras el rival lo elige', () => {
  const half = withGame(playingRoom(), setSecret(createGame(), 2, 'nico-robin', CATALOG), NOW);

  assert.ok(!wire(half, 1).includes('Nico Robin'));
  assert.ok(!wire(half, 1).includes('nico-robin'));
});

// Criterio 7 de la v3: lo que llega al navegador son nombres, no identificadores.
test('el personaje que elegiste tú lo ves, y con su nombre', () => {
  const view = projectView(playingRoom(), 1, CATALOG);

  assert.equal(view.chosenForRival, 'Roronoa Zoro');
});

test('sabes si el rival ya ha elegido, pero no qué ha elegido', () => {
  const room = playingRoom();
  const empty = joinRoom(createRoom({ code: 'NAKAM', name: 'Eric', token: 't1', now: NOW }), {
    name: 'Nami',
    token: 't2',
    now: NOW,
  });

  assert.equal(projectView(room, 1, CATALOG).rivalHasChosen, true);
  assert.equal(projectView(empty, 1, CATALOG).rivalHasChosen, false);
  assert.equal(projectView(room, 1, CATALOG).yourCharacter, null);
});

test('al terminar se revelan los dos personajes', () => {
  const room = withGame(playingRoom(), guess(playingRoom().game, 1, 'nico-robin', CATALOG), NOW);
  const view = projectView(room, 1, CATALOG);

  assert.equal(view.phase, 'finished');
  assert.equal(view.winner, 1);
  assert.equal(view.yourCharacter, 'Nico Robin');
  assert.equal(view.chosenForRival, 'Roronoa Zoro');
});

test('un intento fallido no revela el personaje, solo lo que se intentó', () => {
  const room = withGame(playingRoom(), guess(playingRoom().game, 1, 'sanji', CATALOG), NOW);
  const view = projectView(room, 1, CATALOG);

  assert.equal(view.phase, 'playing');
  assert.equal(view.yourCharacter, null);
  assert.deepEqual(view.history.at(-1), { kind: 'guess', from: 1, text: 'Sanji', answer: 'no' });
  assert.ok(!wire(room, 1).includes('Nico Robin'));
});

test('un personaje que se cayó del catálogo no deja el historial en blanco', () => {
  const vacio = createCatalog([]);
  const room = withGame(playingRoom(), guess(playingRoom().game, 1, 'sanji', CATALOG), NOW);

  assert.equal(projectView(room, 1, vacio).history.at(-1).text, 'un personaje que ya no está');
});

// ---------------------------------------------------------------------------
// Lo que sí se ve
// ---------------------------------------------------------------------------

test('sin rival la sala está esperando, no en preparación', () => {
  const alone = createRoom({ code: 'NAKAM', name: 'Eric', token: 't1', now: NOW });
  const view = projectView(alone, 1, CATALOG);

  assert.equal(view.phase, 'waiting');
  assert.equal(view.rival, null);
  assert.equal(view.code, 'NAKAM');
});

test('la vista trae los nombres y de quién es el turno', () => {
  const view = projectView(playingRoom(), 2, CATALOG);

  assert.equal(view.you.name, 'Nami');
  assert.equal(view.rival.name, 'Eric');
  assert.equal(view.rival.id, 1);
  assert.equal(view.turn, 1);
});

test('la vista dice si el rival se ha caído', () => {
  const room = setConnected(playingRoom(), 1, false, NOW);

  assert.equal(projectView(room, 2, CATALOG).rival.connected, false);
  assert.equal(projectView(room, 1, CATALOG).rival.connected, true);
});

test('la pregunta pendiente y el historial se ven igual desde los dos lados', () => {
  let game = askQuestion(playingRoom().game, 1, '¿Eres espadachín?');
  const pending = withGame(playingRoom(), game, NOW);
  game = answerQuestion(game, 2, 'sí');
  const answered = withGame(playingRoom(), game, NOW);

  assert.deepEqual(projectView(pending, 1, CATALOG).pendingQuestion, {
    from: 1,
    text: '¿Eres espadachín?',
  });
  assert.deepEqual(projectView(pending, 2, CATALOG).pendingQuestion, projectView(pending, 1, CATALOG).pendingQuestion);
  assert.deepEqual(projectView(answered, 1, CATALOG).history, projectView(answered, 2, CATALOG).history);
  assert.equal(projectView(answered, 1, CATALOG).pendingQuestion, null);
});

test('el marcador se ve entero', () => {
  const room = { ...playingRoom(), score: { 1: 2, 2: 1 } };

  assert.deepEqual(projectView(room, 1, CATALOG).score, { 1: 2, 2: 1 });
});

test('no hay vista de una plaza vacía', () => {
  const alone = createRoom({ code: 'NAKAM', name: 'Eric', token: 't1', now: NOW });

  assert.throws(() => projectView(alone, 2, CATALOG), /libre/);
});

test('el token de nadie sale nunca en la vista', () => {
  assert.ok(!wire(playingRoom(), 1).includes('t2'));
  assert.ok(!wire(playingRoom(), 1).includes('t1'));
});
