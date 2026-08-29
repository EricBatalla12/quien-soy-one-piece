import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

import { WebSocket } from 'ws';

import { startServer } from '../src/server/server.js';
import { createLobby } from '../src/server/lobby.js';
import { loadCatalog } from '../src/server/catalog.js';
import { ROOM_TTL_MS } from '../src/server/rooms.js';

const root = fileURLToPath(new URL('..', import.meta.url));

let server;
let port;

before(async () => {
  server = startServer({ port: 0, root });
  port = await server.listen();
});

after(() => server.close());

/**
 * Un jugador de verdad al otro lado del cable.
 *
 * `next` espera al siguiente mensaje del tipo pedido y guarda todo lo recibido, que
 * es lo que permite comprobar que el secreto no viaja nunca (criterio 5).
 */
function player(at = port) {
  const socket = new WebSocket(`ws://localhost:${at}`);
  const received = [];
  const waiting = [];
  let cursor = 0;

  socket.on('message', (raw) => {
    received.push(JSON.parse(raw));
    if (waiting.length > 0 && waiting[0]()) waiting.shift();
  });

  function next(type, matches = () => true) {
    const attempt = (resolve) => () => {
      while (cursor < received.length) {
        const message = received[cursor++];
        if (message.type === type && matches(message)) {
          resolve(message);
          return true;
        }
      }
      return false;
    };

    return withTimeout(
      new Promise((resolve) => {
        const check = attempt(resolve);
        if (!check()) waiting.push(check);
      }),
      `esperando un mensaje de tipo ${type}`,
    );
  }

  return {
    open: withTimeout(new Promise((resolve) => socket.once('open', resolve)), 'abriendo el socket'),
    send: (message) => socket.send(JSON.stringify(message)),
    close: () => socket.close(),
    next,
    /** Todo lo que ha llegado por el cable, tal cual. */
    wire: () => JSON.stringify(received),
  };
}

function withTimeout(promise, what) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`Se agotó el tiempo ${what}`)), 3000)),
  ]);
}

/** Dos jugadores sentados en la misma sala, con la partida ya empezada. */
async function playing() {
  const host = player();
  await host.open;
  host.send({ type: 'create', name: 'Eric' });
  const seated = await host.next('seated');

  const guest = player();
  await guest.open;
  guest.send({ type: 'join', code: seated.code, name: 'Nami' });
  await guest.next('seated');

  host.send({ type: 'secret', characterId: 'roronoa-zoro' }); // lo adivina Nami
  guest.send({ type: 'secret', characterId: 'nico-robin' }); // lo adivina Eric

  await host.next('view', (m) => m.view.phase === 'playing');
  await guest.next('view', (m) => m.view.phase === 'playing');

  return { host, guest, code: seated.code };
}

// ---------------------------------------------------------------------------
// El servidor sirve el juego (sección 6 de la espec v2)
// ---------------------------------------------------------------------------

test('el juego se sirve desde el mismo sitio que lo coordina', async () => {
  const page = await fetch(`http://localhost:${port}/`);

  assert.equal(page.status, 200);
  assert.match(page.headers.get('content-type'), /text\/html/);
  assert.match(await page.text(), /¿Quién soy\?/);

  const styles = await fetch(`http://localhost:${port}/styles/main.css`);
  assert.equal(styles.status, 200);
});

test('lo que no es público da 404', async () => {
  for (const path of ['/package.json', '/src/server/lobby.js', '/CLAUDE.md']) {
    const response = await fetch(`http://localhost:${port}${path}`);
    assert.equal(response.status, 404, `${path} no debería servirse`);
  }
});

// ---------------------------------------------------------------------------
// Criterio 1: una partida completa entre dos ordenadores
// ---------------------------------------------------------------------------

test('dos jugadores juegan una partida entera y piden la revancha', async () => {
  const { host, guest } = await playing();

  host.send({ type: 'ask', text: '¿Eres espadachín?' });
  const asked = await guest.next('view', (m) => m.view.pendingQuestion !== null);
  assert.equal(asked.view.pendingQuestion.text, '¿Eres espadachín?');

  guest.send({ type: 'answer', answer: 'a veces' });
  const answered = await host.next('view', (m) => m.view.history.length === 1);
  assert.equal(answered.view.history[0].answer, 'a veces');
  assert.equal(answered.view.turn, 2, 'responder da el turno');

  guest.send({ type: 'guess', characterId: 'roronoa-zoro' });
  const won = await guest.next('view', (m) => m.view.phase === 'finished');
  assert.equal(won.view.winner, 2);
  assert.equal(won.view.yourCharacter, 'Roronoa Zoro', 'al terminar se revela, con su nombre');
  assert.deepEqual(won.view.score, { 1: 0, 2: 1 });

  host.send({ type: 'rematch' });
  const again = await guest.next('view', (m) => m.view.phase === 'setup');
  assert.deepEqual(again.view.score, { 1: 0, 2: 1 }, 'el marcador se conserva');

  host.close();
  guest.close();
});

// ---------------------------------------------------------------------------
// Criterio 5 de la v2 y 8 de la v3: el secreto no viaja, ni como nombre ni como
// identificador
// ---------------------------------------------------------------------------

