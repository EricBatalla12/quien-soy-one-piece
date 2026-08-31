import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildCatalog,
  characterId,
  createCatalog,
  isCharacterId,
  MAX_RESULTS,
  unusedCorrections,
} from '../src/game/catalog.js';

// Criterios de aceptación 10 y 11 de la v3: el identificador se deriva del nombre y
// no cambia al volver a generar el catálogo, que no tiene repetidos ni vacíos.

test('el identificador sale del nombre, sin mayúsculas ni puntuación', () => {
  assert.equal(characterId('Monkey D. Luffy'), 'monkey-d-luffy');
});

test('escribir el nombre de otra forma da el mismo identificador', () => {
  assert.equal(characterId('Monkey D Luffy'), characterId('  MONKEY   D.  LUFFY '));
});

test('los acentos no cambian el identificador', () => {
  assert.equal(characterId('Nico Robín'), 'nico-robin');
});

test('un nombre con dos formas separadas por barra da un solo identificador', () => {
  assert.equal(characterId('Charlotte Linlin / Big Mom'), 'charlotte-linlin-big-mom');
});

test('de un nombre sin letras ni cifras no sale identificador', () => {
  for (const nada of ['', '   ', '///', null, undefined, 42]) {
    assert.equal(characterId(nada), '', `${JSON.stringify(nada)} no debería dar identificador`);
  }
});

test('isCharacterId reconoce la forma, no la existencia', () => {
  assert.ok(isCharacterId('monkey-d-luffy'));
  assert.ok(isCharacterId('personaje-inventado-9'));

  for (const malo of ['', '-luffy', 'luffy-', 'monkey--d', 'Luffy', 'monkey d luffy', 42, null]) {
    assert.ok(!isCharacterId(malo), `${JSON.stringify(malo)} no tiene forma de identificador`);
  }
});

test('isCharacterId rechaza una cadena descomunal aunque tenga la forma', () => {
  assert.ok(!isCharacterId('a'.repeat(101)));
});

test('el catálogo funde los nombres repetidos de la API', () => {
  const catalog = buildCatalog(['Sanjuan Wolf', 'Sanjuan Wolf', 'Scarlett']);

  assert.deepEqual(
    catalog.map((entry) => entry.id),
    ['sanjuan-wolf', 'scarlett'],
  );
});

test('el catálogo tira los nombres vacíos', () => {
  assert.deepEqual(buildCatalog(['', '   ', 'Zoro']), [{ id: 'zoro', name: 'Zoro' }]);
});

test('el catálogo sale ordenado por nombre, para que el fichero sea estable', () => {
  const first = buildCatalog(['Zoro', 'Ace', 'Luffy']);
  const second = buildCatalog(['Luffy', 'Zoro', 'Ace']);

  assert.deepEqual(first, second);
  assert.deepEqual(
    first.map((entry) => entry.name),
    ['Ace', 'Luffy', 'Zoro'],
  );
});

test('las correcciones se aplican antes de derivar el identificador', () => {
  const catalog = buildCatalog(['Marchall D. Teach / Barbe Noire'], {
    'Marchall D. Teach / Barbe Noire': 'Marshall D. Teach / Blackbeard',
  });

  assert.deepEqual(catalog, [
    { id: 'marshall-d-teach-blackbeard', name: 'Marshall D. Teach / Blackbeard' },
  ]);
});

test('dos nombres que se corrigen al mismo se quedan en uno', () => {
  const catalog = buildCatalog(['Marchall D. Teach', 'Marshall D Teach'], {
    'Marchall D. Teach': 'Marshall D. Teach',
  });

  assert.equal(catalog.length, 1);
});

test('una corrección a null tira la entrada en vez de renombrarla', () => {
  const catalog = buildCatalog(['1er Doyen', 'Jaygarcia Saturn'], { '1er Doyen': null });

  assert.deepEqual(catalog, [{ id: 'jaygarcia-saturn', name: 'Jaygarcia Saturn' }]);
});

test('una entrada tirada no cuenta como corrección que sobra', () => {
  assert.deepEqual(unusedCorrections(['1er Doyen'], { '1er Doyen': null }), []);
});

test('lo que no es ni nombre ni null no es una corrección', () => {
  const catalog = buildCatalog(['Nami'], { Nami: 42 });

  assert.deepEqual(catalog, [{ id: 'nami', name: 'Nami' }], 'se queda como estaba');
});

test('una corrección con una clave rara no se cuela como método del objeto', () => {
  const catalog = buildCatalog(['constructor'], {});
  assert.deepEqual(catalog, [{ id: 'constructor', name: 'constructor' }]);
});

test('volver a generar el catálogo no cambia el identificador de quien ya estaba', () => {
  const before = buildCatalog(['Roronoa Zoro', 'Nami']);
  const after = buildCatalog(['Nami', 'Roronoa Zoro', 'Jewelry Bonney']);

  for (const old of before) {
    const same = after.find((entry) => entry.name === old.name);
    assert.equal(same.id, old.id, `${old.name} ha cambiado de identificador`);
  }
});

