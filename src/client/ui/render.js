/**
 * Estado → HTML. Esta capa no decide reglas: solo enseña lo que hay.
 *
 * Nunca se pinta `secretFor[playerId]`: es justo el personaje que este jugador
 * tiene que adivinar. Sí se pinta el del rival, porque lo escribió él mismo.
 */

import { ANSWERS, opponent } from '../../game/state.js';

/**
 * Clave con la que cada respuesta se pinta de un color.
 *
 * Está atada a los selectores `[data-value=…]` de `styles/main.css`. Se escribe a
 * mano, y no derivándola de `normalizeName`, para que esa función tenga un solo
 * cometido —comparar personajes— y cambiarla no descoloque los colores sin avisar.
 * Hay un test que comprueba que las tres respuestas del juego sigan teniendo la
 * suya y que el CSS las contemple.
 */
const ANSWER_KEYS = new Map([
  ['sí', 'yes'],
  ['no', 'no'],
  ['a veces', 'sometimes'],
]);

export function answerKey(answer) {
  return ANSWER_KEYS.get(answer) ?? 'unknown';
}

/** Calavera pirata con sombrero de paja. Dibujo propio, sin arte con derechos. */
const EMBLEM = `
  <svg class="emblem" viewBox="0 0 100 100" aria-hidden="true">
    <g class="bones">
      <path d="M18 74 L82 46" /><path d="M18 46 L82 74" />
      <circle cx="16" cy="74" r="6" /><circle cx="84" cy="46" r="6" />
      <circle cx="16" cy="46" r="6" /><circle cx="84" cy="74" r="6" />
    </g>
    <path class="skull" d="M50 30 C64 30 73 40 73 53 C73 62 68 68 62 71 L62 79 C62 82 59 84 50 84
      C41 84 38 82 38 79 L38 71 C32 68 27 62 27 53 C27 40 36 30 50 30 Z" />
    <ellipse class="eye" cx="41" cy="54" rx="6.5" ry="7.5" />
    <ellipse class="eye" cx="59" cy="54" rx="6.5" ry="7.5" />
    <path class="eye" d="M50 63 L46 71 L54 71 Z" />
    <ellipse class="brim" cx="50" cy="30" rx="34" ry="8" />
    <path class="crown" d="M31 30 C31 18 38 12 50 12 C62 12 69 18 69 30 Z" />
    <path class="band" d="M31 27 L69 27 L69 31 L31 31 Z" />
  </svg>
`;

export function render(state, playerId, error) {
  if (playerId === null) {
    return `<p class="notice">Ya hay dos jugadores en esta partida. Cierra alguna pestaña y recarga.</p>`;
  }

  const screen =
    state.phase === 'setup'
      ? setupScreen(state, playerId)
      : state.phase === 'playing'
        ? boardScreen(state, playerId)
        : endScreen(state, playerId);

  return `
    <header>
      ${EMBLEM}
      <h1>¿Quién soy?</h1>
      <p class="player">Jugador ${playerId}</p>
    </header>
    ${error ? `<p class="error">${escapeHtml(error)}</p>` : ''}
    ${screen}
  `;
}

function setupScreen(state, playerId) {
  const rivalId = opponent(playerId);
  const hasChosen = state.secretFor[rivalId] !== null;

  if (hasChosen) {
    return `
      <section>
        <p>Has elegido <strong>${escapeHtml(state.secretFor[rivalId])}</strong> para tu rival.</p>
        <p class="waiting">Esperando a que el jugador ${rivalId} elija el tuyo…</p>
      </section>
    `;
  }

  return `
    <section>
      <h2>Elige el personaje del jugador ${rivalId}</h2>
      <p>Escribe el personaje que tu rival tendrá que adivinar. No dejes que lo vea.</p>
      <form id="secret-form">
        <input id="secret-input" name="text" type="text" autocomplete="off" placeholder="Roronoa Zoro" required />
        <button type="submit">Listo</button>
      </form>
    </section>
  `;
}

function boardScreen(state, playerId) {
  const isMyTurn = state.turn === playerId;
  const pending = state.pendingQuestion;

  let actions;
  if (pending !== null && pending.from !== playerId) {
    actions = `
      <section class="actions">
        <h2>Te preguntan:</h2>
        <blockquote>${escapeHtml(pending.text)}</blockquote>
        <div class="answers">
          ${ANSWERS.map(
            (answer) =>
              `<button type="button" data-answer="${escapeHtml(answer)}">${escapeHtml(answer)}</button>`,
          ).join('')}
        </div>
      </section>
    `;
  } else if (pending !== null) {
    actions = `<p class="waiting">Esperando a que el jugador ${opponent(playerId)} responda…</p>`;
  } else if (isMyTurn) {
    actions = `
      <section class="actions">
        <h2>Es tu turno</h2>
        <form id="question-form">
          <input id="question-input" name="text" type="text" autocomplete="off" placeholder="¿Eres espadachín?" required />
          <button type="submit">Preguntar</button>
        </form>
        <p class="or">o arriésgate</p>
        <form id="guess-form">
          <input id="guess-input" name="text" type="text" autocomplete="off" placeholder="Creo que soy…" required />
          <button type="submit">Adivinar</button>
        </form>
      </section>
    `;
  } else {
    actions = `<p class="waiting">Turno del jugador ${state.turn}…</p>`;
  }

  return `
    <p class="mission">Tienes que averiguar qué personaje eres.</p>
    ${historyList(state, playerId)}
    ${actions}
  `;
}

function endScreen(state, playerId) {
  const iWon = state.winner === playerId;
  return `
    <section class="final">
      <h2>${iWon ? '¡Has ganado!' : `Ha ganado el jugador ${state.winner}`}</h2>
      <p>Eras <strong>${escapeHtml(state.secretFor[playerId])}</strong>.</p>
      ${historyList(state, playerId)}
      <button type="button" id="restart">Jugar otra vez</button>
    </section>
  `;
}

function historyList(state, playerId) {
  if (state.history.length === 0) {
    return `<p class="history-empty">Todavía no se ha preguntado nada.</p>`;
  }

  const rows = state.history
    .map((entry) => {
      const isMine = entry.from === playerId;
      const who = isMine ? 'Tú' : `Jugador ${escapeHtml(entry.from)}`;
      const said =
        entry.kind === 'guess'
          ? `${isMine ? 'te arriesgaste' : 'se arriesgó'} con «${escapeHtml(entry.text)}»`
          : `${escapeHtml(entry.text)}`;
      const key = escapeHtml(answerKey(entry.answer));
      return `<li><span class="who">${who}</span> <span class="said">${said}</span> <span class="answer" data-value="${key}">${escapeHtml(entry.answer)}</span></li>`;
    })
    .join('');

  return `<ol class="history">${rows}</ol>`;
}

/**
 * Las preguntas y los nombres los escriben los jugadores, así que podrían contener
 * HTML. Se escapan antes de meterlos en la página: si no, escribir <script> en una
 * pregunta ejecutaría código en la pestaña del rival.
 */
function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    // Hoy todos los atributos van entre comillas dobles, así que la simple es
    // inofensiva. Se escapa igual para que no dependa de esa costumbre.
    .replaceAll("'", '&#39;');
}
