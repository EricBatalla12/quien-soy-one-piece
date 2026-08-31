import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  CODE_ALPHABET,
  CODE_LENGTH,
  MAX_NAME_LENGTH,
  ROOM_TTL_MS,
  cleanName,
  createRoom,
  hasExpired,
  isFull,
  isValidCode,
  joinRoom,
  makeCode,
  normalizeCode,
  playerIdByToken,
  rematch,
  setConnected,
  withGame,
} from '../src/server/rooms.js';
import { createCatalog } from '../src/game/catalog.js';
import { createGame, guess, setSecret } from '../src/game/state.js';

/** Un catálogo de mentira: la sala no lee el del repositorio. */
const CATALOG = createCatalog([
  { id: 'roronoa-zoro', name: 'Roronoa Zoro' },
  { id: 'nico-robin', name: 'Nico Robin' },
]);

const NOW = 1_000_000;

/** Sala con las dos plazas ocupadas. */
function fullRoom() {
  const room = createRoom({
    code: 'NAKAM',
    name: 'Eric',
    token: 't1',
    world: 'one-piece',
    now: NOW,
  });
  return joinRoom(room, { name: 'Nami', token: 't2', now: NOW });
}

/** Partida terminada con victoria del jugador que se indique. */
function wonGame(winner) {
  let game = createGame();
  game = setSecret(game, 1, 'roronoa-zoro', CATALOG); // lo adivina el 2
  game = setSecret(game, 2, 'nico-robin', CATALOG); // lo adivina el 1
  if (winner === 2) game = { ...game, turn: 2 };
  return guess(game, winner, winner === 1 ? 'nico-robin' : 'roronoa-zoro', CATALOG);
}

// ---------------------------------------------------------------------------
// El código de sala
// ---------------------------------------------------------------------------

test('el código tiene la longitud pactada y solo usa el alfabeto', () => {
  for (let i = 0; i < 200; i += 1) {
    const code = makeCode();
    assert.equal(code.length, CODE_LENGTH);
    assert.ok([...code].every((letter) => CODE_ALPHABET.includes(letter)));
  }
});

test('el alfabeto no tiene letras que se confundan al dictarlas', () => {
  for (const confusing of ['I', 'L', 'O', 'Q']) {
    assert.ok(!CODE_ALPHABET.includes(confusing), `${confusing} se confunde con 1 o con 0`);
  }
});

test('con azar fijo el código es predecible', () => {
  assert.equal(makeCode(() => 0), 'AAAAA');
});

test('el código se teclea como se quiera', () => {
  assert.equal(normalizeCode('  nakam '), 'NAKAM');
  assert.ok(isValidCode(' nakam '));
});

test('un código con forma equivocada se rechaza', () => {
  for (const bad of ['', 'GOMU', 'NAKAMX', 'GOMU1', 'GOMUI', null, 42]) {
    assert.ok(!isValidCode(bad), `${bad} no debería valer`);
  }
});

// ---------------------------------------------------------------------------
// El nombre
// ---------------------------------------------------------------------------

test('el nombre no puede estar vacío', () => {
  for (const bad of ['', '   ', null, 7]) {
    assert.throws(() => cleanName(bad), /no puede estar vacío/);
  }
});

test('el nombre se limpia y se recorta al tope', () => {
  assert.equal(cleanName('  Eric   B  '), 'Eric B');
  assert.equal(cleanName('E'.repeat(50)).length, MAX_NAME_LENGTH);
});

// ---------------------------------------------------------------------------
// Plazas
// ---------------------------------------------------------------------------

test('quien crea la sala ocupa la plaza 1 y espera rival', () => {
  const room = createRoom({ code: 'NAKAM', name: 'Eric', token: 't1', world: 'one-piece', now: NOW });

  assert.equal(room.players[1].name, 'Eric');
  assert.equal(room.players[2], null);
  assert.ok(!isFull(room));
  assert.equal(room.game.phase, 'setup');
  assert.deepEqual(room.score, { 1: 0, 2: 0 });
});

test('el segundo jugador ocupa la plaza libre', () => {
  const room = fullRoom();

  assert.equal(room.players[2].name, 'Nami');
  assert.ok(isFull(room));
});

test('un tercero no entra en una sala llena', () => {
  assert.throws(() => joinRoom(fullRoom(), { name: 'Usopp', token: 't3', now: NOW }), /llena/);
});

test('entrar no toca la sala que recibe', () => {
  const room = createRoom({ code: 'NAKAM', name: 'Eric', token: 't1', world: 'one-piece', now: NOW });
  joinRoom(room, { name: 'Nami', token: 't2', now: NOW });

  assert.equal(room.players[2], null);
});

// ---------------------------------------------------------------------------
// El token es lo único que demuestra quién eres
// ---------------------------------------------------------------------------

test('cada token lleva a su plaza', () => {
  const room = fullRoom();

  assert.equal(playerIdByToken(room, 't1'), 1);
  assert.equal(playerIdByToken(room, 't2'), 2);
});

test('un token que no es de nadie no abre ninguna plaza', () => {
  const room = fullRoom();

  for (const bad of ['otro', '', null, undefined, 3]) {
    assert.equal(playerIdByToken(room, bad), null, `${bad} no debería identificar a nadie`);
  }
});

