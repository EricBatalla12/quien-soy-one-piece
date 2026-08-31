/**
 * Une las capas del navegador: escucha al usuario, manda la acción al servidor y
 * pinta lo que el servidor conteste.
 *
 * Aquí no se decide nada. En la v1 este fichero aplicaba la jugada y luego la
 * difundía; ahora la jugada la aplica el servidor y qué hacer con su respuesta lo
 * decide `app.js`, que es puro y está testeado. Lo que queda es el pegamento con el
 * navegador: el DOM, el almacén y el socket.
 */

import {
  confirmsLeaving,
  dressedAnime,
  initialModel,
  reconnected,
  receive,
  sending,
  withStatus,
} from './app.js';
import { DEFAULT_ANIME, catalogPath } from '../game/animes.js';
import { createCatalog } from '../game/catalog.js';
import { isPinned, moveClue, noClues, pinClue, unpinClue } from './clues.js';
import { chosen, highlighted, moveHighlight, noPicker, searching } from './picker.js';
import { trackDragging } from './ui/drag.js';
import { connect, socketUrl } from './sync/connection.js';
import { nextScrollTop } from './ui/scroll.js';
import {
  clearClues,
  clearSession,
  readClues,
  readSession,
  writeClues,
  writeSession,
} from './session.js';
import { render } from './ui/render.js';

const app = document.getElementById('app');

let model = initialModel();

/**
 * Los catálogos ya descargados: anime → catálogo, y un catálogo vacío si no se ha
 * podido. Viven aquí y no en el modelo porque no vienen del servidor de partidas ni
 * cambian durante el juego.
 *
 * Se piden por HTTP y no por el WebSocket (sección 6.2 de la espec v4), y **no al
 * arrancar**: hasta estar dentro de una sala no se sabe cuál hace falta. Volver a
 * entrar en una sala del mismo anime no lo vuelve a descargar.
 */
const catalogs = new Map();

/** Los que se están pidiendo ahora mismo, para no pedir el mismo dos veces. */
const pending = new Set();

/** Con qué anime se va a crear la sala. Dentro de una sala manda el de la sala. */
let chosenAnime = DEFAULT_ANIME;

/** Qué has escrito y qué has elegido en el selector de personaje. */
let picker = noPicker();

/** Si has pulsado salir de la sala y falta confirmarlo. */
let leaving = false;

/**
 * Tu tablero de pistas. Vive aquí y no en el modelo porque no viene del servidor ni
 * va hacia él: es una libreta tuya, en esta pestaña.
 */
let clues = noClues();

/** De qué sala son las pistas que tenemos cargadas. */
let room = null;

/**
 * Mientras arrastras no se repinta.
 *
 * La interfaz rehace la pantalla entera con cada mensaje, y si el rival responde a
 * mitad de un arrastre, la pista que llevabas en la mano dejaría de existir. Lo que
 * llegue se pinta al soltar.
 */
let dragging = false;
let paintPending = false;

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
 * El catálogo de un anime, del servidor web y no del de partidas.
 *
 * Si falla, el juego sigue funcionando en todo lo demás —se puede crear sala, entrar
 * y ver el historial— y el selector dice que no ha podido cargarse. Un catálogo
 * vacío es justo eso: no hay a quién elegir.
 */
async function loadCatalog(anime) {
  if (catalogs.has(anime) || pending.has(anime)) return;
  pending.add(anime);

  try {
    const response = await fetch(catalogPath(anime));
    if (!response.ok) throw new Error(`el servidor ha contestado ${response.status}`);

    catalogs.set(anime, createCatalog(await response.json()));
  } catch (cause) {
    console.error(`No se ha podido cargar el catálogo de ${anime}:`, cause);
    catalogs.set(anime, createCatalog([]));
  } finally {
    pending.delete(anime);
  }

  paint();
}

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

  // Fuera de una sala no queda nada que elegir ni que confirmar, y lo que se quedara
  // a medias reaparecería en la sala siguiente.
  if (model.view === null) {
    picker = noPicker();
    leaving = false;
  }

  applyToSession(session);
  loadClues();

  // El catálogo se pide al entrar en la sala, que es cuando se sabe cuál hace falta.
  if (model.view !== null) loadCatalog(model.view.anime.id);

  paint();
}

/**
 * Al entrar en una sala se recuperan sus pistas, y al salir se sueltan. Se guardan
 * por sala porque son posiciones del historial de una partida concreta: en otra sala
 * no significarían nada.
 */
function loadClues() {
  const code = model.view === null ? null : model.view.code;
  if (code === room) return;

  room = code;
  clues = code === null ? noClues() : readClues(sessionStorage, code);
}

/** Cambia el tablero y lo guarda, para que recargar no se lo lleve por delante. */
function rememberClues(next) {
  clues = next;
  if (room !== null) writeClues(sessionStorage, room, clues);
  paint();
}

