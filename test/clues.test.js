import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  dropIndex,
  isPinned,
  liveClues,
  moveClue,
  noClues,
  pinClue,
  unpinClue,
} from '../src/client/clues.js';

/** Un historial de cinco preguntas ya respondidas. */
const history = [
  { kind: 'question', from: 1, text: '¿Eres espadachín?', answer: 'no' },
  { kind: 'question', from: 2, text: '¿Llevas sombrero?', answer: 'sí' },
  { kind: 'question', from: 1, text: '¿Eres pirata?', answer: 'sí' },
  { kind: 'guess', from: 1, text: 'Sanji', answer: 'no' },
  { kind: 'question', from: 1, text: '¿Usas una espada?', answer: 'a veces' },
];

/** Una fila de tres pistas de 100 px con 10 de separación. */
const row = [
  { left: 0, right: 100, width: 100, top: 0, bottom: 40 },
  { left: 110, right: 210, width: 100, top: 0, bottom: 40 },
  { left: 220, right: 320, width: 100, top: 0, bottom: 40 },
];

test('el tablero empieza vacío', () => {
  assert.deepEqual(noClues(), []);
});

test('guardar una pregunta la pone en el tablero', () => {
  const clues = pinClue(pinClue(noClues(), 2), 0);

  assert.deepEqual(clues, [2, 0], 'se guardan en el orden en que las guardas');
  assert.ok(isPinned(clues, 2));
  assert.ok(!isPinned(clues, 1));
});

test('guardar dos veces la misma no la duplica', () => {
  const clues = pinClue(noClues(), 2);

  assert.equal(pinClue(clues, 2), clues, 'ni siquiera cambia el tablero');
});

test('quitar una pista deja las demás en su orden', () => {
  const clues = unpinClue([2, 0, 4], 0);

  assert.deepEqual(clues, [2, 4]);
});

test('guardar y quitar no tocan el tablero que reciben', () => {
  const clues = [2, 0];
  pinClue(clues, 4);
  unpinClue(clues, 2);

  assert.deepEqual(clues, [2, 0]);
});

// ---------------------------------------------------------------------------
// Ordenar
// ---------------------------------------------------------------------------

test('una pista se lleva a otro sitio', () => {
  assert.deepEqual(moveClue([2, 0, 4], 4, 0), [4, 2, 0], 'al principio');
  assert.deepEqual(moveClue([2, 0, 4], 2, 1), [0, 2, 4], 'al medio');
  assert.deepEqual(moveClue([2, 0, 4], 2, 2), [0, 4, 2], 'al final');
});

test('dejarla donde estaba la deja donde estaba', () => {
  assert.deepEqual(moveClue([2, 0, 4], 0, 1), [2, 0, 4]);
});

test('una posición imposible se queda en el extremo', () => {
  assert.deepEqual(moveClue([2, 0, 4], 2, -5), [2, 0, 4]);
  assert.deepEqual(moveClue([2, 0, 4], 2, 99), [0, 4, 2]);
});

test('mover algo que no está en el tablero no hace nada', () => {
  const clues = [2, 0];

  assert.equal(moveClue(clues, 3, 0), clues);
});

// ---------------------------------------------------------------------------
// Qué se ve
// ---------------------------------------------------------------------------

test('cada pista trae su pregunta y su respuesta', () => {
  assert.deepEqual(liveClues([4, 1], history), [
    { index: 4, kind: 'question', from: 1, text: '¿Usas una espada?', answer: 'a veces' },
    { index: 1, kind: 'question', from: 2, text: '¿Llevas sombrero?', answer: 'sí' },
  ]);
});

test('con la revancha el tablero se vacía solo', () => {
  assert.deepEqual(liveClues([4, 1], []), [], 'el historial nuevo no tiene esas preguntas');
});

test('un historial más corto descarta solo las pistas que ya no existen', () => {
  assert.deepEqual(
    liveClues([4, 1], history.slice(0, 2)).map((clue) => clue.index),
    [1],
  );
});

// ---------------------------------------------------------------------------
// Dónde cae lo que sueltas
// ---------------------------------------------------------------------------

test('soltar en la mitad izquierda de una pista la coloca antes', () => {
  assert.equal(dropIndex(row, { x: 20, y: 20 }), 0);
  assert.equal(dropIndex(row, { x: 130, y: 20 }), 1);
});

test('soltar en la mitad derecha la coloca después', () => {
  assert.equal(dropIndex(row, { x: 80, y: 20 }), 1);
  assert.equal(dropIndex(row, { x: 190, y: 20 }), 2);
});

test('soltar más allá de la última la manda al final', () => {
  assert.equal(dropIndex(row, { x: 400, y: 20 }), 3);
});

test('en un tablero vacío siempre se cae en el primer sitio', () => {
  assert.equal(dropIndex([], { x: 50, y: 50 }), 0);
});

test('con varias filas, cuenta la fila donde está el puntero', () => {
  const twoRows = [
    { left: 0, right: 100, width: 100, top: 0, bottom: 40 },
    { left: 110, right: 210, width: 100, top: 0, bottom: 40 },
    { left: 0, right: 100, width: 100, top: 50, bottom: 90 },
    { left: 110, right: 210, width: 100, top: 50, bottom: 90 },
  ];

  assert.equal(dropIndex(twoRows, { x: 20, y: 20 }), 0, 'primera fila, a la izquierda');
  assert.equal(dropIndex(twoRows, { x: 20, y: 70 }), 2, 'segunda fila, a la izquierda');
  assert.equal(dropIndex(twoRows, { x: 130, y: 70 }), 3, 'segunda fila, antes de la última');
  assert.equal(dropIndex(twoRows, { x: 190, y: 70 }), 4, 'segunda fila, después de la última');
  assert.equal(dropIndex(twoRows, { x: 300, y: 70 }), 4, 'después de todas');
});
