import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { WORLDS, catalogPath, findWorld } from '../src/game/worlds.js';
import { buildCatalog, createCatalog } from '../src/game/catalog.js';
import { serializeCatalog } from '../scripts/catalog-file.js';

/**
 * Los ficheros de personajes del repositorio, todos, y no solo el que había.
 *
 * Es lo que mantiene honesta la lista escrita a mano de Hunter × Hunter (sección 6.3
 * de la espec v4): pasa por las mismas comprobaciones que la que trae la API, sin
 * script que la genere. Si alguien añade una línea con el identificador mal escrito,
 * o desordenada, o repetida, se entera aquí y no en mitad de una partida.
 */

const root = fileURLToPath(new URL('../', import.meta.url));

function fileOf(world) {
  return readFileSync(join(root, catalogPath(world.id)), 'utf8');
}

test('cada mundo del registro tiene su fichero de personajes y se puede leer', () => {
  for (const world of WORLDS) {
    const catalog = createCatalog(JSON.parse(fileOf(world)));

    assert.ok(catalog.size > 0, `${world.name} no tiene ningún personaje`);
  }
});

// Criterio 10 de la v4, que es el 11 de la v3 aplicado a todos los catálogos.
test('ningún catálogo repite nombres ni los deja vacíos', () => {
  for (const world of WORLDS) {
    const names = JSON.parse(fileOf(world)).map((entry) => entry.name);

    assert.equal(new Set(names).size, names.length, `${world.name} repite algún nombre`);
    assert.ok(
      names.every((name) => name.trim() !== ''),
      `${world.name} tiene algún nombre vacío`,
    );
  }
});

/**
 * La comprobación de fondo: el fichero es exactamente el que sale de construirlo a
 * partir de sus propios nombres. Así el identificador se deriva del nombre, el orden
 * es el alfabético y no hay repetidos, lo haya generado un script o una persona.
 */
test('cada catálogo es el que da construirlo desde sus nombres', () => {
  for (const world of WORLDS) {
    const entries = JSON.parse(fileOf(world));

    assert.deepEqual(
      entries,
      buildCatalog(entries.map((entry) => entry.name)),
      `${world.name}: revisa identificadores, orden y repetidos`,
    );
  }
});

/** Un personaje por línea, para que el diff de un catálogo se pueda leer. */
test('cada catálogo está escrito con un personaje por línea', () => {
  for (const world of WORLDS) {
    const text = fileOf(world);

    assert.equal(text, serializeCatalog(JSON.parse(text)), `${world.name} está mal formateado`);
  }
});

test('los personajes de un mundo no se cuelan en el catálogo de otro', () => {
  const onePiece = createCatalog(JSON.parse(fileOf(findWorld('one-piece'))));
  const hunter = createCatalog(JSON.parse(fileOf(findWorld('hunter-x-hunter'))));

  assert.ok(onePiece.has('monkey-d-luffy'));
  assert.ok(!hunter.has('monkey-d-luffy'));
  assert.ok(hunter.has('gon-freecss'));
  assert.ok(!onePiece.has('gon-freecss'));
});
