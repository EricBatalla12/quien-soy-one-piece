import { test } from 'node:test';
import assert from 'node:assert/strict';

import { applyAction } from '../src/server/actions.js';
import { createRoom, joinRoom, withGame } from '../src/server/rooms.js';
import { createCatalog } from '../src/game/catalog.js';
import { createGame, guess, setSecret } from '../src/game/state.js';

const NOW = 1_000_000;

/** Un catálogo de mentira: estas reglas no leen el del repositorio. */
const CATALOG = createCatalog([
  { id: 'roronoa-zoro', name: 'Roronoa Zoro' },
  { id: 'nico-robin', name: 'Nico Robin' },
  { id: 'sanji', name: 'Sanji' },
]);

function fullRoom() {
  return joinRoom(createRoom({ code: 'NAKAM', name: 'Eric', token: 't1', world: 'one-piece', now: NOW }), {
    name: 'Nami',
    token: 't2',
    now: NOW,
  });
}

/** El jugador 1 debe adivinar a Nico Robin; el jugador 2, a Roronoa Zoro. */
function playingRoom() {
  let game = setSecret(createGame(), 1, 'roronoa-zoro', CATALOG);
  game = setSecret(game, 2, 'nico-robin', CATALOG);
  return withGame(fullRoom(), game, NOW);
}

/** Como lo llama el lobby: con el catálogo detrás. */
function act(room, playerId, message, now = NOW) {
  return applyAction(room, playerId, message, now, CATALOG);
}

test('elegir personaje y preguntar avanzan la partida', () => {
  let room = act(fullRoom(), 1, { type: 'secret', characterId: 'roronoa-zoro' });
  room = act(room, 2, { type: 'secret', characterId: 'nico-robin' });

  assert.equal(room.game.phase, 'playing');

  room = act(room, 1, { type: 'ask', text: '¿Eres espadachín?' });
  assert.equal(room.game.pendingQuestion.text, '¿Eres espadachín?');

  room = act(room, 2, { type: 'answer', answer: 'sí' });
  assert.equal(room.game.history.at(-1).answer, 'sí');
  assert.equal(room.game.turn, 2, 'responder te da el turno');
});

// ---------------------------------------------------------------------------
// Criterio 4 de la v2 y 5 de la v3: las reglas —y el catálogo— las hace cumplir el
// servidor, no la interfaz
// ---------------------------------------------------------------------------

test('no puedes actuar fuera de tu turno aunque mandes la acción a mano', () => {
  const room = playingRoom();

  assert.throws(() => act(room, 2, { type: 'ask', text: '¿Soy pirata?' }), /turno/);
  assert.throws(() => act(room, 2, { type: 'guess', characterId: 'roronoa-zoro' }), /turno/);
});

test('un personaje inventado se rechaza aunque la acción se mande a mano', () => {
  assert.throws(
    () => act(fullRoom(), 1, { type: 'secret', characterId: 'pepito-grillo' }),
    /no está en el catálogo/,
  );
  assert.throws(
    () => act(playingRoom(), 1, { type: 'guess', characterId: 'pepito-grillo' }),
    /no está en el catálogo/,
  );
});

test('no puedes responderte a ti mismo', () => {
  const asked = act(playingRoom(), 1, { type: 'ask', text: '¿Eres pirata?' });

  assert.throws(() => act(asked, 1, { type: 'answer', answer: 'sí' }), /tu propia/);
});

test('no se juega hasta que hay rival', () => {
  const alone = createRoom({ code: 'NAKAM', name: 'Eric', token: 't1', world: 'one-piece', now: NOW });

  assert.throws(() => act(alone, 1, { type: 'secret', characterId: 'roronoa-zoro' }), /rival/);
});

test('acertar termina la partida y suma al marcador', () => {
  const room = act(playingRoom(), 1, { type: 'guess', characterId: 'nico-robin' });

  assert.equal(room.game.phase, 'finished');
  assert.equal(room.game.winner, 1);
  assert.deepEqual(room.score, { 1: 1, 2: 0 });
});

test('fallar cede el turno y la partida sigue', () => {
  const room = act(playingRoom(), 1, { type: 'guess', characterId: 'sanji' });

  assert.equal(room.game.phase, 'playing');
  assert.equal(room.game.turn, 2);
  assert.deepEqual(room.score, { 1: 0, 2: 0 });
});

test('la revancha se pide con la partida terminada', () => {
  const won = guess(playingRoom().game, 1, 'nico-robin', CATALOG);
  const finished = withGame(playingRoom(), won, NOW);

  assert.throws(() => act(playingRoom(), 1, { type: 'rematch' }), /terminado/);
  assert.equal(act(finished, 2, { type: 'rematch' }).game.phase, 'setup');
});

test('una acción que no existe se rechaza también aquí', () => {
  assert.throws(() => act(playingRoom(), 1, { type: 'ganar' }), /no existe/);
});

test('jugar refresca el plazo de la sala', () => {
  const room = act(playingRoom(), 1, { type: 'ask', text: '¿Eres pirata?' }, NOW + 900);

  assert.equal(room.lastActivity, NOW + 900);
});