test('el personaje que debes adivinar no llega nunca a tu navegador', async () => {
  const { host, guest } = await playing();

  host.send({ type: 'ask', text: '¿Llevas sombrero?' });
  await guest.next('view', (m) => m.view.pendingQuestion !== null);
  guest.send({ type: 'answer', answer: 'no' });
  await host.next('view', (m) => m.view.history.length === 1);
  guest.send({ type: 'guess', characterId: 'sanji' });
  await host.next('view', (m) => m.view.history.length === 2);

  for (const rastro of ['Nico Robin', 'nico-robin']) {
    assert.ok(!host.wire().includes(rastro), `Eric no puede ver "${rastro}"`);
  }
  for (const rastro of ['Roronoa Zoro', 'roronoa-zoro']) {
    assert.ok(!guest.wire().includes(rastro), `Nami no puede ver "${rastro}"`);
  }
  assert.ok(host.wire().includes('Roronoa Zoro'), 'pero sí el personaje que eligió él');

  // El historial enseña nombres, no identificadores (criterio 7 de la v3).
  assert.ok(host.wire().includes('Sanji'));
  assert.ok(!host.wire().includes('"sanji"'));

  host.close();
  guest.close();
});

// Criterio 5 de la v3: el catálogo lo hace cumplir el servidor, no la interfaz.
test('un personaje que no está en el catálogo se rechaza aunque se mande a mano', async () => {
  const { host, guest } = await playing();

  // Le toca al anfitrión, así que el único reparo posible es el catálogo.
  host.send({ type: 'guess', characterId: 'pepito-grillo' });
  assert.match((await host.next('error')).message, /no está en el catálogo/);

  // Y un personaje escrito a mano, como en la v2, ya no tiene ni forma de acción.
  host.send({ type: 'guess', text: 'Roronoa Zoro' });
  assert.match((await host.next('error')).message, /personaje no existe/);

  host.close();
  guest.close();
});

// Criterio 9 de la v3: el catálogo se sirve como fichero estático.
test('el navegador puede pedir el catálogo por HTTP', async () => {
  const response = await fetch(`http://localhost:${port}/data/characters.json`);

  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /application\/json/);

  const catalog = await response.json();
  assert.ok(catalog.length > 100, `solo trae ${catalog.length} personajes`);
  assert.ok(catalog.some((entry) => entry.id === 'monkey-d-luffy'));
});

// ---------------------------------------------------------------------------
// Criterios 2 y 4: códigos, salas llenas y turnos
// ---------------------------------------------------------------------------

test('con un código que no existe no se entra', async () => {
  const visitor = player();
  await visitor.open;
  visitor.send({ type: 'join', code: 'ZZZZZ', name: 'Usopp' });

  assert.match((await visitor.next('error')).message, /No existe/);
  visitor.close();
});

test('un tercero con el código se queda fuera', async () => {
  const { host, guest, code } = await playing();
  const third = player();
  await third.open;
  third.send({ type: 'join', code, name: 'Usopp' });

  assert.match((await third.next('error')).message, /llena/);

  third.close();
  host.close();
  guest.close();
});

test('jugar fuera de turno se rechaza aunque se mande a mano', async () => {
  const { host, guest } = await playing();

  guest.send({ type: 'ask', text: '¿Soy pirata?' });
  assert.match((await guest.next('error')).message, /turno/);

  host.close();
  guest.close();
});

test('un mensaje que no se entiende no tira el servidor', async () => {
  const { host, guest } = await playing();

  host.send({ type: 'ganar' });
  assert.match((await host.next('error')).message, /no existe/);

  host.send({ type: 'ask', text: '¿Sigues ahí?' });
  await guest.next('view', (m) => m.view.pendingQuestion !== null);

  host.close();
  guest.close();
});

test('no se puede jugar sin estar en una sala', async () => {
  const loose = player();
  await loose.open;
  loose.send({ type: 'ask', text: '¿Hola?' });

  assert.match((await loose.next('error')).message, /ninguna sala/);
  loose.close();
});

// ---------------------------------------------------------------------------
// Criterios 13 y 14: caerse y volver
// ---------------------------------------------------------------------------

test('el rival ve la caída, y la vuelta', async () => {
  const { host, guest, code } = await playing();
  const token = host.wire().match(/"token":"([^"]+)"/)[1];

  host.close();
  await guest.next('view', (m) => m.view.rival.connected === false);

  const back = player();
  await back.open;
  back.send({ type: 'resume', code, token });

  const resumed = await back.next('view', (m) => m.view.phase === 'playing');
  assert.equal(resumed.view.you.id, 1);
  assert.equal(resumed.view.chosenForRival, 'Roronoa Zoro', 'la partida sigue donde estaba');
  await guest.next('view', (m) => m.view.rival.connected === true);

  back.close();
  guest.close();
});

test('sin el token no se recupera la plaza de nadie', async () => {
  const { host, guest, code } = await playing();
  host.close();

  const impostor = player();
  await impostor.open;
  impostor.send({ type: 'resume', code, token: 'me-lo-invento' });

  assert.match((await impostor.next('error')).message, /ya no existe/);

  impostor.close();
  guest.close();
});

// ---------------------------------------------------------------------------
// Criterio 15: la sala caduca y se avisa a quien siga dentro
// ---------------------------------------------------------------------------

test('una sala abandonada caduca y echa a quien quedaba', async () => {
  // Un lobby con el reloj en la mano y un barrido que no hace esperar al test.
  let clock = 1_000_000;
  const impatient = startServer({
    port: 0,
    root,
    lobby: createLobby({ catalog: loadCatalog(root), now: () => clock }),
    upkeepMs: 20,
  });
  const impatientPort = await impatient.listen();

  const alone = player(impatientPort);
  await alone.open;
  alone.send({ type: 'create', name: 'Eric' });

  // Hay que esperar a estar sentado: si el reloj salta antes de que el servidor
  // atienda el mensaje, la sala nacería ya con la hora nueva y no caducaría.
  await alone.next('seated');
  clock += ROOM_TTL_MS + 1; // nadie ha venido a jugar

  assert.match((await alone.next('expired')).message, /caducado/);

  alone.close();
  await impatient.close();
});
