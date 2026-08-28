/**
 * Une las capas del navegador: escucha al usuario, manda la acción al servidor y
 * pinta lo que el servidor conteste.
 *
 * Aquí no se decide nada. En la v1 este fichero aplicaba la jugada y luego la
 * difundía; ahora la jugada la aplica el servidor y qué hacer con su respuesta lo
 * decide `app.js`, que es puro y está testeado. Lo que queda es el pegamento con el
 * navegador: el DOM, el almacén y el socket.
 */

import { initialModel, reconnected, receive, sending, withStatus } from './app.js';
import { connect, socketUrl } from './sync/connection.js';
import { nextScrollTop } from './ui/scroll.js';
import { clearSession, readSession, writeSession } from './session.js';
import { render } from './ui/render.js';

const app = document.getElementById('app');

let model = initialModel();

const connection = connect({
  url: socketUrl(window.location),
  onOpen: presentToken,
  onMessage: handle,
  onStatus: (status) => {
    model = withStatus(model, status);
    paint();
  },
});

paint();

/**
 * Nada más abrir el socket, y también después de cada reconexión, se presenta el
 * token guardado: es lo que hace que recargar o perder la conexión no te eche de la
 * partida (criterio 14).
 */
function presentToken() {
  const { model: next, send } = reconnected(model, readSession(sessionStorage));
  model = next;
  if (send !== null) connection.send(send);
}

function handle(message) {
  const { model: next, session } = receive(model, message);
  model = next;
  applyToSession(session);
  paint();
}

function applyToSession(session) {
  if (session === 'keep') return;
  if (session === 'forget') {
    clearSession(sessionStorage);
    return;
  }

  writeSession(sessionStorage, session);
}

function send(message) {
  model = sending(model);
  connection.send(message);
  paint();
}

function paint() {
  const typed = captureTyping();
  const scrolled = captureScroll();

  app.innerHTML = render(model);

  restoreTyping(typed);
  restoreScroll(scrolled);
}

/**
 * El historial se desplaza por dentro, así que hay que devolverlo a su sitio: si no,
 * cada mensaje del rival te llevaría de vuelta a la primera pregunta de la partida.
 */
function captureScroll() {
  const log = app.querySelector('.history');
  if (log === null) return null;

  return { scrollTop: log.scrollTop, scrollHeight: log.scrollHeight, clientHeight: log.clientHeight };
}

function restoreScroll(before) {
  const log = app.querySelector('.history');
  if (log === null) return;

  log.scrollTop = nextScrollTop(before, {
    scrollHeight: log.scrollHeight,
    clientHeight: log.clientHeight,
  });
}

/**
 * Repintamos la pantalla entera con cada mensaje del servidor. En la preparación los
 * dos jugadores escriben a la vez, así que sin esto el mensaje del rival te borraría
 * el texto a medio escribir y te quitaría el foco.
 */
function captureTyping() {
  const active = document.activeElement;
  const values = new Map();

  for (const input of app.querySelectorAll('input[type="text"]')) {
    if (input.value !== '') values.set(input.id, input.value);
  }

  return {
    values,
    focused: active === null ? null : active.id,
    cursor: active instanceof HTMLInputElement ? active.selectionStart : null,
  };
}

function restoreTyping({ values, focused, cursor }) {
  for (const [id, value] of values) {
    const input = app.querySelector(`#${id}`);
    if (input !== null) input.value = value;
  }

  const input = focused ? app.querySelector(`#${focused}`) : null;
  if (input === null) return;

  input.focus();
  if (cursor !== null) input.setSelectionRange(cursor, cursor);
}

app.addEventListener('submit', (event) => {
  event.preventDefault();

  const text = new FormData(event.target).get('text');

  switch (event.target.id) {
    // El nombre se escribe una sola vez y vale para crear y para entrar, así que se
    // lee del campo y no del formulario que se acaba de enviar.
    case 'create-form':
      send({ type: 'create', name: valueOf('#name-input') });
      break;
    case 'join-form':
      send({ type: 'join', code: valueOf('#code-input'), name: valueOf('#name-input') });
      break;

    case 'secret-form':
      send({ type: 'secret', text });
      break;
    case 'question-form':
      send({ type: 'ask', text });
      break;
    case 'guess-form':
      send({ type: 'guess', text });
      break;
  }
});

app.addEventListener('click', (event) => {
  const answer = event.target.dataset.answer;
  if (answer !== undefined) {
    send({ type: 'answer', answer });
    return;
  }

  if (event.target.id === 'rematch') send({ type: 'rematch' });
});

function valueOf(selector) {
  return app.querySelector(selector)?.value ?? '';
}
