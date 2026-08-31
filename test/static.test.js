import { test } from 'node:test';
import assert from 'node:assert/strict';

import { contentType, publicPath } from '../src/server/static.js';

test('la raíz es el juego', () => {
  assert.equal(publicPath('/'), 'index.html');
  assert.equal(publicPath('/index.html'), 'index.html');
  assert.equal(publicPath('/?sala=NAKAM'), 'index.html');
});

test('se sirve lo que necesita el navegador', () => {
  assert.equal(publicPath('/styles/main.css'), 'styles/main.css');
  assert.equal(publicPath('/src/client/main.js'), 'src/client/main.js');
  assert.equal(publicPath('/src/client/ui/render.js'), 'src/client/ui/render.js');
});

// El catálogo llega por HTTP y no por el WebSocket (sección 6.3 de la espec v3), así
// que el navegador tiene que poder pedirlo, y con él las dos piezas que lo manejan.
test('el catálogo y lo que hace falta para buscar en él sí se sirven', () => {
  assert.equal(publicPath('/data/one-piece.json'), 'data/one-piece.json');
  assert.equal(publicPath('/src/game/catalog.js'), 'src/game/catalog.js');
  assert.equal(publicPath('/src/game/normalize.js'), 'src/game/normalize.js');
});

test('no se sirve nada más del repositorio', () => {
  for (const url of [
    '/package.json',
    '/CLAUDE.md',
    '/docs/ESPEC-V2.md',
    '/src/server/server.js',
    '/src/game/state.js',
    '/src/game/view.js',
    '/data/one-piece-corrections.json',
    '/src/server/lobby.js',
    '/node_modules/ws/package.json',
    '/.env',
    '/test/state.test.js',
  ]) {
    assert.equal(publicPath(url), null, `${url} no debería servirse`);
  }
});

test('no se sale del directorio ni escapando los puntos', () => {
  for (const url of [
    '/../CLAUDE.md',
    '/styles/../../.env',
    '/styles/%2e%2e/%2e%2e/.env',
    '/src/client/..%2f..%2fserver%2fserver.js',
    '/styles\\..\\.env',
    '/styles/main.css%00.png',
    '/%ZZ',
    'styles/main.css',
    '//etc/passwd',
  ]) {
    assert.equal(publicPath(url), null, `${url} no debería servirse`);
  }
});

test('cada extensión con su tipo, y lo desconocido sin adivinar', () => {
  assert.match(contentType('index.html'), /text\/html/);
  assert.match(contentType('styles/main.css'), /text\/css/);
  assert.match(contentType('src/client/main.js'), /javascript/);
  assert.match(contentType('data/one-piece.json'), /application\/json/);
  assert.equal(contentType('algo.raro'), 'application/octet-stream');
});
