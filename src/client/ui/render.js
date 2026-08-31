/**
 * Vista → HTML. Esta capa no decide reglas: solo enseña lo que el servidor manda.
 *
 * En la v1 aquí había que tener cuidado de no pintar el personaje que el jugador
 * debía adivinar, porque la pestaña lo tenía delante. Ahora no está: la vista que
 * llega no lo trae hasta que la partida termina (ver `src/game/view.js`). Este
 * fichero ya no puede filtrar nada aunque se equivoque.
 *
 * Desde la v3 pinta también el selector de personaje. Buscar es cosa del catálogo y
 * llevar la cuenta de lo elegido es cosa de `picker.js`: aquí solo se dibuja lo que
 * los dos digan.
 */

import { WORLDS, DEFAULT_WORLD, findWorld } from '../../game/worlds.js';
import { highlightIndex, isChosen } from '../picker.js';

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

/** Las tres respuestas, en el orden en que se pintan los botones. */
const ANSWERS = [...ANSWER_KEYS.keys()];

export function answerKey(answer) {
  return ANSWER_KEYS.get(answer) ?? 'unknown';
}

/**
 * El medallón de la cabecera: el emblema del mundo que se esté mirando.
 *
 * El dibujo no está aquí desde la v4 —vive en el registro, uno por mundo— porque
 * jugar a Hunter × Hunter con la calavera de los Sombrero de Paja no tenía sentido.
 */
function emblemOf(world) {
  return findWorld(world)?.emblem ?? '';
}

/**
 * Cómo se llama lo que hay dentro de un mundo: un personaje en One Piece, un objeto
 * en Minecraft (sección 6.4 de la espec v5).
 *
 * El plural sale de añadirle una ese, y el artículo es masculino en las dos palabras
 * que hay. Si algún día entra una que no cumpla ninguna de las dos cosas, el registro
 * tendrá que decirlo; hoy sería inventarse un problema.
 */
function nounOf(world) {
  const one = findWorld(world)?.noun ?? 'personaje';
  return { one, many: `${one}s` };
}

/** Un selector en blanco, para no obligar a quien solo quiere pintar una pantalla. */
const EMPTY_PICKER = { query: '', chosenId: null, highlight: 0 };

/**
 * `view` es null mientras no estés en ninguna sala: entonces se pide el nombre.
 * `status` es cómo está la conexión: 'connecting', 'online' u 'offline'.
 * `clues` son las preguntas que has guardado en tu tablero, en tu orden.
 * `catalog` es la lista de personajes, o null mientras se está descargando.
 * `picker` es qué has escrito y qué has elegido en el selector.
 * `leaving` es si has pulsado salir y falta confirmarlo.
 * `mundo` es el que llevas elegido en la pantalla de entrada; dentro de una sala
 * manda el suyo, que llega en la vista y no se puede cambiar.
 */
export function render({
  view,
  status,
  error,
  clues = [],
  catalog = null,
  picker = EMPTY_PICKER,
  leaving = false,
  world = DEFAULT_WORLD,
}) {
  return `
    <header>
      ${emblemOf(world)}
      <h1>¿Quién soy?</h1>
      <p class="player">${headerLine(view)}</p>
    </header>
    ${connectionNotice(status)}
    ${error ? `<p class="error">${escapeHtml(error)}</p>` : ''}
    ${view === null ? entryScreen(world) : roomScreen(view, { clues, catalog, picker, leaving })}
  `;
}

/** La línea de debajo del título: fuera de una sala, con quién juegas; dentro, a qué. */
function headerLine(view) {
  if (view === null) return 'Dos jugadores, dos secretos';

  // El mundo, el código y el marcador van en pastillas: son los datos que se buscan
  // de un vistazo, y sueltos en la línea se perdían entre los nombres. El mundo va
  // el primero porque es lo que quien acaba de entrar con el código no ha elegido
  // (criterio 3 de la v4).
  const world = `<span class="pill world">${escapeHtml(view.world.name)}</span>`;
  const room = `<span class="pill room">${escapeHtml(view.code)}</span>`;
  const you = escapeHtml(view.you.name);
  if (view.rival === null) return `${you} ${world} ${room}`;

  const score = `<span class="pill score">${view.score[view.you.id]}–${view.score[view.rival.id]}</span>`;
  return `${you} contra ${escapeHtml(view.rival.name)} ${world} ${room} ${score}`;
}