test('el token de una plaza vacía no existe', () => {
  const room = createRoom({ code: 'NAKAM', name: 'Eric', token: 't1', world: 'one-piece', now: NOW });
  assert.equal(playerIdByToken(room, undefined), null);
});

// ---------------------------------------------------------------------------
// Conexión
// ---------------------------------------------------------------------------

test('desconectarse deja la plaza marcada, no libre', () => {
  const room = setConnected(fullRoom(), 2, false, NOW);

  assert.equal(room.players[2].connected, false);
  assert.equal(room.players[2].name, 'Nami');
  assert.ok(isFull(room), 'la plaza le sigue perteneciendo');
});

test('no se puede conectar a una plaza que no existe', () => {
  const room = createRoom({ code: 'NAKAM', name: 'Eric', token: 't1', world: 'one-piece', now: NOW });
  assert.throws(() => setConnected(room, 2, true, NOW), /libre/);
});

// ---------------------------------------------------------------------------
// Marcador y revancha
// ---------------------------------------------------------------------------

test('ganar una partida suma una al marcador', () => {
  const room = withGame(fullRoom(), wonGame(1), NOW);

  assert.deepEqual(room.score, { 1: 1, 2: 0 });
});

test('guardar dos veces la misma partida terminada no suma dos veces', () => {
  const finished = wonGame(1);
  const room = withGame(withGame(fullRoom(), finished, NOW), finished, NOW);

  assert.deepEqual(room.score, { 1: 1, 2: 0 });
});

test('la revancha empieza de cero y conserva el marcador', () => {
  const room = rematch(withGame(fullRoom(), wonGame(2), NOW), NOW);

  assert.equal(room.game.phase, 'setup');
  assert.equal(room.game.winner, null);
  assert.equal(room.game.history.length, 0);
  assert.deepEqual(room.score, { 1: 0, 2: 1 });
});

test('no hay revancha de una partida sin terminar', () => {
  assert.throws(() => rematch(fullRoom(), NOW), /todavía no ha terminado/);
});

test('no hay revancha sin rival', () => {
  const alone = withGame(
    createRoom({ code: 'NAKAM', name: 'Eric', token: 't1', world: 'one-piece', now: NOW }),
    wonGame(1),
    NOW,
  );

  assert.throws(() => rematch(alone, NOW), /rival/);
});

// ---------------------------------------------------------------------------
// Expiración
// ---------------------------------------------------------------------------

test('una sala que espera rival caduca al agotarse el plazo', () => {
  const room = createRoom({ code: 'NAKAM', name: 'Eric', token: 't1', world: 'one-piece', now: NOW });

  assert.ok(!hasExpired(room, NOW + ROOM_TTL_MS));
  assert.ok(hasExpired(room, NOW + ROOM_TTL_MS + 1));
});

test('una sala con alguien desconectado caduca desde que se cayó', () => {
  const room = setConnected(fullRoom(), 2, false, NOW);

  assert.ok(!hasExpired(room, NOW + ROOM_TTL_MS));
  assert.ok(hasExpired(room, NOW + ROOM_TTL_MS + 1));
});

test('con los dos conectados la sala no caduca aunque se piense despacio', () => {
  assert.ok(!hasExpired(fullRoom(), NOW + ROOM_TTL_MS * 10));
});

test('volver a conectarse reinicia el plazo', () => {
  let room = setConnected(fullRoom(), 2, false, NOW);
  room = setConnected(room, 2, true, NOW + 1000);
  room = setConnected(room, 2, false, NOW + 1000);

  assert.ok(!hasExpired(room, NOW + ROOM_TTL_MS + 500));
});

test('jugar reinicia el plazo', () => {
  const room = withGame(fullRoom(), setSecret(createGame(), 1, 'roronoa-zoro', CATALOG), NOW + 5000);

  assert.equal(room.lastActivity, NOW + 5000);
});

// ---------------------------------------------------------------------------
// El mundo de la sala (v4)
// ---------------------------------------------------------------------------

test('la sala guarda el mundo con el que se creó', () => {
  const room = createRoom({
    code: 'NAKAM',
    name: 'Eric',
    token: 't1',
    world: 'hunter-x-hunter',
    now: NOW,
  });

  assert.equal(room.world, 'hunter-x-hunter');
});

// Criterio 2: la sala lo conserva al entrar el rival y en las revanchas.
test('el mundo no cambia al entrar el rival ni en la revancha', () => {
  const room = joinRoom(
    createRoom({ code: 'NAKAM', name: 'Eric', token: 't1', world: 'hunter-x-hunter', now: NOW }),
    { name: 'Nami', token: 't2', now: NOW },
  );

  assert.equal(room.world, 'hunter-x-hunter');
  assert.equal(rematch(withGame(room, wonGame(2), NOW), NOW).world, 'hunter-x-hunter');
});

// Criterio 6: una sala de un mundo que no existe no llega a nacer, porque no habría
// catálogo con el que validar un solo personaje.
test('no se puede crear una sala de un mundo que no existe', () => {
  for (const bad of [undefined, null, '', 'naruto', 'One Piece', '__proto__']) {
    assert.throws(
      () => createRoom({ code: 'NAKAM', name: 'Eric', token: 't1', world: bad, now: NOW }),
      /mundo no existe/,
      `${JSON.stringify(bad)} no debería valer como mundo`,
    );
  }
});
