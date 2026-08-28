/**
 * Estado → HTML. Esta capa no decide reglas: solo enseña lo que hay.
 *
 * Nunca se pinta `secretFor[playerId]`: es justo el personaje que este jugador
 * tiene que adivinar. Sí se pinta el del rival, porque lo escribió él mismo.
 */

import { ANSWERS, opponent } from '../game/state.js';
import { normalizeName } from '../game/normalize.js';

/** Calavera pirata con sombrero de paja. Dibujo propio, sin arte con derechos. */
const EMBLEMA = `
  <svg class="emblema" viewBox="0 0 100 100" aria-hidden="true">
    <g class="huesos">
      <path d="M18 74 L82 46" /><path d="M18 46 L82 74" />
      <circle cx="16" cy="74" r="6" /><circle cx="84" cy="46" r="6" />
      <circle cx="16" cy="46" r="6" /><circle cx="84" cy="74" r="6" />
    </g>
    <path class="craneo" d="M50 30 C64 30 73 40 73 53 C73 62 68 68 62 71 L62 79 C62 82 59 84 50 84
      C41 84 38 82 38 79 L38 71 C32 68 27 62 27 53 C27 40 36 30 50 30 Z" />
    <ellipse class="ojo" cx="41" cy="54" rx="6.5" ry="7.5" />
    <ellipse class="ojo" cx="59" cy="54" rx="6.5" ry="7.5" />
    <path class="ojo" d="M50 63 L46 71 L54 71 Z" />
    <ellipse class="ala" cx="50" cy="30" rx="34" ry="8" />
    <path class="copa" d="M31 30 C31 18 38 12 50 12 C62 12 69 18 69 30 Z" />
    <path class="cinta" d="M31 27 L69 27 L69 31 L31 31 Z" />
  </svg>
`;

export function render(state, playerId, error) {
  if (playerId === null) {
    return `<p class="aviso">Ya hay dos jugadores en esta partida. Cierra alguna pestaña y recarga.</p>`;
  }

  const pantalla =
    state.phase === 'setup'
      ? pantallaPreparacion(state, playerId)
      : state.phase === 'playing'
        ? pantallaJuego(state, playerId)
        : pantallaFinal(state, playerId);

  return `
    <header>
      ${EMBLEMA}
      <h1>¿Quién soy?</h1>
      <p class="jugador">Jugador ${playerId}</p>
    </header>
    ${error ? `<p class="error">${escapeHtml(error)}</p>` : ''}
    ${pantalla}
  `;
}

function pantallaPreparacion(state, playerId) {
  const rival = opponent(playerId);
  const yaEscribi = state.secretFor[rival] !== null;

  if (yaEscribi) {
    return `
      <section>
        <p>Has elegido <strong>${escapeHtml(state.secretFor[rival])}</strong> para tu rival.</p>
        <p class="espera">Esperando a que el jugador ${rival} elija el tuyo…</p>
      </section>
    `;
  }

  return `
    <section>
      <h2>Elige el personaje del jugador ${rival}</h2>
      <p>Escribe el personaje que tu rival tendrá que adivinar. No dejes que lo vea.</p>
      <form id="form-secreto">
        <input id="entrada-secreto" name="texto" type="text" autocomplete="off" placeholder="Roronoa Zoro" required />
        <button type="submit">Listo</button>
      </form>
    </section>
  `;
}

function pantallaJuego(state, playerId) {
  const esMiTurno = state.turn === playerId;
  const pendiente = state.pendingQuestion;

  let acciones;
  if (pendiente !== null && pendiente.from !== playerId) {
    acciones = `
      <section class="acciones">
        <h2>Te preguntan:</h2>
        <blockquote>${escapeHtml(pendiente.text)}</blockquote>
        <div class="respuestas">
          ${ANSWERS.map(
            (r) => `<button type="button" data-respuesta="${escapeHtml(r)}">${escapeHtml(r)}</button>`,
          ).join('')}
        </div>
      </section>
    `;
  } else if (pendiente !== null) {
    acciones = `<p class="espera">Esperando a que el jugador ${opponent(playerId)} responda…</p>`;
  } else if (esMiTurno) {
    acciones = `
      <section class="acciones">
        <h2>Es tu turno</h2>
        <form id="form-pregunta">
          <input id="entrada-pregunta" name="texto" type="text" autocomplete="off" placeholder="¿Eres espadachín?" required />
          <button type="submit">Preguntar</button>
        </form>
        <p class="o">o arriésgate</p>
        <form id="form-adivinar">
          <input id="entrada-adivinar" name="texto" type="text" autocomplete="off" placeholder="Creo que soy…" required />
          <button type="submit">Adivinar</button>
        </form>
      </section>
    `;
  } else {
    acciones = `<p class="espera">Turno del jugador ${state.turn}…</p>`;
  }

  return `
    <p class="mision">Tienes que averiguar qué personaje eres.</p>
    ${historial(state, playerId)}
    ${acciones}
  `;
}

function pantallaFinal(state, playerId) {
  const heGanado = state.winner === playerId;
  return `
    <section class="final">
      <h2>${heGanado ? '¡Has ganado!' : `Ha ganado el jugador ${state.winner}`}</h2>
      <p>Eras <strong>${escapeHtml(state.secretFor[playerId])}</strong>.</p>
      ${historial(state, playerId)}
      <button type="button" id="reiniciar">Jugar otra vez</button>
    </section>
  `;
}

function historial(state, playerId) {
  if (state.history.length === 0) {
    return `<p class="historial-vacio">Todavía no se ha preguntado nada.</p>`;
  }

  const filas = state.history
    .map((entrada) => {
      const mia = entrada.from === playerId;
      const quien = mia ? 'Tú' : `Jugador ${escapeHtml(entrada.from)}`;
      const texto =
        entrada.kind === 'guess'
          ? `${mia ? 'te arriesgaste' : 'se arriesgó'} con «${escapeHtml(entrada.text)}»`
          : `${escapeHtml(entrada.text)}`;
      const clave = escapeHtml(normalizeName(entrada.answer).replaceAll(' ', '-'));
      return `<li><span class="quien">${quien}</span> <span class="dicho">${texto}</span> <span class="respuesta" data-valor="${clave}">${escapeHtml(entrada.answer)}</span></li>`;
    })
    .join('');

  return `<ol class="historial">${filas}</ol>`;
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
