import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { answerKey, render } from '../src/client/ui/render.js';
import { createCatalog } from '../src/game/catalog.js';
import { ANSWERS } from '../src/game/state.js';
import { projectView } from '../src/game/view.js';
import { createRoom, joinRoom, withGame } from '../src/server/rooms.js';
import { answerQuestion, askQuestion, createGame, guess, setSecret } from '../src/game/state.js';

const NOW = 1_000_000;

/** Un catálogo de mentira: la interfaz no lee el del repositorio. */
const CATALOG = createCatalog([
  { id: 'roronoa-zoro', name: 'Roronoa Zoro' },
  { id: 'nico-robin', name: 'Nico Robin' },
  { id: 'sanji', name: 'Sanji' },
]);

/** La sala tal y como la vería un jugador: exactamente lo que recibe la interfaz. */
function viewOf(game, playerId, { connected = true } = {}) {
  let room = joinRoom(createRoom({ code: 'NAKAM', name: 'Eric', token: 't1', now: NOW }), {
    name: 'Nami',
    token: 't2',
    now: NOW,
  });
  if (!connected) room = { ...room, players: { ...room.players, 1: { ...room.players[1], connected: false } } };

  return projectView(withGame(room, game, NOW), playerId, CATALOG);
}

/** El jugador 1 debe adivinar a Nico Robin; el jugador 2, a Roronoa Zoro. */
function startedGame() {
  return setSecret(setSecret(createGame(), 1, 'roronoa-zoro', CATALOG), 2, 'nico-robin', CATALOG);
}

function html(model) {
  return render({ status: 'online', error: null, ...model });
}

// ---------------------------------------------------------------------------
// Pantalla de entrada
// ---------------------------------------------------------------------------

test('sin sala se piden el nombre y el código', () => {
  const out = html({ view: null });

  assert.match(out, /id="create-form"/);
  assert.match(out, /id="name-input"/);
  assert.match(out, /id="join-form"/);
  assert.match(out, /id="code-input"/);
});

test('la sala recién creada enseña el código', () => {
  const alone = createRoom({ code: 'NAKAM', name: 'Eric', token: 't1', now: NOW });
  const out = html({ view: projectView(alone, 1, CATALOG) });

  assert.match(out, /class="code">NAKAM</);
  assert.match(out, /Esperando a que entre alguien/);
});

// ---------------------------------------------------------------------------
// Criterio 12: los nombres, no "jugador 2"
// ---------------------------------------------------------------------------

test('el rival se llama por su nombre', () => {
  const out = html({ view: viewOf(startedGame(), 1) });

  assert.match(out, /Nami/);
  assert.ok(!out.includes('jugador 2'), 'ya no se numera a nadie');
  assert.ok(!out.includes('Jugador 2'));
});

test('el turno del rival se anuncia con su nombre', () => {
  const out = html({ view: viewOf(startedGame(), 2) });

  assert.match(out, /Turno de Eric/);
});

test('un nombre con HTML no se ejecuta', () => {
  const room = joinRoom(createRoom({ code: 'NAKAM', name: 'Eric', token: 't1', now: NOW }), {
    name: '<script>x</script>',
    token: 't2',
    now: NOW,
  });
  const out = html({ view: projectView(room, 1, CATALOG) });

  assert.ok(!out.includes('<script>x</script>'));
  assert.match(out, /&lt;script&gt;/);
});

// ---------------------------------------------------------------------------
// Preparación y tablero
// ---------------------------------------------------------------------------

test('en la preparación se pide el personaje del rival', () => {
  const out = html({ view: viewOf(createGame(), 1) });

  assert.match(out, /id="secret-form"/);
  assert.match(out, /Elige el personaje de Nami/);
});

test('elegido el personaje, se espera al rival', () => {
  const out = html({ view: viewOf(setSecret(createGame(), 1, 'roronoa-zoro', CATALOG), 1) });

  assert.match(out, /Roronoa Zoro/);
  assert.match(out, /Esperando a que Nami elija/);
  assert.ok(!out.includes('id="secret-form"'), 'ya no se puede elegir dos veces');
});

test('en tu turno puedes preguntar o arriesgar', () => {
  const out = html({ view: viewOf(startedGame(), 1) });

  assert.match(out, /id="question-form"/);
  assert.match(out, /id="guess-form"/);
});

test('fuera de tu turno no hay con qué actuar', () => {
  const out = html({ view: viewOf(startedGame(), 2) });

  assert.ok(!out.includes('id="question-form"'));
  assert.ok(!out.includes('id="guess-form"'));
});

