import { test } from 'node:test';
import assert from 'node:assert/strict';

import { clearSession, readSession, writeSession } from '../src/client/session.js';

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