function applyToSession(session) {
  if (session === 'keep') return;
  if (session === 'forget') {
    clearSession(sessionStorage);
    if (room !== null) clearClues(sessionStorage, room);
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
  if (dragging) {
    paintPending = true;
    return;
  }

  const typed = captureTyping();
  const scrolled = captureScroll();

  // El anime viste la página entera —el fondo es del `body`—, así que se marca ahí y
  // el bloque de color que le toca manda sobre el de por defecto.
  const anime = dressedAnime(model.view, chosenAnime);
  document.body.dataset.anime = anime;

  app.innerHTML = render({
    ...model,
    clues,
    catalog: catalogs.get(anime) ?? null,
    picker,
    leaving,
    anime,
  });

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
 *
 * El buscador del selector se queda fuera: lo que has escrito en él vive en `picker`
 * y lo vuelve a pintar `render`, así que copiarle encima el texto de antes
 * resucitaría justo lo que acabas de borrar con Escape. El foco y el cursor sí se le
 * devuelven, como a cualquier otro campo.
 */
function captureTyping() {
  const active = document.activeElement;
  const values = new Map();

  for (const input of app.querySelectorAll('input[type="text"]:not(.search)')) {
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

  // El personaje ya no se lee del formulario: es el que se haya elegido en el
  // selector, y sin uno elegido el botón está deshabilitado (criterio 1 de la v3).
  const characterId = picker.chosenId;

  switch (event.target.id) {
    // El nombre se escribe una sola vez y vale para crear y para entrar, así que se
    // lee del campo y no del formulario que se acaba de enviar.
    case 'create-form':
      send({ type: 'create', name: valueOf('#name-input'), anime: chosenAnime });
      break;
    case 'join-form':
      send({ type: 'join', code: valueOf('#code-input'), name: valueOf('#name-input') });
      break;

    case 'secret-form':
      if (characterId !== null) sendCharacter('secret', characterId);
      break;
    case 'question-form':
      send({ type: 'ask', text });
      break;
    case 'guess-form':
      if (characterId !== null) sendCharacter('guess', characterId);
      break;
  }
});

function leaveRoom() {
  leaving = false;
  send({ type: 'leave' });
}

/** Manda el personaje elegido y deja el selector en blanco para la próxima vez. */
function sendCharacter(type, characterId) {
  picker = noPicker();
  send({ type, characterId });
}

/**
 * Escribir en el buscador.
 *
 * La pantalla se rehace entera con cada tecla, como con cualquier otro cambio; el
 * texto y el cursor los devuelve a su sitio `restoreTyping`, que ya estaba para que
 * el rival no te borrara lo que estabas escribiendo.
 */
app.addEventListener('input', (event) => {
  if (!isSearchField(event.target)) return;

  picker = searching(event.target.value);
  paint();
});

/**
 * El selector con el teclado (criterio 13 de la v3): se baja por los resultados con
 * las flechas y se elige con Intro, sin tocar el ratón.
 */
app.addEventListener('keydown', (event) => {
  if (!isSearchField(event.target)) return;

  const catalog = catalogs.get(dressedAnime(model.view, chosenAnime)) ?? null;
  const matches = catalog === null ? [] : catalog.search(picker.query).matches;

  switch (event.key) {
    case 'ArrowDown':
    case 'ArrowUp':
      event.preventDefault();
      picker = moveHighlight(picker, event.key === 'ArrowDown' ? 1 : -1, matches.length);
      break;

    // Intro elige la señalada; si no hay ninguna, no envía el formulario a medias.
    case 'Enter': {
      event.preventDefault();
      const pick = highlighted(picker, matches);
      if (pick === null) return;

      picker = chosen(pick.id);
      break;
    }

    case 'Escape':
      picker = noPicker();
      break;

    default:
      return;
  }

  paint();
});

function isSearchField(element) {
  return element instanceof HTMLInputElement && element.classList.contains('search');
}

app.addEventListener('click', (event) => {
  // Un resultado del buscador se elige pulsándolo; no es un botón, es una opción.
  const option = event.target.closest('[data-pick]');
  if (option !== null) {
    picker = chosen(option.dataset.pick);
    paint();
    return;
  }

  const button = event.target.closest('button');
  if (button === null) return;

  const { answer, anime, pin, move, unpick } = button.dataset;

  // Elegir anime en la pantalla de entrada: cambia lo que se va a crear y cómo se
  // ve la página, y no manda nada al servidor hasta que se crea la sala.
  if (anime !== undefined) {
    chosenAnime = anime;
    paint();
    return;
  }

  if (answer !== undefined) {
    send({ type: 'answer', answer });
    return;
  }

  // "Cambiar": vuelve a dejar el buscador en blanco para elegir otro.
  if (unpick !== undefined) {
    picker = noPicker();
    paint();
    return;
  }

  if (button.id === 'rematch') {
    send({ type: 'rematch' });
    return;
  }

  // Salir cierra la sala también para el rival, así que con él sentado se pregunta
  // antes; solo en una sala vacía se sale de un clic.
  if (button.id === 'leave') {
    if (confirmsLeaving(model.view)) {
      leaving = true;
      paint();
      return;
    }

    leaveRoom();
    return;
  }

  if (button.id === 'leave-confirm') {
    leaveRoom();
    return;
  }

  if (button.id === 'leave-cancel') {
    leaving = false;
    paint();
    return;
  }

  // El mismo botón guarda y quita: en el historial es un "+" y en el tablero una "×".
  if (pin !== undefined) {
    const index = Number(pin);
    rememberClues(isPinned(clues, index) ? unpinClue(clues, index) : pinClue(clues, index));
    return;
  }

  if (move !== undefined) {
    const [index, step] = move.split(':').map(Number);
    rememberClues(moveClue(clues, index, clues.indexOf(index) + step));
  }
});

trackDragging({
  root: app,
  boardId: 'clue-board',
  onDrop({ from, index, to }) {
    // Arrastrada desde el historial, primero hay que guardarla; desde el tablero, ya está.
    rememberClues(moveClue(from === 'history' ? pinClue(clues, index) : clues, index, to));
  },
  onDraggingChange(active) {
    dragging = active;
    if (active || !paintPending) return;

    paintPending = false;
    paint();
  },
});

function valueOf(selector) {
  return app.querySelector(selector)?.value ?? '';
}