function connectionNotice(status) {
  if (status === 'online') return '';

  const message =
    status === 'connecting'
      ? 'Conectando con el servidor…'
      : 'Sin conexión. Reintentando… tu sitio en la sala te espera.';

  return `<p class="notice">${message}</p>`;
}

function entryScreen(chosen) {
  return `
    ${worldChooser(chosen)}
    <section>
      <h2>La sala</h2>
      <p>
        Uno crea la sala y le dicta el código a la otra persona. Podéis estar en
        ordenadores distintos.
      </p>
      <form id="create-form">
        <input id="name-input" name="name" type="text" autocomplete="off" maxlength="20"
          placeholder="Tu nombre" required />
        <button type="submit">Crear sala</button>
      </form>
      <p class="or">o entra en una sala que ya exista</p>
      <form id="join-form">
        <input id="code-input" name="code" type="text" autocomplete="off" maxlength="5"
          placeholder="Código" required />
        <button type="submit">Entrar</button>
      </form>
    </section>
  `;
}

/**
 * Con qué mundo se juega, que se elige antes de crear la sala.
 *
 * Solo lo elige quien crea: quien entra con un código hereda el de la sala
 * (sección 4 de la espec v4), y se dice aquí para que no se busque dónde cambiarlo.
 *
 * Son botones y no un desplegable ni unos `radio`: son pocos, y así se ven los dos
 * de un vistazo con su emblema y su línea de presentación. `aria-pressed` es lo que
 * le cuenta a un lector de pantalla cuál está elegido.
 *
 * Cada botón lleva el `data-world` de su mundo, y el CSS cuelga los colores de ese
 * atributo: así el emblema de cada uno se pinta con **sus** colores aunque la página
 * esté vestida del otro, sin que esto tenga que saber nada de temas.
 */
function worldChooser(chosen) {
  const options = WORLDS.map(
    (world) => `<li>
      <button type="button" class="world${world.id === chosen ? ' on' : ''}"
        data-world="${escapeHtml(world.id)}" aria-pressed="${world.id === chosen}">
        ${world.emblem}
        <span class="world-name">${escapeHtml(world.name)}</span>
        <span class="world-tagline">${escapeHtml(world.tagline)}</span>
      </button>
    </li>`,
  ).join('');

  return `
    <section class="worlds">
      <h2>¿A qué jugáis?</h2>
      <ul class="world-list">${options}</ul>
      <p class="worlds-note">
        Lo elige quien crea la sala; quien entre con el código juega al mismo.
      </p>
    </section>
  `;
}

function roomScreen(view, { clues, catalog, picker, leaving }) {
  // La palabra sale del mundo de la SALA y no del que se llevara señalado: dentro de
  // una sala manda el suyo, y quien entró con el código no eligió ninguno.
  const noun = nounOf(view.world.id);

  const screen =
    view.phase === 'waiting'
      ? waitingScreen(view)
      : view.phase === 'setup'
        ? setupScreen(view, catalog, picker, noun)
        : view.phase === 'playing'
          ? boardScreen(view, clues, catalog, picker, noun)
          : endScreen(view);

  return `${rivalNotice(view)}${screen}${leaveSection(view, leaving)}`;
}

/**
 * La salida de la sala, en todas sus pantallas: esperando rival, eligiendo, jugando
 * o al terminar. Es la vuelta atrás a la pantalla de entrada.
 *
 * La confirmación se pinta aquí dentro en vez de abrir un diálogo del navegador: así
 * es una pantalla más, se puede leer y testear como cualquier otra, y en un móvil no
 * aparece una ventana del sistema encima de la partida.
 */