test('a quien le preguntan le salen las tres respuestas', () => {
  const asked = askQuestion(startedGame(), 1, '¿Eres espadachín?');
  const out = html({ view: viewOf(asked, 2) });

  for (const answer of ANSWERS) assert.match(out, new RegExp(`data-answer="${answer}"`));
  assert.match(out, /Eric pregunta/);
});

test('quien pregunta espera, sin botones de respuesta', () => {
  const asked = askQuestion(startedGame(), 1, '¿Eres espadachín?');
  const out = html({ view: viewOf(asked, 1) });

  assert.ok(!out.includes('data-answer'));
  assert.match(out, /Esperando a que Nami responda/);
});

test('el historial dice quién preguntó y qué se respondió', () => {
  let game = askQuestion(startedGame(), 1, '¿Eres espadachín?');
  game = answerQuestion(game, 2, 'a veces');
  const out = html({ view: viewOf(game, 2) });

  assert.match(out, /¿Eres espadachín\?/);
  assert.match(out, /data-value="sometimes"/);
  assert.match(out, /Eric/);
});

// ---------------------------------------------------------------------------
// Una columna por jugador
// ---------------------------------------------------------------------------

test('cada entrada del historial va a la columna de quien habló', () => {
  let game = askQuestion(startedGame(), 1, '¿Eres espadachín?');
  game = answerQuestion(game, 2, 'no');
  game = askQuestion(game, 2, '¿Llevas sombrero?');
  game = answerQuestion(game, 1, 'sí');

  const mine = html({ view: viewOf(game, 1) });
  const theirs = html({ view: viewOf(game, 2) });

  // La misma partida, vista desde los dos lados: lo tuyo cambia de columna.
  assert.match(mine, /class="entry mine"[^>]*>\s*<span class="who sr-only">Tú<\/span>\s*<span class="said">¿Eres espadachín\?/);
  assert.match(theirs, /class="entry rival"[^>]*>\s*<span class="who sr-only">Eric<\/span>\s*<span class="said">¿Eres espadachín\?/);
});

test('las columnas van encabezadas por los dos nombres', () => {
  const game = answerQuestion(askQuestion(startedGame(), 1, '¿Eres pirata?'), 2, 'sí');
  const out = html({ view: viewOf(game, 2) });

  assert.match(out, /class="columns">\s*<span>Tú<\/span>\s*<span>Eric<\/span>/);
});

test('quien no ve la página se entera igual de quién habló', () => {
  const game = answerQuestion(askQuestion(startedGame(), 1, '¿Eres pirata?'), 2, 'sí');
  const out = html({ view: viewOf(game, 2) });

  assert.match(out, /<span class="who sr-only">Eric<\/span>/);
});

// ---------------------------------------------------------------------------
// El tablero de pistas
// ---------------------------------------------------------------------------

/** Partida con cuatro preguntas ya respondidas. */
function asked() {
  let game = startedGame();
  for (const [player, text, answer] of [
    [1, '¿Eres espadachín?', 'no'],
    [2, '¿Llevas sombrero?', 'sí'],
    [1, '¿Eres pirata?', 'sí'],
    [2, '¿Usas una espada?', 'a veces'],
  ]) {
    game = askQuestion(game, player, text);
    game = answerQuestion(game, player === 1 ? 2 : 1, answer);
  }
  return game;
}

test('el tablero vacío invita a llenarlo', () => {
  const out = html({ view: viewOf(asked(), 1), clues: [] });

  assert.match(out, /id="clue-board"/);
  assert.match(out, /Tus pistas/);
  assert.match(out, /El tablero está vacío/);
  assert.ok(!out.includes('class="clue"'));
});

test('las pistas guardadas salen en tu orden, no en el del historial', () => {
  const out = html({ view: viewOf(asked(), 1), clues: [2, 0] });
  const order = [...out.matchAll(/class="clue" data-drag="(\d+)"/g)].map((m) => m[1]);

  assert.deepEqual(order, ['2', '0']);
  assert.ok(!out.includes('El tablero está vacío'));
});

test('cada pista lleva su pregunta y su respuesta', () => {
  const out = html({ view: viewOf(asked(), 1), clues: [3] });

  assert.match(out, /class="clue-text">¿Usas una espada\?/);
  assert.match(out, /class="answer" data-value="sometimes">a veces/);
});

