import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ANIMES, catalogPath, findAnime } from '../src/game/animes.js';
import { buildCatalog, createCatalog } from '../src/game/catalog.js';
import { serializeCatalog } from '../scripts/build-catalog.js';

/**
 * Los ficheros de personajes del repositorio, todos, y no solo el que había.
 *
 * Es lo que mantiene honesta la lista escrita a mano de Hunter × Hunter (sección 6.3
 * de la espec v4): pasa por las mismas comprobaciones que la que trae la API, sin
 * script que la genere. Si alguien añade una línea con el identificador mal escrito,
 * o desordenada, o repetida, se entera aquí y no en mitad de una partida.
 */

const root = fileURLToPath(new URL('../', import.meta.url));

function fileOf(anime) {
  return readFileSync(join(root, catalogPath(anime.id)), 'utf8');
}

test('cada anime del registro tiene su fichero de personajes y se puede leer', () => {
  for (const anime of ANIMES) {
    const catalog = createCatalog(JSON.parse(fileOf(anime)));

    assert.ok(catalog.size > 0, `${anime.name} no tiene ningún personaje`);
  }
});

// Criterio 10 de la v4, que es el 11 de la v3 aplicado a todos los catálogos.
test('ningún catálogo repite nombres ni los deja vacíos', () => {
  for (const anime of ANIMES) {
    const names = JSON.parse(fileOf(anime)).map((entry) => entry.name);

    assert.equal(new Set(names).size, names.length, `${anime.name} repite algún nombre`);
    assert.ok(
      names.every((name) => name.trim() !== ''),
      `${anime.name} tiene algún nombre vacío`,
    );
  }
});

/**
 * La comprobación de fondo: el fichero es exactamente el que sale de construirlo a
 * partir de sus propios nombres. Así el identificador se deriva del nombre, el orden
 * es el alfabético y no hay repetidos, lo haya generado un script o una persona.
 */
test('cada catálogo es el que da construirlo desde sus nombres', () => {
  for (const anime of ANIMES) {
    const entries = JSON.parse(fileOf(anime));

    assert.deepEqual(
      entries,
      buildCatalog(entries.map((entry) => entry.name)),
      `${anime.name}: revisa identificadores, orden y repetidos`,
    );
  }
});

/** Un personaje por línea, para que el diff de un catálogo se pueda leer. */
test('cada catálogo está escrito con un personaje por línea', () => {
  for (const anime of ANIMES) {
    const text = fileOf(anime);

    assert.equal(text, serializeCatalog(JSON.parse(text)), `${anime.name} está mal formateado`);
  }
});

test('los personajes de un anime no se cuelan en el catálogo de otro', () => {
  const onePiece = createCatalog(JSON.parse(fileOf(findAnime('one-piece'))));
  const hunter = createCatalog(JSON.parse(fileOf(findAnime('hunter-x-hunter'))));

  assert.ok(onePiece.has('monkey-d-luffy'));
  assert.ok(!hunter.has('monkey-d-luffy'));
  assert.ok(hunter.has('gon-freecss'));
  assert.ok(!onePiece.has('gon-freecss'));
});
