import { test } from 'node:test';
import assert from 'node:assert/strict';

import { ANIMES, DEFAULT_ANIME, catalogPath, findAnime, isAnimeId } from '../src/game/animes.js';

// El registro es la única lista de animes que hay (sección 5.1 de la espec v4), así
// que lo que se comprueba aquí vale para el servidor, el navegador y los ficheros.

test('hay al menos los dos animes de la v4', () => {
  const ids = ANIMES.map((anime) => anime.id);

  assert.ok(ids.includes('one-piece'));
  assert.ok(ids.includes('hunter-x-hunter'));
});

test('ningún anime repite identificador', () => {
  const ids = ANIMES.map((anime) => anime.id);

  assert.equal(new Set(ids).size, ids.length);
});

test('todos los animes tienen identificador con forma de identificador', () => {
  for (const anime of ANIMES) {
    assert.match(anime.id, /^[a-z0-9]+(-[a-z0-9]+)*$/, `${anime.id} no vale como nombre de fichero`);
  }
});

test('todos los animes se presentan con un nombre y una línea', () => {
  for (const anime of ANIMES) {
    assert.ok(typeof anime.name === 'string' && anime.name.trim() !== '', `${anime.id} sin nombre`);
    assert.ok(typeof anime.tagline === 'string' && anime.tagline.trim() !== '', `${anime.id} sin línea`);
  }
});

test('el anime por defecto es uno de los que hay', () => {
  assert.ok(isAnimeId(DEFAULT_ANIME));
});

test('se busca un anime por su identificador', () => {
  assert.equal(findAnime('hunter-x-hunter').name, 'Hunter × Hunter');
});

// Criterio 6: un anime inventado se rechaza, venga de donde venga.
test('un anime que no existe no se encuentra ni cuela como identificador', () => {
  for (const inventado of ['naruto', '', null, undefined, 42, 'One Piece', '__proto__', 'toString']) {
    assert.equal(findAnime(inventado), null, `${JSON.stringify(inventado)} no es un anime`);
    assert.ok(!isAnimeId(inventado), `${JSON.stringify(inventado)} no debería colar`);
  }
});

test('el fichero de personajes se deriva del identificador del anime', () => {
  assert.equal(catalogPath('one-piece'), 'data/one-piece.json');
  assert.equal(catalogPath('hunter-x-hunter'), 'data/hunter-x-hunter.json');
});

test('no hay fichero de personajes de un anime que no existe', () => {
  assert.throws(() => catalogPath('naruto'), /ningún anime/);
});
