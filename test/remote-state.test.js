/**
 * Lo que pasa cuando llega un estado de la otra pestaña: combinarlo con el nuestro
 * y desconfiar de su contenido.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createGame, setSecret, askQuestion, reconcile, isValidState } from '../src/game/state.js';

// ---------------------------------------------------------------------------
// La carrera de la preparación: los dos jugadores escriben a la vez
// ---------------------------------------------------------------------------

/** Lo que ve cada pestaña justo antes de enterarse de la otra. */
function escriturasSimultaneas() {
  return {
    enPestana1: setSecret(createGame(), 1, 'Roronoa Zoro'),
    enPestana2: setSecret(createGame(), 2, 'Nico Robin'),
  };
}

test('escribir a la vez no pierde ninguno de los dos personajes', () => {
  const { enPestana1, enPestana2 } = escriturasSimultaneas();
  const resultado = reconcile(enPestana1, enPestana2);

  assert.equal(resultado.secretFor[1], 'Nico Robin');
  assert.equal(resultado.secretFor[2], 'Roronoa Zoro');
});

test('al combinarse las dos escrituras la partida arranca', () => {
  const { enPestana1, enPestana2 } = escriturasSimultaneas();
  assert.equal(reconcile(enPestana1, enPestana2).phase, 'playing');
});

test('las dos pestañas llegan al mismo estado por su cuenta', () => {
  const { enPestana1, enPestana2 } = escriturasSimultaneas();

  // Cada una combina lo suyo con lo que le llega; nadie coordina a nadie.
  assert.deepEqual(reconcile(enPestana1, enPestana2), reconcile(enPestana2, enPestana1));
});

test('si solo ha escrito uno, la partida sigue en preparación', () => {
  const resultado = reconcile(createGame(), setSecret(createGame(), 1, 'Roronoa Zoro'));

  assert.equal(resultado.phase, 'setup');
  assert.equal(resultado.secretFor[2], 'Roronoa Zoro');
  assert.equal(resultado.secretFor[1], null);
});

// ---------------------------------------------------------------------------
// Fuera de la preparación mandan los turnos, y el estado que llega es el bueno
// ---------------------------------------------------------------------------

test('durante la partida se acepta el estado que llega', () => {
  let empezada = setSecret(createGame(), 1, 'Roronoa Zoro');
  empezada = setSecret(empezada, 2, 'Nico Robin');
  const conPregunta = askQuestion(empezada, 1, '¿Eres espadachín?');

  assert.deepEqual(reconcile(empezada, conPregunta), conPregunta);
});

test('una pestaña rezagada adopta la partida ya empezada', () => {
  let empezada = setSecret(createGame(), 1, 'Roronoa Zoro');
  empezada = setSecret(empezada, 2, 'Nico Robin');

  assert.deepEqual(reconcile(createGame(), empezada), empezada);
});

// ---------------------------------------------------------------------------
// Desconfianza: el canal es alcanzable desde cualquier página del mismo origen
// ---------------------------------------------------------------------------

test('se acepta un estado bien formado', () => {
  assert.ok(isValidState(createGame()));
});

test('se rechaza lo que ni siquiera es un estado', () => {
  for (const basura of [null, undefined, 'hola', 42, []]) {
    assert.ok(!isValidState(basura), `debería rechazar ${JSON.stringify(basura)}`);
  }
});

test('se rechaza una fase o un turno inventados', () => {
  const bueno = createGame();
  assert.ok(!isValidState({ ...bueno, phase: 'inventada' }));
  assert.ok(!isValidState({ ...bueno, turn: 7 }));
});

test('se rechaza un personaje secreto que no es texto', () => {
  const bueno = createGame();
  assert.ok(!isValidState({ ...bueno, secretFor: { 1: 42, 2: null } }));
});

test('se rechaza una pregunta pendiente mal formada', () => {
  const bueno = createGame();
  assert.ok(!isValidState({ ...bueno, pendingQuestion: { from: 9, text: 'hola' } }));
  assert.ok(!isValidState({ ...bueno, pendingQuestion: { from: 1, text: null } }));
});

// Este es el que faltaba: la validación no miraba dentro del historial, y bastaba
// una entrada rara para reventar el pintado y dejar la pestaña colgada.
test('se rechaza un historial con entradas mal formadas', () => {
  const bueno = createGame();

  assert.ok(!isValidState({ ...bueno, history: ['esto no es una entrada'] }));
  assert.ok(!isValidState({ ...bueno, history: [{ kind: 'question', from: 1, text: 'x', answer: 'quizá' }] }));
  assert.ok(!isValidState({ ...bueno, history: [{ kind: 'question', from: 1, text: 42, answer: 'sí' }] }));
  assert.ok(!isValidState({ ...bueno, history: [{ kind: 'inventado', from: 1, text: 'x', answer: 'sí' }] }));
});

test('se acepta un historial con entradas correctas', () => {
  const bueno = createGame();
  const history = [
    { kind: 'question', from: 1, text: '¿Eres espadachín?', answer: 'a veces' },
    { kind: 'guess', from: 2, text: 'Sanji', answer: 'no' },
  ];

  assert.ok(isValidState({ ...bueno, history }));
});
