import { test } from 'node:test';
import assert from 'node:assert/strict';

import { applyAction } from '../src/server/actions.js';
import { createRoom, joinRoom, withGame } from '../src/server/rooms.js';
import { createGame, guess, setSecret } from '../src/game/state.js';

const NOW = 1_000_000;

function fullRoom() {
  return joinRoom(createRoom({ code: 'NAKAM', name: 'Eric', token: 't1', now: NOW }), {
    name: 'Nami',
    token: 't2',
    now: NOW,
  });
}

/** El jugador 1 debe adivinar "Nico Robin"; el jugador 2, "Zoro". */
function playingRoom() {
  let game = setSecret(createGame(), 1, 'Zoro');
  game = setSecret(game, 2, 'Nico Robin');
  return withGame(fullRoom(), game, NOW);
}

test('elegir personaje y preguntar avanzan la partida', () => {
  let room = applyAction(fullRoom(), 1, { type: 'secret', text: 'Zoro' }, NOW);
  room = applyAction(room, 2, { type: 'secret', text: 'Nico Robin' }, NOW);

  assert.equal(room.game.phase, 'playing');

  room = applyAction(room, 1, { type: 'ask', text: '¿Eres espadachín?' }, NOW);
  assert.equal(room.game.pendingQuestion.text, '¿Eres espadachín?');

  room = applyAction(room, 2, { type: 'answer', answer: 'sí' }, NOW);
  assert.equal(room.game.history.at(-1).answer, 'sí');
  assert.equal(room.game.turn, 2, 'responder te da el turno');
});

// ---------------------------------------------------------------------------
// Criterio 4: las reglas las hace cumplir el servidor, no la interfaz
// ---------------------------------------------------------------------------

test('no puedes actuar fuera de tu turno aunque mandes la acción a mano', () => {
  const room = playingRoom();

  assert.throws(() => applyAction(room, 2, { type: 'ask', text: '¿Soy pirata?' }, NOW), /turno/);
  assert.throws(() => applyAction(room, 2, { type: 'guess', text: 'Zoro' }, NOW), /turno/);
});

test('no puedes responderte a ti mismo', () => {
  const asked = applyAction(playingRoom(), 1, { type: 'ask', text: '¿Eres pirata?' }, NOW);

  assert.throws(() => applyAction(asked, 1, { type: 'answer', answer: 'sí' }, NOW), /tu propia/);
});

test('no se juega hasta que hay rival', () => {
  const alone = createRoom({ code: 'NAKAM', name: 'Eric', token: 't1', now: NOW });

  assert.throws(() => applyAction(alone, 1, { type: 'secret', text: 'Zoro' }, NOW), /rival/);
});

test('acertar termina la partida y suma al marcador', () => {
  const room = applyAction(playingRoom(), 1, { type: 'guess', text: '  nico robin ' }, NOW);

  assert.equal(room.game.phase, 'finished');
  assert.equal(room.game.winner, 1);
  assert.deepEqual(room.score, { 1: 1, 2: 0 });
});

test('fallar cede el turno y la partida sigue', () => {
  const room = applyAction(playingRoom(), 1, { type: 'guess', text: 'Sanji' }, NOW);

  assert.equal(room.game.phase, 'playing');
  assert.equal(room.game.turn, 2);
  assert.deepEqual(room.score, { 1: 0, 2: 0 });
});

test('la revancha se pide con la partida terminada', () => {
  const finished = withGame(playingRoom(), guess(playingRoom().game, 1, 'Nico Robin'), NOW);

  assert.throws(() => applyAction(playingRoom(), 1, { type: 'rematch' }, NOW), /terminado/);
  assert.equal(applyAction(finished, 2, { type: 'rematch' }, NOW).game.phase, 'setup');
});

test('una acción que no existe se rechaza también aquí', () => {
  assert.throws(() => applyAction(playingRoom(), 1, { type: 'ganar' }, NOW), /no existe/);
});

test('jugar refresca el plazo de la sala', () => {
  const room = applyAction(playingRoom(), 1, { type: 'ask', text: '¿Eres pirata?' }, NOW + 900);

  assert.equal(room.lastActivity, NOW + 900);
});
