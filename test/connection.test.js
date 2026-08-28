import { test } from 'node:test';
import assert from 'node:assert/strict';

import { RETRY_MAX_MS, connect, retryDelay, socketUrl } from '../src/client/sync/connection.js';

/**
 * Un WebSocket de mentira. El test decide cuándo se abre, qué llega y cuándo se
 * cae, que es justo lo que no se puede provocar con uno de verdad.
 */
function fakeSocket() {
  const listeners = new Map();
  const sent = [];

  return {
    readyState: 0,
    sent,
    addEventListener: (type, handler) => listeners.set(type, handler),
    send: (data) => sent.push(JSON.parse(data)),
    close: () => listeners.get('close')?.(),

    open() {
      this.readyState = 1;
      listeners.get('open')?.();
    },
    receive(data) {
      listeners.get('message')?.({ data });
    },
    drop() {
      this.readyState = 3;
      listeners.get('close')?.();
    },
  };
}

/** Un cliente conectado, con los sockets que ha ido abriendo y lo que ha pasado. */
function client() {
  const sockets = [];
  const statuses = [];
  const received = [];
  const pending = [];
  let opens = 0;

  const connection = connect({
    url: 'ws://localhost:8000',
    onOpen: () => (opens += 1),
    onMessage: (message) => received.push(message),
    onStatus: (status) => statuses.push(status),
    open: () => {
      const socket = fakeSocket();
      sockets.push(socket);
      return socket;
    },
    schedule: (callback, delay) => pending.push({ callback, delay }),
  });

  return {
    connection,
    sockets,
    statuses,
    received,
    get opens() {
      return opens;
    },
    /** Deja pasar el tiempo que el cliente pidió esperar. */
    runTimer: () => pending.shift().callback(),
    lastDelay: () => pending.at(-1).delay,
  };
}

test('la dirección del socket sale de la página que sirvió el juego', () => {
  assert.equal(socketUrl({ protocol: 'http:', host: 'localhost:8000' }), 'ws://localhost:8000');
  assert.equal(socketUrl({ protocol: 'https:', host: 'quien-soy.app' }), 'wss://quien-soy.app');
});

test('la espera entre intentos se duplica hasta un tope', () => {
  assert.equal(retryDelay(0), 500);
  assert.equal(retryDelay(1), 1000);
  assert.equal(retryDelay(2), 2000);
  assert.equal(retryDelay(50), RETRY_MAX_MS);
});

test('al abrirse el socket se avisa para poder presentarse', () => {
  const c = client();
  assert.deepEqual(c.statuses, ['connecting']);

  c.sockets[0].open();

  assert.equal(c.opens, 1);
  assert.deepEqual(c.statuses, ['connecting', 'online']);
});

test('los mensajes llegan ya interpretados', () => {
  const c = client();
  c.sockets[0].open();
  c.sockets[0].receive(JSON.stringify({ type: 'view', view: { code: 'NAKAM' } }));

  assert.deepEqual(c.received, [{ type: 'view', view: { code: 'NAKAM' } }]);
});

test('la basura por el cable se ignora sin romper nada', () => {
  const c = client();
  c.sockets[0].open();
  c.sockets[0].receive('no soy json');
  c.sockets[0].receive('42');

  assert.deepEqual(c.received, []);
});

// ---------------------------------------------------------------------------
// Criterio 14: un bache de conexión no te echa de la partida
// ---------------------------------------------------------------------------

test('si se cae la conexión se vuelve a intentar, y al volver hay que presentarse', () => {
  const c = client();
  c.sockets[0].open();
  c.sockets[0].drop();

  assert.equal(c.statuses.at(-1), 'offline');
  assert.equal(c.lastDelay(), retryDelay(0));

  c.runTimer();
  assert.equal(c.sockets.length, 2, 'se abre un socket nuevo');

  c.sockets[1].open();
  assert.equal(c.opens, 2, 'hay que volver a presentar el token');
  assert.equal(c.statuses.at(-1), 'online');
});

test('los intentos seguidos esperan cada vez más', () => {
  const c = client();
  c.sockets[0].open();

  c.sockets[0].drop();
  assert.equal(c.lastDelay(), retryDelay(0));

  c.runTimer();
  c.sockets[1].drop();
  assert.equal(c.lastDelay(), retryDelay(1));
});

test('una conexión que aguanta reinicia la cuenta de intentos', () => {
  const c = client();
  c.sockets[0].drop();
  c.runTimer();
  c.sockets[1].open();
  c.sockets[1].drop();

  assert.equal(c.lastDelay(), retryDelay(0));
});

test('cerrar a propósito no reintenta', () => {
  const c = client();
  c.sockets[0].open();
  c.connection.close();

  assert.equal(c.sockets.length, 1);
});

test('lo que se manda con el socket caído no se pierde por el camino: no se manda', () => {
  const c = client();
  c.connection.send({ type: 'ask', text: '¿Hola?' });

  assert.deepEqual(c.sockets[0].sent, []);

  c.sockets[0].open();
  c.connection.send({ type: 'ask', text: '¿Hola?' });
  assert.deepEqual(c.sockets[0].sent, [{ type: 'ask', text: '¿Hola?' }]);
});
