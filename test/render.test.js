/**
 * La pantalla es una función pura de (estado, jugador) a HTML, así que se puede
 * comprobar sin navegador. Lo que más importa aquí: que no filtre el secreto y que
 * no deje pasar HTML ajeno.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createGame, setSecret, askQuestion, answerQuestion, guess } from '../src/game/state.js';
import { render } from '../src/ui/render.js';

/**
 * Partida en marcha:
 *   - el jugador 1 debe adivinar "Nico Robin"
 *   - el jugador 2 debe adivinar "Roronoa Zoro"
 */
function partida() {
  let state = setSecret(createGame(), 1, 'Roronoa Zoro');
  state = setSecret(state, 2, 'Nico Robin');
  return state;
}

// ---------------------------------------------------------------------------
// El secreto: es todo el juego
// ---------------------------------------------------------------------------

test('la pantalla nunca enseña el personaje que tú tienes que adivinar', () => {
  assert.ok(!render(partida(), 1, null).includes('Nico Robin'));
  assert.ok(!render(partida(), 2, null).includes('Roronoa Zoro'));
});

test('sí te recuerda el personaje que elegiste para tu rival', () => {
  const state = setSecret(createGame(), 1, 'Roronoa Zoro');
  assert.ok(render(state, 1, null).includes('Roronoa Zoro'));
});

test('al acabar se revela quién eras', () => {
  const final = guess(partida(), 1, 'Nico Robin');
  assert.ok(render(final, 1, null).includes('Nico Robin'));
});

// ---------------------------------------------------------------------------
// HTML ajeno
// ---------------------------------------------------------------------------

test('una pregunta con etiquetas se enseña como texto, no como HTML', () => {
  const state = askQuestion(partida(), 1, '<img src=x onerror="alert(1)">');
  const html = render(state, 2, null);

  assert.ok(!html.includes('<img'));
  assert.ok(html.includes('&lt;img'));
});

test('un nombre con comillas no se escapa del atributo', () => {
  const state = guess(partida(), 1, '" onmouseover="alert(1)');
  const html = render(state, 1, null);

  assert.ok(!html.includes('onmouseover="alert'));
});

// El estado llega de otra pestaña; aunque la validación lo filtra, la pantalla no
// se fía tampoco.
test('un historial con un remitente manipulado no inyecta HTML', () => {
  const state = {
    ...partida(),
    history: [{ kind: 'question', from: '1"><img src=x>', text: 'hola', answer: 'sí' }],
  };

  assert.ok(!render(state, 1, null).includes('<img'));
});

// ---------------------------------------------------------------------------
// Qué se ofrece en cada momento
// ---------------------------------------------------------------------------

test('a quien le toca se le ofrecen preguntar y arriesgar', () => {
  const html = render(partida(), 1, null);
  assert.ok(html.includes('form-pregunta'));
  assert.ok(html.includes('form-adivinar'));
});

test('a quien no le toca no se le ofrece ninguna acción', () => {
  const html = render(partida(), 2, null);
  assert.ok(!html.includes('form-pregunta'));
  assert.ok(!html.includes('form-adivinar'));
});

test('a quien le preguntan se le ofrecen las tres respuestas', () => {
  const html = render(askQuestion(partida(), 1, '¿Eres espadachín?'), 2, null);

  assert.ok(html.includes('data-respuesta="sí"'));
  assert.ok(html.includes('data-respuesta="no"'));
  assert.ok(html.includes('data-respuesta="a veces"'));
});

test('quien preguntó no puede responderse a sí mismo', () => {
  const html = render(askQuestion(partida(), 1, '¿Eres espadachín?'), 1, null);
  assert.ok(!html.includes('data-respuesta'));
});

test('una tercera pestaña recibe un aviso en vez del juego', () => {
  const html = render(partida(), null, null);

  assert.ok(html.includes('Ya hay dos jugadores'));
  assert.ok(!html.includes('form-pregunta'));
});

test('el motivo del rechazo se enseña cuando lo hay', () => {
  assert.ok(render(partida(), 1, 'No es tu turno').includes('No es tu turno'));
});

// ---------------------------------------------------------------------------
// Historial
// ---------------------------------------------------------------------------

test('el historial distingue lo tuyo de lo del rival', () => {
  let state = askQuestion(partida(), 1, '¿Eres espadachín?');
  state = answerQuestion(state, 2, 'a veces');

  assert.ok(render(state, 1, null).includes('Tú'));
  assert.ok(render(state, 2, null).includes('Jugador 1'));
});

test('un intento fallido se lee distinto según quién lo hizo', () => {
  const state = guess(partida(), 1, 'Sanji');

  assert.ok(render(state, 1, null).includes('te arriesgaste'));
  assert.ok(render(state, 2, null).includes('se arriesgó'));
});

test('cada respuesta lleva su marca para poder distinguirla en pantalla', () => {
  let state = askQuestion(partida(), 1, '¿Eres espadachín?');
  state = answerQuestion(state, 2, 'a veces');

  assert.ok(render(state, 1, null).includes('data-valor="a-veces"'));
});
