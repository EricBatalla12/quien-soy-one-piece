import { test } from 'node:test';
import assert from 'node:assert/strict';

import { initialModel, reconnected, receive, sending, withStatus } from '../src/client/app.js';

const SESSION = { code: 'NAKAM', token: 'abc' };
const VIEW = { code: 'NAKAM', phase: 'playing', you: { id: 1, name: 'Eric' } };

/** El modelo de quien ya está sentado y jugando. */
function playing() {
  return receive(initialModel(), { type: 'view', view: VIEW }).model;
}

test('se empieza sin sala y conectando', () => {
  const model = initialModel();

  assert.equal(model.view, null);
  assert.equal(model.status, 'connecting');
  assert.equal(model.error, null);
});

test('la vista que llega es la que se pinta', () => {
  const { model, session } = receive(initialModel(), { type: 'view', view: VIEW });

  assert.deepEqual(model.view, VIEW);
  assert.equal(session, 'keep');
});

test('sentarse guarda el token; recuperar la plaza no lo cambia', () => {
  const seated = receive(initialModel(), { type: 'seated', code: 'NAKAM', token: 'abc' });
  assert.deepEqual(seated.session, SESSION);

  const resumed = receive(initialModel(), { type: 'seated', code: 'NAKAM' });
  assert.equal(resumed.session, 'keep');
});

test('el error del servidor se enseña sin perder la partida', () => {
  const { model, session } = receive(playing(), { type: 'error', message: 'No es tu turno' });

  assert.equal(model.error, 'No es tu turno');
  assert.deepEqual(model.view, VIEW, 'sigues en la sala');
  assert.equal(session, 'keep');
});

test('la vista siguiente borra el error anterior', () => {
  const failed = receive(playing(), { type: 'error', message: 'No es tu turno' }).model;
  const { model } = receive(failed, { type: 'view', view: VIEW });

  assert.equal(model.error, null);
});

test('mandar una acción borra el error de la anterior', () => {
  const failed = receive(playing(), { type: 'error', message: 'No es tu turno' }).model;

  assert.equal(sending(failed).error, null);
});

// ---------------------------------------------------------------------------
// Criterio 14: volver a la partida, o enterarse de que ya no está
// ---------------------------------------------------------------------------

test('al abrirse el socket se presenta el token guardado', () => {
  const { model, send } = reconnected(initialModel(), SESSION);

  assert.deepEqual(send, { type: 'resume', code: 'NAKAM', token: 'abc' });
  assert.equal(model.resuming, true);
});

test('sin token guardado no se pide ninguna plaza', () => {
  const { model, send } = reconnected(initialModel(), null);

  assert.equal(send, null);
  assert.equal(model.resuming, false);
});

test('si la sala ya no existe, se olvida y se dice por qué', () => {
  const asking = reconnected(initialModel(), SESSION).model;
  const { model, session } = receive(asking, {
    type: 'error',
    message: 'No existe ninguna sala con ese código',
  });

  assert.equal(session, 'forget');
  assert.equal(model.view, null);
  assert.equal(model.resuming, false);
  assert.match(model.error, /caducado|reiniciado/);
  assert.ok(!model.error.includes('código'), 'nadie ha tecleado ningún código');
});

test('recuperada la plaza, el siguiente error ya es un error normal', () => {
  let model = reconnected(initialModel(), SESSION).model;
  model = receive(model, { type: 'seated', code: 'NAKAM' }).model;
  model = receive(model, { type: 'view', view: VIEW }).model;

  const { model: after, session } = receive(model, { type: 'error', message: 'No es tu turno' });

  assert.equal(session, 'keep');
  assert.equal(after.error, 'No es tu turno');
  assert.deepEqual(after.view, VIEW);
});

// ---------------------------------------------------------------------------
// Criterio 15: la sala caduca mientras juegas
// ---------------------------------------------------------------------------

test('si la sala caduca se vuelve a la entrada con el motivo', () => {
  const { model, session } = receive(playing(), {
    type: 'expired',
    message: 'La sala ha caducado',
  });

  assert.equal(session, 'forget');
  assert.equal(model.view, null);
  assert.equal(model.error, 'La sala ha caducado');
});

// ---------------------------------------------------------------------------
// Conexión
// ---------------------------------------------------------------------------

test('el estado de la conexión no toca la partida', () => {
  const model = withStatus(playing(), 'offline');

  assert.equal(model.status, 'offline');
  assert.deepEqual(model.view, VIEW);
});

test('un mensaje desconocido no cambia nada', () => {
  const before = playing();
  const { model, session } = receive(before, { type: 'algo-nuevo' });

  assert.equal(model, before);
  assert.equal(session, 'keep');
});
