import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { CATALOG_PATH, loadCatalog } from '../src/server/catalog.js';

const root = fileURLToPath(new URL('../', import.meta.url));

/** Un repositorio de mentira con el catálogo que le pasemos. */
function rootWith(text) {
  const dir = mkdtempSync(join(tmpdir(), 'quien-soy-'));
  if (text !== null) {
    mkdirSync(dirname(join(dir, CATALOG_PATH)), { recursive: true });
    writeFileSync(join(dir, CATALOG_PATH), text);
  }

  return dir;
}

test('el catálogo del repositorio se carga y trae personajes de verdad', () => {
  const catalog = loadCatalog(root);

  assert.ok(catalog.size > 100, `solo ha cargado ${catalog.size} personajes`);
  assert.ok(catalog.has('monkey-d-luffy'));
  assert.equal(catalog.nameOf('monkey-d-luffy'), 'Monkey D. Luffy');
});

// Criterio 11: el catálogo que se sirve no tiene nombres repetidos ni vacíos.
test('el catálogo del repositorio no repite nombres ni los deja vacíos', () => {
  const { list } = loadCatalog(root);
  const names = list.map((entry) => entry.name);

  assert.equal(new Set(names).size, names.length);
  assert.ok(names.every((name) => name.trim() !== ''));
});

test('sin fichero de catálogo, el servidor no arranca a medias', () => {
  assert.throws(() => loadCatalog(rootWith(null)), /No se ha podido leer/);
});

test('un catálogo roto o vacío se detecta al arrancar, no en mitad de una partida', () => {
  assert.throws(() => loadCatalog(rootWith('{no es json')), /No se ha podido leer/);
  assert.throws(() => loadCatalog(rootWith('[]')), /ningún personaje/);
  assert.throws(() => loadCatalog(rootWith('[{"id":"NAMI","name":"Nami"}]')), /Identificador/);
});
