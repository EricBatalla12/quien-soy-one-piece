import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ANIMES, catalogPath } from '../src/game/animes.js';
import { loadCatalog, loadCatalogs } from '../src/server/catalog.js';

const root = fileURLToPath(new URL('../', import.meta.url));

/**
 * Un repositorio de mentira con los catálogos que le pasemos: anime → texto del
 * fichero, o `null` para que ese fichero no exista.
 */
function rootWith(files) {
  const dir = mkdtempSync(join(tmpdir(), 'quien-soy-'));

  for (const [anime, text] of Object.entries(files)) {
    if (text === null) continue;

    const file = join(dir, catalogPath(anime));
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, text);
  }

  return dir;
}

/** Todos los animes del registro con el mismo contenido, para no repetirlo. */
function everyAnime(text) {
  return Object.fromEntries(ANIMES.map((anime) => [anime.id, text]));
}

test('el catálogo de un anime del repositorio se carga y trae personajes de verdad', () => {
  const catalog = loadCatalog(root, 'one-piece');

  assert.ok(catalog.size > 100, `solo ha cargado ${catalog.size} personajes`);
  assert.ok(catalog.has('monkey-d-luffy'));
  assert.equal(catalog.nameOf('monkey-d-luffy'), 'Monkey D. Luffy');
});

// Sección 6.1 de la espec v4: se cargan todos al arrancar, no el del primero que cree
// una sala. Así un fichero que falte se descubre antes de que nadie juegue.
test('se cargan los catálogos de todos los animes del registro', () => {
  const catalogs = loadCatalogs(root);

  assert.equal(catalogs.size, ANIMES.length);
  assert.ok(catalogs.of('one-piece').has('monkey-d-luffy'));
  assert.ok(catalogs.of('hunter-x-hunter').has('gon-freecss'));
});

test('cada sala recibe el catálogo de su anime y no el del otro', () => {
  const catalogs = loadCatalogs(root);

  assert.ok(!catalogs.of('hunter-x-hunter').has('monkey-d-luffy'));
  assert.ok(!catalogs.of('one-piece').has('gon-freecss'));
});

test('no hay catálogo de un anime que no existe', () => {
  assert.throws(() => loadCatalogs(root).of('naruto'), /No hay catálogo/);
  assert.throws(() => loadCatalogs(root).of('__proto__'), /No hay catálogo/);
});

test('sin fichero de catálogo, el servidor no arranca a medias', () => {
  assert.throws(() => loadCatalogs(rootWith({})), /No se ha podido leer/);
});

// Y tampoco si solo falta uno: el anime que sí está no salva a los demás.
test('basta con que falte el catálogo de un anime para no arrancar', () => {
  const files = everyAnime('[{"id":"nami","name":"Nami"}]');
  files[ANIMES.at(-1).id] = null;

  assert.throws(() => loadCatalogs(rootWith(files)), /No se ha podido leer/);
});

test('un catálogo roto o vacío se detecta al arrancar, no en mitad de una partida', () => {
  assert.throws(() => loadCatalogs(rootWith(everyAnime('{no es json'))), /No se ha podido leer/);
  assert.throws(() => loadCatalogs(rootWith(everyAnime('[]'))), /ningún personaje/);
  assert.throws(
    () => loadCatalogs(rootWith(everyAnime('[{"id":"NAMI","name":"Nami"}]'))),
    /Identificador/,
  );
});
