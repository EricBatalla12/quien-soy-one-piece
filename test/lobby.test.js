import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createLobby } from '../src/server/lobby.js';
import { ROOM_TTL_MS } from '../src/server/rooms.js';

/**
 * Un lobby con el reloj y el azar en la mano: los códigos salen en orden y el
 * tiempo solo avanza cuando el test lo dice.
 */
function fakeLobby() {
  let clock = 1_000_000;
  let codes = 0;
  let tokens = 0;

  const lobby = createLobby({
    now: () => clock,
    newCode: () => ['NAKAM', 'ZORRO', 'SANJI'][codes++ % 3],
    newToken: () => `token-${++tokens}`,
  });

  return { lobby, advance: (ms) => (clock += ms) };
}

/** Sala con los dos jugadores dentro y sus dos tokens. */
function seated() {
  const { lobby, advance } = fakeLobby();
  const host = lobby.open('Eric');
  const guest = lobby.join(host.code, 'Nami');

  return { lobby, advance, host, guest };
}

test('abrir una sala te sienta en la plaza 1 con un token', () => {
  const { lobby } = fakeLobby();
  const host = lobby.open('Eric');

  assert.equal(host.code, 'NAKAM');
  assert.equal(host.playerId, 1);
  assert.equal(host.token, 'token-1');
  assert.equal(lobby.size, 1);
});

test('entrar con el código te sienta en la plaza 2', () => {
  const { guest } = seated();

  assert.equal(guest.playerId, 2);
  assert.equal(guest.token, 'token-2');
});

test('cada jugador recibe un token distinto', () => {
  const { host, guest } = seated();

  assert.notEqual(host.token, guest.token);
});

// ---------------------------------------------------------------------------
// Criterio 2: códigos que no existen y salas llenas
// ---------------------------------------------------------------------------

test('con un código que no existe no se entra', () => {
  const { lobby } = fakeLobby();

  assert.throws(() => lobby.join('ZORRO', 'Nami'), /No existe/);
});

test('un tercero con el código se queda fuera', () => {
  const { lobby, host } = seated();

  assert.throws(() => lobby.join(host.code, 'Usopp'), /llena/);
});

test('dos salas a la vez no comparten código', () => {
  const { lobby } = fakeLobby();

  assert.equal(lobby.open('Eric').code, 'NAKAM');
  assert.equal(lobby.open('Nami').code, 'ZORRO');
  assert.equal(lobby.size, 2);
});

test('si el azar repite un código se pide otro', () => {
  const lobby = createLobby({ newCode: sequence(['NAKAM', 'NAKAM', 'ZORRO']) });

  assert.equal(lobby.open('Eric').code, 'NAKAM');
  assert.equal(lobby.open('Nami').code, 'ZORRO');
});

test('si nunca sale un código libre, crear la sala falla en vez de pisar la otra', () => {
  const lobby = createLobby({ newCode: () => 'NAKAM' });
  lobby.open('Eric');

  assert.throws(() => lobby.open('Nami'), /No se ha podido crear/);
  assert.equal(lobby.size, 1);
});

// ---------------------------------------------------------------------------
// Criterio 14: recargar no pierde la partida
// ---------------------------------------------------------------------------

test('con tu token recuperas tu plaza y la partida', () => {
  const { lobby, host, guest } = seated();
  lobby.act(host.code, 1, { type: 'secret', text: 'Zoro' });

  lobby.leave(host.code, 1);
  assert.equal(lobby.view(host.code, 2).rival.connected, false);

  assert.deepEqual(lobby.resume(host.code, host.token), { code: 'NAKAM', playerId: 1 });
  assert.equal(lobby.view(guest.code, 2).rival.connected, true);
  assert.equal(lobby.view(host.code, 1).chosenForRival, 'Zoro', 'la partida sigue ahí');
});

test('un token que no es de esa sala no recupera nada', () => {
  const { lobby, host } = seated();

  assert.throws(() => lobby.resume(host.code, 'token-inventado'), /ya no existe/);
});

test('caerse no libera la plaza', () => {
  const { lobby, host } = seated();
  lobby.leave(host.code, 2);

  assert.throws(() => lobby.join(host.code, 'Usopp'), /llena/);
});

// ---------------------------------------------------------------------------
// Jugar
// ---------------------------------------------------------------------------

test('una partida entera pasa por el lobby', () => {
  const { lobby, host } = seated();

  lobby.act(host.code, 1, { type: 'secret', text: 'Zoro' });
  lobby.act(host.code, 2, { type: 'secret', text: 'Nico Robin' });
  lobby.act(host.code, 1, { type: 'ask', text: '¿Eres espadachín?' });
  lobby.act(host.code, 2, { type: 'answer', answer: 'no' });
  lobby.act(host.code, 2, { type: 'guess', text: 'zoro' });

  const view = lobby.view(host.code, 2);
  assert.equal(view.phase, 'finished');
  assert.equal(view.winner, 2);
  assert.deepEqual(view.score, { 1: 0, 2: 1 });

  lobby.act(host.code, 1, { type: 'rematch' });
  assert.equal(lobby.view(host.code, 1).phase, 'setup');
  assert.deepEqual(lobby.view(host.code, 1).score, { 1: 0, 2: 1 }, 'el marcador se conserva');
});

test('una acción rechazada no deja la sala a medias', () => {
  const { lobby, host } = seated();
  lobby.act(host.code, 1, { type: 'secret', text: 'Zoro' });

  assert.throws(() => lobby.act(host.code, 1, { type: 'secret', text: 'Sanji' }), /Ya has elegido/);
  assert.equal(lobby.view(host.code, 1).chosenForRival, 'Zoro');
});

// ---------------------------------------------------------------------------
// Criterio 15: expiración
// ---------------------------------------------------------------------------

test('una sala caducada deja de existir en cuanto alguien la toca', () => {
  const { lobby, host, advance } = seated();
  lobby.leave(host.code, 2);
  advance(ROOM_TTL_MS + 1);

  assert.throws(() => lobby.view(host.code, 1), /caducado/);
  assert.equal(lobby.size, 0);
});

test('la limpieza tira las salas caducadas y dice cuáles eran', () => {
  const { lobby, advance } = fakeLobby();
  const abandoned = lobby.open('Eric');
  advance(ROOM_TTL_MS + 1);
  const fresh = lobby.open('Nami');

  const dead = lobby.sweep();

  assert.equal(dead.length, 1);
  assert.equal(dead[0].code, abandoned.code);
  assert.equal(lobby.size, 1);
  assert.doesNotThrow(() => lobby.view(fresh.code, 1));
});

test('la limpieza no toca una sala con los dos jugadores conectados', () => {
  const { lobby, advance } = seated();
  advance(ROOM_TTL_MS * 5);

  assert.deepEqual(lobby.sweep(), []);
});

function sequence(values) {
  let index = 0;
  return () => values[Math.min(index++, values.length - 1)];
}
