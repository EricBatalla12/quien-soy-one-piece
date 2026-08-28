import { test } from 'node:test';
import assert from 'node:assert/strict';

import { BOTTOM_TOLERANCE_PX, nextScrollTop } from '../src/client/ui/scroll.js';

/** Un historial de 1000 px de contenido en una ventana de 300. */
const tall = { scrollHeight: 1000, clientHeight: 300 };
const taller = { scrollHeight: 1200, clientHeight: 300 };

test('la primera vez se empieza por lo último', () => {
  assert.equal(nextScrollTop(null, tall), 1000);
});

test('si estabas al final, sigues al final', () => {
  const atBottom = { ...tall, scrollTop: 700 };

  assert.equal(nextScrollTop(atBottom, taller), 1200);
});

test('casi al final también cuenta como al final', () => {
  const almost = { ...tall, scrollTop: 700 - BOTTOM_TOLERANCE_PX };

  assert.equal(nextScrollTop(almost, taller), 1200);
});

test('si habías subido a releer, te quedas donde estabas', () => {
  const readingUp = { ...tall, scrollTop: 120 };

  assert.equal(nextScrollTop(readingUp, taller), 120);
});

test('no se puede quedar más allá del final aunque el historial encoja', () => {
  const readingUp = { ...tall, scrollTop: 600 };
  const shorter = { scrollHeight: 400, clientHeight: 300 };

  assert.equal(nextScrollTop(readingUp, shorter), 100);
});

test('con un historial que cabe entero no hay nada que desplazar', () => {
  const short = { scrollHeight: 200, clientHeight: 300, scrollTop: 0 };

  assert.equal(nextScrollTop(short, { scrollHeight: 250, clientHeight: 300 }), 250);
});