test('lo ya guardado se ve marcado en el historial', () => {
  const out = html({ view: viewOf(asked(), 1), clues: [1] });

  assert.match(out, /data-pin="1" aria-pressed="true"/);
  assert.match(out, /data-pin="0" aria-pressed="false"/);
});

test('en los extremos no se puede seguir moviendo', () => {
  const out = html({ view: viewOf(asked(), 1), clues: [2, 0, 3] });
  const moves = [...out.matchAll(/data-move="(\d+:-?1)"[^>]*?(disabled)?>/g)].map((m) => [m[1], !!m[2]]);

  assert.deepEqual(moves[0], ['2:-1', true], 'la primera no puede ir antes');
  assert.deepEqual(moves.at(-1), ['3:1', true], 'la última no puede ir después');
});

test('una pista de una partida que ya no existe no se pinta', () => {
  const out = html({ view: viewOf(asked(), 1), clues: [99] });

  assert.ok(!out.includes('class="clue"'), 'la revancha vacía el tablero sola');
  assert.match(out, /El tablero está vacío/);
});

test('el historial se puede arrastrar mientras se juega', () => {
  const out = html({ view: viewOf(asked(), 1), clues: [] });

  assert.match(out, /class="entry [^"]*" data-drag="0" data-from="history"/);
});

test('terminada la partida no hay nada que guardar', () => {
  const finished = guess(asked(), 1, 'nico-robin', CATALOG);
  const out = html({ view: viewOf(finished, 1), clues: [1] });

  assert.ok(!out.includes('id="clue-board"'), 'el tablero ya no sirve de nada');
  assert.ok(!out.includes('data-pin'));
  assert.ok(!out.includes('data-drag'));
});

// ---------------------------------------------------------------------------
// Final y revancha
// ---------------------------------------------------------------------------

test('el final revela los dos personajes y ofrece revancha', () => {
  const finished = guess(startedGame(), 1, 'nico-robin', CATALOG);
  const out = html({ view: viewOf(finished, 1) });

  assert.match(out, /¡Has ganado!/);
  assert.match(out, /Eras<\/span>\s*<strong>Nico Robin<\/strong>/);
  assert.match(out, /Nami era<\/span>\s*<strong>Roronoa Zoro<\/strong>/);
  assert.match(out, /id="rematch"/);
});

test('quien pierde lo lee con el nombre del que ganó', () => {
  const finished = guess(startedGame(), 1, 'nico-robin', CATALOG);
  const out = html({ view: viewOf(finished, 2) });

  assert.match(out, /Ha ganado Eric/);
});

// ---------------------------------------------------------------------------
// Criterio 13: conexión
// ---------------------------------------------------------------------------

test('la caída del rival se avisa con su nombre', () => {
  const out = html({ view: viewOf(startedGame(), 2, { connected: false }) });

  assert.match(out, /Eric se ha desconectado/);
});

test('estar sin conexión se ve, y estar conectado no molesta', () => {
  assert.match(html({ view: null, status: 'offline' }), /Sin conexión/);
  assert.match(html({ view: null, status: 'connecting' }), /Conectando/);
  assert.ok(!html({ view: null }).includes('class="notice"'));
});

test('el error del servidor se enseña tal cual', () => {
  const out = html({ view: null, error: 'No existe ninguna sala con ese código' });

  assert.match(out, /class="error">No existe ninguna sala con ese código</);
});

// ---------------------------------------------------------------------------
// El acuerdo con el CSS
// ---------------------------------------------------------------------------

test('cada respuesta del juego tiene su color en el CSS', () => {
  const css = readFileSync(new URL('../styles/main.css', import.meta.url), 'utf8');

  for (const answer of ANSWERS) {
    const key = answerKey(answer);
    assert.notEqual(key, 'unknown', `"${answer}" no tiene clave de color`);
    assert.match(css, new RegExp(`\\[data-value='${key}'\\]`), `el CSS no pinta "${key}"`);
  }
});

test('las clases nuevas de la v2 existen en el CSS', () => {
  const css = readFileSync(new URL('../styles/main.css', import.meta.url), 'utf8');

  const selectors = ['.code', '.score', '.notice', '.log', '.columns', '.entry', '.sr-only',
    '.pill', '.reveal', '.revealed', '.board', '.clues', '.clue', '.clue-board', '.clue-slot',
    '.drag-ghost', '.dragging', '.pin'];
  for (const selector of selectors) {
    assert.match(css, new RegExp(`\\${selector}[\\s,{]`), `falta ${selector} en el CSS`);
  }
});
