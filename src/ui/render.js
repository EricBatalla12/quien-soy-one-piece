/**
 * Estado → HTML. Esta capa no decide reglas: solo enseña lo que hay.
 *
 * Nunca se pinta `secretFor[playerId]`: es justo el personaje que este jugador
 * tiene que adivinar. Sí se pinta el del rival, porque lo escribió él mismo.
 */

import { ANSWERS, opponent } from '../game/state.js';

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
      <h1>¿Quién soy?</h1>
      <p class="jugador">Eres el jugador ${playerId}</p>
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
        <input name="texto" type="text" autocomplete="off" placeholder="Roronoa Zoro" required />
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
          <input name="texto" type="text" autocomplete="off" placeholder="¿Eres espadachín?" required />
          <button type="submit">Preguntar</button>
        </form>
        <p class="o">o arriésgate</p>
        <form id="form-adivinar">
          <input name="texto" type="text" autocomplete="off" placeholder="Creo que soy…" required />
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
      const quien = mia ? 'Tú' : `Jugador ${entrada.from}`;
      const texto =
        entrada.kind === 'guess'
          ? `${mia ? 'te arriesgaste' : 'se arriesgó'} con «${escapeHtml(entrada.text)}»`
          : `${escapeHtml(entrada.text)}`;
      return `<li><span class="quien">${quien}</span> ${texto} <span class="respuesta">${escapeHtml(entrada.answer)}</span></li>`;
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
    .replaceAll('"', '&quot;');
}
