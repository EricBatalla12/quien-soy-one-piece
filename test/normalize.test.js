import { test } from 'node:test';
import assert from 'node:assert/strict';

import { normalizeName, isBlank } from '../src/game/normalize.js';

// Es la forma común de mirar un nombre: la usan el identificador de un personaje y
// el buscador del catálogo, y ninguno de los dos distingue mayúsculas, acentos ni
// espacios sobrantes.

test('normalizar ignora las mayúsculas', () => {
  assert.equal(normalizeName('ZORO'), 'zoro');
});

test('normalizar quita los acentos', () => {
  assert.equal(normalizeName('Nico Robín'), 'nico robin');
});

test('normalizar recorta los espacios de los extremos', () => {
  assert.equal(normalizeName('  Luffy  '), 'luffy');
});

test('normalizar colapsa los espacios interiores', () => {
  assert.equal(normalizeName('Monkey   D.   Luffy'), 'monkey d. luffy');
});

test('dos formas de escribir el mismo nombre se normalizan igual', () => {
  assert.equal(normalizeName('  NICO  ROBÍN '), normalizeName('nico robin'));
});

test('dos nombres distintos no se confunden', () => {
  assert.notEqual(normalizeName('Zoro'), normalizeName('Sanji'));
});

test('isBlank detecta el vacío y los espacios', () => {
  assert.ok(isBlank(''));
  assert.ok(isBlank('     '));
  assert.ok(!isBlank('Zoro'));
});

test('isBlank no se rompe si le llega algo que no es texto', () => {
  assert.ok(isBlank(null));
  assert.ok(isBlank(undefined));
  assert.ok(isBlank(42));
});

test('normalizar tampoco se rompe: lo que no es texto no tiene nombre', () => {
  for (const raro of [null, undefined, 42, {}, []]) {
    assert.equal(normalizeName(raro), '', `debería tratar ${JSON.stringify(raro)} como vacío`);
  }
});