function leaveSection(view, leaving) {
  if (!leaving) {
    return `<p class="leave">
      <button type="button" id="leave">← Salir de la sala</button>
    </p>`;
  }

  const rival = view.rival === null ? null : escapeHtml(view.rival.name);

  return `<section class="leave asking">
    <p>
      Si sales, la sala se cierra${rival === null ? '' : ` también para ${rival}`}
      y la partida no se puede retomar.
    </p>
    <button type="button" id="leave-confirm">Salir de todas formas</button>
    <button type="button" id="leave-cancel">Seguir aquí</button>
  </section>`;
}

/** Que el rival se haya caído se avisa siempre, se esté en la fase que se esté. */
function rivalNotice(view) {
  if (view.rival === null || view.rival.connected) return '';

  return `<p class="notice">
    ${escapeHtml(view.rival.name)} se ha desconectado. Esperando a que vuelva…
  </p>`;
}

function waitingScreen(view) {
  return `
    <section>
      <h2>Sala creada</h2>
      <p>Dile este código a quien vaya a jugar contigo:</p>
      <p class="code">${escapeHtml(view.code)}</p>
      <p class="waiting">Esperando a que entre alguien…</p>
    </section>
  `;
}

function setupScreen(view, catalog, picker, noun) {
  const rival = escapeHtml(view.rival.name);

  if (view.chosenForRival !== null) {
    return `
      <section>
        <p>Has elegido <strong>${escapeHtml(view.chosenForRival)}</strong> para ${rival}.</p>
        <p class="waiting">Esperando a que ${rival} elija el tuyo…</p>
      </section>
    `;
  }

  return `
    <section>
      <h2>Elige el ${noun.one} de ${rival}</h2>
      <p>
        Busca el ${noun.one} que ${rival} tendrá que adivinar y púlsalo.
        ${view.rivalHasChosen ? 'El tuyo ya está elegido.' : ''}
      </p>
      <form id="secret-form">
        ${characterPicker('secret', catalog, picker, noun, `Busca un ${noun.one}…`)}
        ${submitButton('Listo', picker)}
      </form>
    </section>
  `;
}

