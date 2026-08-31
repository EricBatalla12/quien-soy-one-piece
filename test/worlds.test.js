import { test } from 'node:test';
import assert from 'node:assert/strict';

import { WORLDS, DEFAULT_WORLD, catalogPath, findWorld, isWorldId } from '../src/game/worlds.js';

// El registro es la única lista de mundos que hay (sección 5.1 de la espec v4), así
// que lo que se comprueba aquí vale para el servidor, el navegador y los ficheros.

test('están los tres mundos que hay hasta la v5', () => {
  const ids = WORLDS.map((world) => world.id);

  assert.ok(ids.includes('one-piece'));
  assert.ok(ids.includes('hunter-x-hunter'));
  assert.ok(ids.includes('minecraft'));
});

test('ningún mundo repite identificador', () => {
  const ids = WORLDS.map((world) => world.id);

  assert.equal(new Set(ids).size, ids.length);
});

test('todos los mundos tienen identificador con forma de identificador', () => {
  for (const world of WORLDS) {
    assert.match(world.id, /^[a-z0-9]+(-[a-z0-9]+)*$/, `${world.id} no vale como nombre de fichero`);
  }
});

test('todos los mundos se presentan con un nombre y una línea', () => {
  for (const world of WORLDS) {
    assert.ok(typeof world.name === 'string' && world.name.trim() !== '', `${world.id} sin nombre`);
    assert.ok(typeof world.tagline === 'string' && world.tagline.trim() !== '', `${world.id} sin línea`);
  }
});

// Sección 5.1 de la espec v5: sin esto la interfaz llamaría personaje a un yunque.
test('todos los mundos dicen cómo se llama lo que tienen dentro', () => {
  for (const world of WORLDS) {
    assert.ok(typeof world.noun === 'string', `${world.id} no dice qué hay dentro`);
    assert.match(world.noun, /^[a-záéíóúñ]+$/, `${world.id}: una sola palabra en minúsculas`);
  }
});

test('el mundo por defecto es uno de los que hay', () => {
  assert.ok(isWorldId(DEFAULT_WORLD));
});

test('se busca un mundo por su identificador', () => {
  assert.equal(findWorld('hunter-x-hunter').name, 'Hunter × Hunter');
});

// Criterio 6: un mundo inventado se rechaza, venga de donde venga.
test('un mundo que no existe no se encuentra ni cuela como identificador', () => {
  for (const inventado of ['naruto', '', null, undefined, 42, 'One Piece', '__proto__', 'toString']) {
    assert.equal(findWorld(inventado), null, `${JSON.stringify(inventado)} no es un mundo`);
    assert.ok(!isWorldId(inventado), `${JSON.stringify(inventado)} no debería colar`);
  }
});

test('el fichero de personajes se deriva del identificador del mundo', () => {
  assert.equal(catalogPath('one-piece'), 'data/one-piece.json');
  assert.equal(catalogPath('hunter-x-hunter'), 'data/hunter-x-hunter.json');
});

test('no hay fichero de personajes de un mundo que no existe', () => {
  assert.throws(() => catalogPath('naruto'), /ningún mundo/);
});
