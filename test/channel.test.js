/**
 * El reparto de números de jugador.
 *
 * El resto de `channel.js` necesita BroadcastChannel y sessionStorage, que no
 * existen en Node, y se comprueba en el navegador. Esta parte se sacó a una función
 * pura justamente para poder testearla aquí.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { choosePlayerId } from '../src/client/sync/channel.js';

const NADIE = new Set();

test('la primera pestaña es el jugador 1', () => {
  assert.equal(choosePlayerId(NADIE, 0), 1);
});

test('la segunda pestaña coge el número libre', () => {
  assert.equal(choosePlayerId(new Set([1]), 0), 2);
  assert.equal(choosePlayerId(new Set([2]), 0), 1);
});

test('una tercera pestaña se queda sin número', () => {
  assert.equal(choosePlayerId(new Set([1, 2]), 0), null);
});

test('al recargar se recupera el número que ya se tenía', () => {
  assert.equal(choosePlayerId(new Set([1]), 2), 2);
});

test('si el número recordado ya lo ocupa otro, se coge otro libre', () => {
  assert.equal(choosePlayerId(new Set([2]), 2), 1);
});

test('un número recordado sin sentido se ignora', () => {
  // sessionStorage vacío da 0 y un valor corrupto da NaN.
  assert.equal(choosePlayerId(NADIE, 0), 1);
  assert.equal(choosePlayerId(NADIE, NaN), 1);
  assert.equal(choosePlayerId(NADIE, 7), 1);
});
