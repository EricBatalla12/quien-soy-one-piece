/**
 * Une las tres capas: escucha al usuario, aplica las reglas, difunde el resultado
 * y vuelve a pintar.
 */

import {
  createGame,
  setSecret,
  askQuestion,
  answerQuestion,
  guess,
  reset,
  reconcile,
} from './game/state.js';
import { connect } from './sync/channel.js';
import { render } from './ui/render.js';

const app = document.getElementById('app');

let state = createGame();
let error = null;
let channel = null;

try {
  // getState: el canal no guarda la partida, se la pide a quien la tiene.
  channel = await connect({ onRemoteState, getState: () => state });
} catch (cause) {
  showFatal(
    'No se ha podido abrir el canal entre pestañas. Si has abierto el fichero ' +
      'directamente, sírvelo por HTTP con <code>npm run dev</code>.',
  );
  throw cause;
}

// Puede haber llegado estado durante la conexión, así que se combina en vez de pisar.
if (channel.initialState !== null) state = reconcile(state, channel.initialState);
paint();

/** La otra pestaña ha jugado. */
function onRemoteState(remote) {
  state = reconcile(state, remote);
  error = null;

  // Todavía dentro de connect(): aún no sabemos qué jugador somos, no se puede pintar.
  if (channel === null) return;

  paint();
}

/**
 * Ejecuta una acción del juego. Si las reglas la rechazan, se enseña el motivo en
 * vez de romper la página.
 */
function apply(action) {
  try {
    state = action(state);
    error = null;
    channel.publish(state);
  } catch (cause) {
    error = cause.message;
  }
  paint();
}

function paint() {
  const typed = captureTyping();
  app.innerHTML = render(state, channel.playerId, error);
  restoreTyping(typed);
}

/**
 * Repintamos la pantalla entera en cada cambio. En la preparación los dos jugadores
 * escriben a la vez, así que sin esto el mensaje del rival te borraría el texto a
 * medio escribir y te quitaría el foco.
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

/** Error del que no se puede volver: la partida no puede continuar. */
function showFatal(message) {
  app.innerHTML = `<p class="error">${message}</p>`;
}

app.addEventListener('submit', (event) => {
  event.preventDefault();

  const text = new FormData(event.target).get('text');
  const me = channel.playerId;

  switch (event.target.id) {
    case 'secret-form':
      apply((s) => setSecret(s, me, text));
      break;
    case 'question-form':
      apply((s) => askQuestion(s, me, text));
      break;
    case 'guess-form':
      apply((s) => guess(s, me, text));
      break;
  }
});

app.addEventListener('click', (event) => {
  const answer = event.target.dataset.answer;
  if (answer !== undefined) {
    apply((s) => answerQuestion(s, channel.playerId, answer));
    return;
  }

  if (event.target.id === 'restart') apply(() => reset());
});
