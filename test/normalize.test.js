import { test } from 'node:test';
import assert from 'node:assert/strict';

import { normalizeName, sameName, isBlank } from '../src/game/normalize.js';

// Criterio de aceptación 8: al arriesgar no distinguen mayúsculas, acentos ni
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

test('dos formas de escribir el mismo nombre son el mismo personaje', () => {
  assert.ok(sameName('  NICO  ROBÍN ', 'nico robin'));
});

test('dos personajes distintos no se confunden', () => {
  assert.ok(!sameName('Zoro', 'Sanji'));
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
