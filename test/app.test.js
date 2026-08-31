import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  confirmsLeaving,
  dressedAnime,
  initialModel,
  reconnected,
  receive,
  sending,
  withStatus,
} from '../src/client/app.js';

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

// ---------------------------------------------------------------------------
// Salir de la sala
// ---------------------------------------------------------------------------

test('salir te devuelve a la entrada, sin nada que leer y sin plaza guardada', () => {
  const { model, session } = receive(playing(), { type: 'left' });

  assert.equal(model.view, null);
  assert.equal(model.error, null, 'la sala la has cerrado tú: no hay aviso que dar');
  assert.equal(session, 'forget');
});

test('que se salga el rival sí se avisa, y también te saca de la sala', () => {
  const { model, session } = receive(playing(), {
    type: 'expired',
    message: 'Nami ha salido de la sala',
  });

  assert.equal(model.view, null);
  assert.equal(model.error, 'Nami ha salido de la sala');
  assert.equal(session, 'forget');
});

test('con el rival sentado se pregunta antes de salir; esperando solo, no', () => {
  assert.ok(confirmsLeaving({ ...VIEW, rival: { id: 2, name: 'Nami' } }));
  assert.ok(!confirmsLeaving({ ...VIEW, rival: null }));
  assert.ok(!confirmsLeaving(null), 'sin sala no hay de qué salir');
});

// ---------------------------------------------------------------------------
// De qué anime se viste la pantalla (v4)
// ---------------------------------------------------------------------------

test('fuera de una sala manda el anime que llevas señalado', () => {
  assert.equal(dressedAnime(null, 'hunter-x-hunter'), 'hunter-x-hunter');
});

// Criterio 3: quien entra con el código no elige, y lo que llevara señalado antes no
// puede colarse por encima del anime de la sala.
test('dentro de una sala manda el suyo, se hubiera señalado el que fuera', () => {
  const view = { anime: { id: 'hunter-x-hunter', name: 'Hunter × Hunter' } };

  assert.equal(dressedAnime(view, 'one-piece'), 'hunter-x-hunter');
});

// Es también lo que hace que salir de una sala no te devuelva al anime de por
// defecto: al entrar, el suyo pasa a ser el que llevas señalado, y al salir sigue.
test('el anime de la sala se queda señalado cuando te quedas sin sala', () => {
  const view = { anime: { id: 'hunter-x-hunter', name: 'Hunter × Hunter' } };
  const remembered = dressedAnime(view, 'one-piece');

  assert.equal(dressedAnime(null, remembered), 'hunter-x-hunter');
});