function boardScreen(view, clues, catalog, picker, noun) {
  const rival = escapeHtml(view.rival.name);
  const pending = view.pendingQuestion;

  let actions;
  if (pending !== null && pending.from !== view.you.id) {
    actions = `
      <section class="actions">
        <h2>${rival} pregunta:</h2>
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
    actions = `<p class="waiting">Esperando a que ${rival} responda…</p>`;
  } else if (view.turn === view.you.id) {
    actions = `
      <section class="actions">
        <h2>Es tu turno</h2>
        <form id="question-form">
          <input id="question-input" name="text" type="text" autocomplete="off" maxlength="200"
            placeholder="¿Eres espadachín?" required />
          <button type="submit">Preguntar</button>
        </form>
        <p class="or">o arriésgate</p>
        <form id="guess-form">
          ${characterPicker('guess', catalog, picker, noun, 'Creo que soy…')}
          ${submitButton('Adivinar', picker)}
        </form>
      </section>
    `;
  } else {
    actions = `<p class="waiting">Turno de ${rival}…</p>`;
  }

  return `
    <p class="mission">Tienes que averiguar qué ${noun.one} eres.</p>
    ${historyList(view, clues)}
    ${clueBoard(view, clues)}
    ${actions}
  `;
}

function endScreen(view) {
  const iWon = view.winner === view.you.id;
  const rival = escapeHtml(view.rival.name);

  return `
    <section class="final">
      <h2>${iWon ? '¡Has ganado!' : `Ha ganado ${rival}`}</h2>
      <div class="reveal">
        <p class="revealed">
          <span class="label">Eras</span>
          <strong>${escapeHtml(view.yourCharacter)}</strong>
        </p>
        <p class="revealed">
          <span class="label">${rival} era</span>
          <strong>${escapeHtml(view.chosenForRival)}</strong>
        </p>
      </div>
      <p class="score board">
        <span>${escapeHtml(view.you.name)}</span>
        <b>${view.score[view.you.id]}</b>
        <span class="dash">–</span>
        <b>${view.score[view.rival.id]}</b>
        <span>${rival}</span>
      </p>
      ${historyList(view)}
      <button type="button" id="rematch">Otra partida</button>
    </section>
  `;
}

/**
 * El selector de personaje: un buscador con sus resultados, o lo ya elegido.
 *
 * La lista de resultados se pinta entera en cada tecla, así que no puede ser la
 * lista entera: el catálogo devuelve como mucho treinta y cuenta las que se deja
 * (criterio 4). Con el campo vacío no hay lista, solo la invitación a escribir.
 *
 * Los atributos `role` y `aria-*` son los de un combobox de manual: sin ellos, quien
 * navegue con lector de pantalla oiría un campo de texto normal y no se enteraría de
 * que debajo hay resultados ni de cuál está señalada (criterio 13).
 */
function characterPicker(name, catalog, picker, noun, placeholder) {
  if (catalog === null) return `<p class="waiting">Cargando los ${noun.many}…</p>`;
  if (catalog.size === 0) {
    return `<p class="notice">
      No se ha podido cargar la lista de ${noun.many}. Recarga la página para pedirla otra vez.
    </p>`;
  }

  const chosenName = picker.chosenId === null ? null : catalog.nameOf(picker.chosenId);
  if (chosenName !== null) {
    return `
      <p class="picked">
        <span class="label">Has elegido</span>
        <strong>${escapeHtml(chosenName)}</strong>
        <button type="button" class="unpick" data-unpick="${name}">Cambiar</button>
      </p>
    `;
  }

  const { matches, total, hidden } = catalog.search(picker.query);
  const active = highlightIndex(picker, matches.length);

  const options = matches
    .map(
      (entry, index) => `<li class="result${index === active ? ' on' : ''}"
        id="${name}-option-${index}" role="option" aria-selected="${index === active}"
        data-pick="${escapeHtml(entry.id)}">${escapeHtml(entry.name)}</li>`,
    )
    .join('');

  const note = resultsNote(picker.query, total, hidden, noun);

  return `
    <div class="picker">
      <input id="${name}-search" class="search" type="text" autocomplete="off" maxlength="60"
        role="combobox" aria-autocomplete="list" aria-expanded="${matches.length > 0}"
        aria-controls="${name}-results"
        ${active === -1 ? '' : `aria-activedescendant="${name}-option-${active}"`}
        placeholder="${escapeHtml(placeholder)}" value="${escapeHtml(picker.query)}" />
      ${
        options === '' && note === ''
          ? `<ul id="${name}-results" class="sr-only" role="listbox" aria-label="${capitalize(noun.many)}"></ul>`
          : `<div class="results">
              <ul id="${name}-results" class="options" role="listbox"
                aria-label="${capitalize(noun.many)}">${options}</ul>
              ${note}
            </div>`
      }
    </div>
  `;
}

/**
 * Cuántas coincidencias se han quedado fuera, o que no hay ninguna.
 *
 * Con el campo vacío no dice nada: todavía no se ha buscado, así que no hay nada que
 * contar. Es el "solo invita a escribir" de la sección 6.4 de la espec.
 */
function resultsNote(query, total, hidden, noun) {
  if (query.trim() === '') return '';
  if (total === 0) return `<p class="results-note">Ningún ${noun.one} se llama así.</p>`;
  if (hidden === 0) return '';

  return `<p class="results-note">Y ${hidden} más: escribe un poco más para verlas.</p>`;
}

/** Sin personaje elegido no se puede confirmar (criterio 1). */
function submitButton(label, picker) {
  return `<button type="submit"${isChosen(picker) ? '' : ' disabled'}>${label}</button>`;
}

/**
 * El historial. Con `clues` se puede guardar cada pregunta en el tablero; sin ellas
 * —la partida ya ha terminado— es solo el registro de lo que pasó.
 */
function historyList(view, clues = null) {
  if (view.history.length === 0) {
    return `<p class="history-empty">Todavía no se ha preguntado nada.</p>`;
  }

  const rows = view.history
    .map((entry, index) => {
      const isMine = entry.from === view.you.id;
      const who = isMine ? 'Tú' : escapeHtml(view.rival.name);
      const said =
        entry.kind === 'guess'
          ? `${isMine ? 'te arriesgaste' : 'se arriesgó'} con «${escapeHtml(entry.text)}»`
          : `${escapeHtml(entry.text)}`;
      const key = escapeHtml(answerKey(entry.answer));
      const pinned = clues !== null && clues.includes(index);

      // El nombre se repite en cada entrada aunque la columna ya lo diga: quien
      // navegue con lector de pantalla no ve columnas, solo oye la lista.
      const draggable = clues === null ? '' : ` data-drag="${index}" data-from="history"`;

      return `<li class="entry ${isMine ? 'mine' : 'rival'}"${draggable}>
        <span class="who sr-only">${who}</span>
        <span class="said">${said}</span>
        <span class="answer" data-value="${key}">${escapeHtml(entry.answer)}</span>
        ${clues === null ? '' : pinButton(index, pinned)}
      </li>`;
    })
    .join('');

  return `
    <div class="log">
      <div class="columns">
        <span>Tú</span>
        <span>${escapeHtml(view.rival.name)}</span>
      </div>
      <ol class="history">${rows}</ol>
    </div>
  `;
}

/**
 * Guardar una pregunta en el tablero sin arrastrarla.
 *
 * Arrastrar es lo cómodo con un ratón, pero no todo el mundo puede: con el teclado
 * no hay forma de arrastrar nada, y en una pantalla táctil es un gesto delicado.
 * Este botón hace lo mismo de un toque.
 */
function pinButton(index, pinned) {
  const label = pinned ? 'Quitar de tus pistas' : 'Guardar como pista';

  return `<button type="button" class="pin" data-pin="${index}" aria-pressed="${pinned}"
    title="${label}" aria-label="${label}">${pinned ? '✓' : '+'}</button>`;
}

/**
 * El tablero de pistas: tu libreta.
 *
 * No es parte de la partida y el rival no lo ve. Sirve para sacar del historial las
 * respuestas que te dicen algo y tenerlas juntas, en el orden que a ti te sirva,
 * mientras el historial sigue creciendo por su cuenta.
 */
function clueBoard(view, clues) {
  const pinned = clues.filter((index) => index < view.history.length);

  const tags = pinned
    .map((index, position) => {
      const entry = view.history[index];
      const key = escapeHtml(answerKey(entry.answer));
      const text =
        entry.kind === 'guess' ? `«${escapeHtml(entry.text)}»` : escapeHtml(entry.text);

      return `<li class="clue" data-drag="${index}" data-from="board">
        <span class="clue-text">${text}</span>
        <span class="answer" data-value="${key}">${escapeHtml(entry.answer)}</span>
        <span class="clue-tools">
          <button type="button" data-move="${index}:-1" title="Mover antes"
            aria-label="Mover antes" ${position === 0 ? 'disabled' : ''}>◀</button>
          <button type="button" data-move="${index}:1" title="Mover después"
            aria-label="Mover después" ${position === pinned.length - 1 ? 'disabled' : ''}>▶</button>
          <button type="button" data-pin="${index}" title="Quitar de tus pistas"
            aria-label="Quitar de tus pistas">×</button>
        </span>
      </li>`;
    })
    .join('');

  return `
    <section class="clues">
      <h3>Tus pistas</h3>
      <p class="clues-hint">
        Arrastra aquí las respuestas que te sirvan, o pulsa su <b>+</b>. Ordénalas como quieras.
      </p>
      <ol class="clue-board" id="clue-board">${tags}</ol>
      ${pinned.length === 0 ? '<p class="clues-empty">El tablero está vacío.</p>' : ''}
    </section>
  `;
}

/** Para un `aria-label`, que es un rótulo y no una frase. */
function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/**
 * Las preguntas, los nombres de personaje y ahora también los nombres de los
 * jugadores los escriben personas, así que podrían contener HTML. Se escapan antes
 * de meterlos en la página: si no, llamarse <script> ejecutaría código en la
 * pantalla del rival.
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
