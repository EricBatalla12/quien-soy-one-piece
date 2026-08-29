import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  catalogFromResponse,
  namesFromResponse,
  serializeCatalog,
} from '../scripts/build-catalog.js';

// La espec (sección 6.5) pide testear la función que transforma la respuesta, no la
// llamada a la API: aquí no hay red, solo respuestas de mentira.

/** Una respuesta como las de la API, con los campos que no usamos incluidos. */
const RESPONSE = [
  { id: 1, name: 'Monkey D Luffy', bounty: '3.000.000.000', crew: { id: 1 } },
  { id: 2, name: 'Roronoa Zoro', bounty: '1.111.000.000', crew: { id: 1 } },
];

test('de la respuesta solo se cogen los nombres', () => {
  assert.deepEqual(namesFromResponse(RESPONSE), ['Monkey D Luffy', 'Roronoa Zoro']);
});

test('una respuesta que no es una lista no se acepta en silencio', () => {
  assert.throws(() => namesFromResponse({ error: 'vaya' }), /no ha devuelto una lista/);
  assert.throws(() => namesFromResponse(null), /no ha devuelto una lista/);
});

test('una fila sin nombre no revienta la generación entera', () => {
  const names = namesFromResponse([{ id: 1 }, null, 'suelto', { id: 2, name: 'Nami' }]);
  assert.deepEqual(names, ['Nami']);
});

test('la respuesta se convierte en catálogo, con las correcciones aplicadas', () => {
  const catalog = catalogFromResponse(RESPONSE, { 'Monkey D Luffy': 'Monkey D. Luffy' });

  assert.deepEqual(catalog, [
    { id: 'monkey-d-luffy', name: 'Monkey D. Luffy' },
    { id: 'roronoa-zoro', name: 'Roronoa Zoro' },
  ]);
});

test('una respuesta sin ningún personaje aprovechable no genera un catálogo vacío', () => {
  assert.throws(() => catalogFromResponse([], {}), /ningún personaje/);
  assert.throws(() => catalogFromResponse([{ id: 1, name: '  ' }], {}), /ningún personaje/);
});

test('el fichero es JSON válido, con un personaje por línea', () => {
  const catalog = [
    { id: 'nami', name: 'Nami' },
    { id: 'usopp', name: 'Usopp' },
  ];
  const text = serializeCatalog(catalog);

  assert.deepEqual(JSON.parse(text), catalog);
  assert.equal(text.split('\n').length, 5); // '[', dos personajes, ']' y el salto final
});
