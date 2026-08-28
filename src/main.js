/**
 * Une las tres capas: escucha al usuario, aplica las reglas, difunde el resultado
 * y vuelve a pintar.
 */

import { createGame, setSecret, askQuestion, answerQuestion, guess, reset } from './game/state.js';
import { connect } from './sync/channel.js';
import { render } from './ui/render.js';

const app = document.getElementById('app');

let state = createGame();
let error = null;

const canal = await connect({
  onRemoteState(remoto) {
    // La otra pestaña ha jugado: adoptamos su estado y repintamos.
    state = remoto;
    error = null;
    paint();
  },
});

if (canal.initialState !== null) state = canal.initialState;
paint();

/**
 * Ejecuta una acción del juego. Si las reglas la rechazan, se enseña el motivo en
 * vez de romper la página.
 */
function apply(accion) {
  try {
    state = accion(state);
    error = null;
    canal.publish(state);
  } catch (e) {
    error = e.message;
  }
  paint();
}

function paint() {
  app.innerHTML = render(state, canal.playerId, error);
}

app.addEventListener('submit', (event) => {
  event.preventDefault();

  const texto = new FormData(event.target).get('texto');
  const yo = canal.playerId;

  switch (event.target.id) {
    case 'form-secreto':
      apply((s) => setSecret(s, yo, texto));
      break;
    case 'form-pregunta':
      apply((s) => askQuestion(s, yo, texto));
      break;
    case 'form-adivinar':
      apply((s) => guess(s, yo, texto));
      break;
  }
});

app.addEventListener('click', (event) => {
  const respuesta = event.target.dataset.respuesta;
  if (respuesta !== undefined) {
    apply((s) => answerQuestion(s, canal.playerId, respuesta));
    return;
  }

  if (event.target.id === 'reiniciar') apply(() => reset());
});