test('avisa de las correcciones que ya no le tocan a nadie', () => {
  const names = ['Roronoa Zoro'];
  const corrections = { 'Roronoa Zoro': 'Roronoa Zoro', 'Alguien Que Ya No Está': 'Otro' };

  assert.deepEqual(unusedCorrections(names, corrections), ['Alguien Que Ya No Está']);
});

test('el catálogo dice si un personaje existe y cómo se llama', () => {
  const catalog = createCatalog([{ id: 'nami', name: 'Nami' }]);

  assert.equal(catalog.size, 1);
  assert.ok(catalog.has('nami'));
  assert.ok(!catalog.has('nadie'));
  assert.equal(catalog.nameOf('nami'), 'Nami');
  assert.equal(catalog.nameOf('nadie'), null);
});

test('el catálogo no contesta que sí a lo que no es un identificador', () => {
  const catalog = createCatalog([{ id: 'nami', name: 'Nami' }]);

  for (const raro of ['constructor', '__proto__', 'toString', null, undefined]) {
    assert.ok(!catalog.has(raro), `${String(raro)} no es un personaje`);
    assert.equal(catalog.nameOf(raro), null);
  }
});

test('un catálogo vacío se puede construir: es lo que hay antes de cargarlo', () => {
  assert.equal(createCatalog([]).size, 0);
});

test('un fichero de catálogo roto no se acepta en silencio', () => {
  assert.throws(() => createCatalog('vaya'), /no es una lista/);
  assert.throws(() => createCatalog([null]), /no es un personaje/);
  assert.throws(() => createCatalog([{ id: 'Nami', name: 'Nami' }]), /Identificador/);
  assert.throws(() => createCatalog([{ id: 'nami', name: '  ' }]), /no tiene nombre/);
  assert.throws(
    () => createCatalog([{ id: 'nami', name: 'Nami' }, { id: 'nami', name: 'Nami' }]),
    /repetidos/,
  );
});

test('lo que sale del catálogo construido es lo que se le dio, sin campos de más', () => {
  const catalog = createCatalog([{ id: 'nami', name: 'Nami', extra: 'no' }]);
  assert.deepEqual(catalog.list, [{ id: 'nami', name: 'Nami' }]);
});

// ---------------------------------------------------------------------------
// El buscador (sección 6.4 de la espec v3)
// ---------------------------------------------------------------------------

const CREW = createCatalog([
  { id: 'monkey-d-luffy', name: 'Monkey D. Luffy' },
  { id: 'roronoa-zoro', name: 'Roronoa Zoro' },
  { id: 'nico-robin', name: 'Nico Robin' },
  { id: 'charlotte-linlin-big-mom', name: 'Charlotte Linlin / Big Mom' },
  { id: 'nefertari-vivi', name: 'Nefertari Vivi' },
]);

test('el buscador encuentra por un trozo del nombre', () => {
  const { matches } = CREW.search('zoro');

  assert.deepEqual(matches, [{ id: 'roronoa-zoro', name: 'Roronoa Zoro' }]);
});

// Criterio 3: con o sin mayúsculas, con o sin acentos.
test('el buscador no distingue mayúsculas ni acentos', () => {
  for (const escrito of ['ROBIN', 'robín', '  Róbin  ']) {
    assert.deepEqual(
      CREW.search(escrito).matches.map((entry) => entry.id),
      ['nico-robin'],
      `buscando "${escrito}"`,
    );
  }
});

test('busca dentro del nombre entero, así que el apodo de detrás de la barra vale', () => {
  assert.equal(CREW.search('big mom').matches[0].id, 'charlotte-linlin-big-mom');
});

test('con el campo vacío no se enseña nada', () => {
  for (const nada of ['', '   ', null, undefined]) {
    assert.deepEqual(CREW.search(nada), { matches: [], total: 0, hidden: 0 });
  }
});

test('lo que no coincide con nadie no devuelve nada', () => {
  assert.deepEqual(CREW.search('pepito'), { matches: [], total: 0, hidden: 0 });
});

// Criterio 4: como mucho 30 coincidencias, y avisa de cuántas faltan.
test('el buscador no enseña más de treinta y dice cuántas se deja', () => {
  const many = createCatalog(
    Array.from({ length: 50 }, (_, i) => ({ id: `pirata-${i}`, name: `Pirata ${i}` })),
  );
  const { matches, total, hidden } = many.search('pirata');

  assert.equal(matches.length, MAX_RESULTS);
  assert.equal(total, 50);
  assert.equal(hidden, 20);
});

test('si caben todas, no falta ninguna', () => {
  const { matches, total, hidden } = CREW.search('n');

  assert.equal(hidden, 0);
  assert.equal(matches.length, total);
});

test('el tope se puede bajar, para que la interfaz no tenga que saber el número', () => {
  const { matches, hidden } = CREW.search('n', 2);

  assert.equal(matches.length, 2);
  assert.equal(hidden, CREW.search('n').total - 2);
});
