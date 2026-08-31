import { test } from 'node:test';
import assert from 'node:assert/strict';

import { WORLDS } from '../src/game/worlds.js';
import { MAX_TEXT_LENGTH, isEntryType, readMessage } from '../src/server/protocol.js';

/** Como llega de verdad: texto, no objeto. */
function wire(message) {
  return JSON.stringify(message);
}

test('las acciones buenas pasan y salen limpias', () => {
  assert.deepEqual(readMessage(wire({ type: 'create', name: '  Eric  ', world: 'one-piece' })), {
    type: 'create',
    name: 'Eric',
    world: 'one-piece',
  });
  assert.deepEqual(readMessage(wire({ type: 'join', code: 'nakam', name: 'Nami' })), {
    type: 'join',
    code: 'NAKAM',
    name: 'Nami',
  });
  assert.deepEqual(readMessage(wire({ type: 'resume', code: 'NAKAM', token: 'abc' })), {
    type: 'resume',
    code: 'NAKAM',
    token: 'abc',
  });
  assert.deepEqual(readMessage(wire({ type: 'answer', answer: 'a veces' })), {
    type: 'answer',
    answer: 'a veces',
  });
  assert.deepEqual(readMessage(wire({ type: 'rematch' })), { type: 'rematch' });
  assert.deepEqual(readMessage(wire({ type: 'leave' })), { type: 'leave' });
});

test('lo que no es un mensaje no se entiende', () => {
  for (const bad of ['', 'hola', '[]', 'null', '42', '{"type":']) {
    assert.throws(() => readMessage(bad), /no se entiende|no existe/, `${bad} debería fallar`);
  }
});

test('una acción inventada se rechaza', () => {
  assert.throws(() => readMessage(wire({ type: 'ganar' })), /no existe/);
  assert.throws(() => readMessage(wire({ type: '__proto__' })), /no existe/);
});

test('los textos vacíos no pasan, y el error dice cuál', () => {
  assert.throws(() => readMessage(wire({ type: 'ask', text: '   ' })), /pregunta no puede/);
  assert.throws(
    () => readMessage(wire({ type: 'create', name: 42, world: 'one-piece' })),
    /nombre no puede/,
  );
});

// Criterio 5 de la v3: el personaje viaja como identificador, y aquí se mira que al
// menos tenga esa forma. Que además exista lo comprueban las reglas.
test('el personaje viaja como identificador y sale tal cual', () => {
  for (const type of ['secret', 'guess']) {
    assert.deepEqual(readMessage(wire({ type, characterId: 'monkey-d-luffy' })), {
      type,
      characterId: 'monkey-d-luffy',
    });
  }
});

test('lo que no tiene forma de identificador de personaje no pasa', () => {
  for (const bad of ['', 'Monkey D. Luffy', 'monkey d luffy', '-luffy', 42, null, undefined]) {
    for (const type of ['secret', 'guess']) {
      assert.throws(
        () => readMessage(wire({ type, characterId: bad })),
        /personaje no existe/,
        `${type} con ${JSON.stringify(bad)} debería fallar`,
      );
    }
  }
});

test('el personaje ya no se manda como texto libre', () => {
  assert.throws(() => readMessage(wire({ type: 'secret', text: 'Roronoa Zoro' })), /personaje/);
  assert.throws(() => readMessage(wire({ type: 'guess', text: 'Roronoa Zoro' })), /personaje/);
});

test('un texto enorme no pasa', () => {
  const huge = 'a'.repeat(MAX_TEXT_LENGTH + 1);

  assert.throws(() => readMessage(wire({ type: 'ask', text: huge })), /demasiado largo/);
});

test('un texto en el límite sí pasa', () => {
  const limit = 'a'.repeat(MAX_TEXT_LENGTH);

  assert.equal(readMessage(wire({ type: 'ask', text: limit })).text, limit);
});

test('los códigos mal formados no pasan', () => {
  for (const bad of ['', 'NAKA', 'NAKAMI', 'NAK4M', 123, null]) {
    assert.throws(() => readMessage(wire({ type: 'join', code: bad, name: 'Eric' })), /código/);
  }
});

test('sin token no se recupera ninguna plaza', () => {
  assert.throws(() => readMessage(wire({ type: 'resume', code: 'NAKAM' })), /identificación/);
  assert.throws(
    () => readMessage(wire({ type: 'resume', code: 'NAKAM', token: '' })),
    /identificación/,
  );
});

test('solo valen las tres respuestas del juego', () => {
  for (const bad of ['quizá', 'SÍ', '', 1, true]) {
    assert.throws(() => readMessage(wire({ type: 'answer', answer: bad })), /respuesta/);
  }
});

test('se distingue entrar en una sala de jugar dentro de ella', () => {
  for (const type of ['create', 'join', 'resume']) assert.ok(isEntryType(type));
  for (const type of ['secret', 'ask', 'answer', 'guess', 'rematch', 'leave']) {
    assert.ok(!isEntryType(type));
  }
});

// Criterio 6 de la v4: una sala de un mundo que no existe se rechaza en la puerta,
// también si el `create` se escribe a mano por el WebSocket.
test('crear una sala de un mundo inventado no cuela', () => {
  for (const bad of [undefined, null, 42, '', 'naruto', 'One Piece', '__proto__']) {
    assert.throws(
      () => readMessage(wire({ type: 'create', name: 'Eric', world: bad })),
      /mundo no existe/,
      `${JSON.stringify(bad)} no debería valer como mundo`,
    );
  }
});

test('los mundos del registro sí pasan', () => {
  for (const world of WORLDS.map((w) => w.id)) {
    assert.equal(readMessage(wire({ type: 'create', name: 'Eric', world })).world, world);
  }
});
