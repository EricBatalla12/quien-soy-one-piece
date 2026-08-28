import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  clearClues,
  clearSession,
  readClues,
  readSession,
  writeClues,
  writeSession,
} from '../src/client/session.js';

/** Un `sessionStorage` de mentira, que es todo lo que la capa necesita. */
function fakeStorage(initial = {}) {
  const data = new Map(Object.entries(initial));

  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
    removeItem: (key) => data.delete(key),
    get size() {
      return data.size;
    },
  };
}

/** Uno que lanza, como el de un navegador con el almacenamiento desactivado. */
function brokenStorage() {
  const boom = () => {
    throw new Error('almacenamiento desactivado');
  };
  return { getItem: boom, setItem: boom, removeItem: boom };
}

test('lo guardado se recupera', () => {
  const storage = fakeStorage();
  writeSession(storage, { code: 'NAKAM', token: 'abc' });

  assert.deepEqual(readSession(storage), { code: 'NAKAM', token: 'abc' });
});

test('sin nada guardado no hay sesión', () => {
  assert.equal(readSession(fakeStorage()), null);
});

test('lo guardado a medias o corrupto no vale como sesión', () => {
  for (const raw of ['no soy json', 'null', '42', '{}', '{"code":"NAKAM"}', '{"token":"abc"}']) {
    assert.equal(readSession(fakeStorage({ 'quien-soy/session': raw })), null, raw);
  }
});

test('olvidar la sala la borra de verdad', () => {
  const storage = fakeStorage();
  writeSession(storage, { code: 'NAKAM', token: 'abc' });
  clearSession(storage);

  assert.equal(readSession(storage), null);
  assert.equal(storage.size, 0);
});

test('un almacén que lanza no rompe el juego', () => {
  const storage = brokenStorage();

  assert.equal(readSession(storage), null);
  assert.doesNotThrow(() => writeSession(storage, { code: 'NAKAM', token: 'abc' }));
  assert.doesNotThrow(() => clearSession(storage));
});

// ---------------------------------------------------------------------------
// El tablero de pistas
// ---------------------------------------------------------------------------

test('el tablero se recupera al recargar', () => {
  const storage = fakeStorage();
  writeClues(storage, 'NAKAM', [3, 0, 7]);

  assert.deepEqual(readClues(storage, 'NAKAM'), [3, 0, 7]);
});

test('sin tablero guardado se empieza vacío', () => {
  assert.deepEqual(readClues(fakeStorage(), 'NAKAM'), []);
});

test('cada sala tiene el suyo', () => {
  const storage = fakeStorage();
  writeClues(storage, 'NAKAM', [1]);
  writeClues(storage, 'ZORRO', [2, 3]);

  assert.deepEqual(readClues(storage, 'NAKAM'), [1]);
  assert.deepEqual(readClues(storage, 'ZORRO'), [2, 3]);
});

test('un tablero corrupto no rompe la partida', () => {
  for (const raw of ['no soy json', '{}', 'null', '[1, "dos"]', '[-1]', '[1.5]', '["3"]']) {
    const storage = fakeStorage({ 'quien-soy/clues/NAKAM': raw });
    assert.deepEqual(readClues(storage, 'NAKAM'), [], raw);
  }
});

test('salir de la sala borra su tablero', () => {
  const storage = fakeStorage();
  writeClues(storage, 'NAKAM', [1]);
  clearClues(storage, 'NAKAM');

  assert.deepEqual(readClues(storage, 'NAKAM'), []);
  assert.equal(storage.size, 0);
});

test('un almacén que lanza tampoco rompe el tablero', () => {
  const storage = brokenStorage();

  assert.deepEqual(readClues(storage, 'NAKAM'), []);
  assert.doesNotThrow(() => writeClues(storage, 'NAKAM', [1]));
  assert.doesNotThrow(() => clearClues(storage, 'NAKAM'));
});
