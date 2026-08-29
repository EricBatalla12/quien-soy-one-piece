import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  chosen,
  highlighted,
  isChosen,
  moveHighlight,
  noPicker,
  searching,
} from '../src/client/picker.js';

const MATCHES = [
  { id: 'monkey-d-luffy', name: 'Monkey D. Luffy' },
  { id: 'monkey-d-garp', name: 'Monkey D. Garp' },
  { id: 'monkey-d-dragon', name: 'Monkey D. Dragon' },
];

test('se empieza sin nada escrito y sin nada elegido', () => {
  assert.deepEqual(noPicker(), { query: '', chosenId: null, highlight: 0 });
  assert.ok(!isChosen(noPicker()));
});

// Criterio 1: hasta que no hay una elegida, no se puede confirmar.
test('elegir un personaje es lo que deja confirmar', () => {
  const picker = chosen('monkey-d-luffy');

  assert.ok(isChosen(picker));
  assert.equal(picker.chosenId, 'monkey-d-luffy');
  assert.equal(picker.query, '', 'el buscador se calla al elegir');
});

test('volver a escribir desdice lo que hubiera elegido', () => {
  const picker = searching('zoro');

  assert.equal(picker.query, 'zoro');
  assert.ok(!isChosen(picker));
});

test('lo que no es texto se trata como no haber escrito nada', () => {
  assert.equal(searching(null).query, '');
  assert.equal(searching(undefined).query, '');
});

test('bajar y subir por los resultados con el teclado', () => {
  let picker = searching('monkey');

  picker = moveHighlight(picker, 1, MATCHES.length);
  assert.equal(highlighted(picker, MATCHES).id, 'monkey-d-garp');

  picker = moveHighlight(picker, 1, MATCHES.length);
  assert.equal(highlighted(picker, MATCHES).id, 'monkey-d-dragon');

  picker = moveHighlight(picker, -1, MATCHES.length);
  assert.equal(highlighted(picker, MATCHES).id, 'monkey-d-garp');
});

test('no se sale de la lista por ninguno de los dos extremos', () => {
  const first = moveHighlight(searching('monkey'), -1, MATCHES.length);
  assert.equal(highlighted(first, MATCHES).id, 'monkey-d-luffy');

  let last = searching('monkey');
  for (let i = 0; i < 10; i += 1) last = moveHighlight(last, 1, MATCHES.length);
  assert.equal(highlighted(last, MATCHES).id, 'monkey-d-dragon');
});

test('sin resultados no hay ninguna señalada', () => {
  assert.equal(highlighted(noPicker(), []), null);
  assert.equal(highlighted(moveHighlight(noPicker(), 1, 0), []), null);
});

test('la señalada se recorta contra los resultados de ahora, no los de antes', () => {
  const picker = moveHighlight(moveHighlight(searching('monkey'), 1, 3), 1, 3);

  assert.equal(picker.highlight, 2);
  assert.equal(highlighted(picker, MATCHES.slice(0, 1)).id, 'monkey-d-luffy');
});

test('escribir devuelve la señal al primer resultado', () => {
  const moved = moveHighlight(searching('monkey'), 2, MATCHES.length);

  assert.equal(searching('monkey d').highlight, 0);
  assert.equal(moved.highlight, 2, 'pero sin escribir se queda donde estaba');
});

test('nada de esto modifica el selector que recibe', () => {
  const before = searching('monkey');
  const copy = structuredClone(before);

  moveHighlight(before, 1, MATCHES.length);
  highlighted(before, MATCHES);

  assert.deepEqual(before, copy);
});
