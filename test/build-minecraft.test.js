import { test } from 'node:test';
import assert from 'node:assert/strict';

import { namesFromRegistry } from '../scripts/build-minecraft.js';

// La espec (sección 6.5 de la v5) pide testear la función que transforma los dos
// ficheros, no la llamada a la red: aquí no hay internet, solo ficheros de mentira.

/** Un registro como el del juego, con los campos que no usamos incluidos. */
const ITEMS = [
  { id: 0, name: 'air', displayName: 'Air', stackSize: 64 },
  { id: 1, name: 'stone', displayName: 'Stone', stackSize: 64 },
  { id: 2, name: 'diamond_sword', displayName: 'Diamond Sword', stackSize: 1 },
  { id: 3, name: 'music_disc_13', displayName: 'Music Disc', stackSize: 1 },
  { id: 4, name: 'music_disc_pigstep', displayName: 'Music Disc', stackSize: 1 },
];

const LANG = {
  'block.minecraft.stone': 'Piedra',
  'item.minecraft.diamond_sword': 'Espada de diamante',
  'item.minecraft.music_disc_13': 'Disco de música',
  'item.minecraft.music_disc_13.desc': 'C418 - 13',
  'item.minecraft.music_disc_pigstep': 'Disco de música',
  'item.minecraft.music_disc_pigstep.desc': 'Lena Raine - Pigstep',
  'block.minecraft.air': 'Aire',
  'gui.done': 'Listo', // el fichero de idioma es la interfaz entera, no solo items
};

test('los nombres salen en español, del fichero de idioma', () => {
  const names = namesFromRegistry(ITEMS, LANG);

  assert.ok(names.includes('Piedra'));
  assert.ok(names.includes('Espada de diamante'));
});

// Un item que es un bloque se nombra en la familia de claves de los bloques.
test('un bloque se busca donde están los bloques', () => {
  assert.deepEqual(namesFromRegistry([{ name: 'stone' }], LANG), ['Piedra']);
});

// El aire está en el registro porque por dentro un hueco vacío es aire; en la mano no
// se puede tener, y adivinarlo no sería un juego.
test('el aire no es un item y se queda fuera', () => {
  assert.ok(!namesFromRegistry(ITEMS, LANG).includes('Aire'));
});

// Criterio 3 de la v5: sin la segunda línea, los 21 discos, los 19 moldes y los 8
// diseños de estandarte compartirían nombre y `buildCatalog` los fundiría.
test('lo que en el juego lleva una segunda línea la lleva pegada aquí', () => {
  const names = namesFromRegistry(ITEMS, LANG);

  assert.ok(names.includes('Disco de música: C418 - 13'));
  assert.ok(names.includes('Disco de música: Lena Raine - Pigstep'));
  assert.equal(new Set(names).size, names.length, 'no debería quedar ningún nombre repetido');
});

test('la segunda línea vale igual si la clave es la nueva', () => {
  const items = [{ name: 'netherite_upgrade_smithing_template' }];
  const lang = {
    'item.minecraft.netherite_upgrade_smithing_template': 'Molde de herrería',
    'item.minecraft.netherite_upgrade_smithing_template.new': 'Mejora de netherita',
  };

  assert.deepEqual(namesFromRegistry(items, lang), ['Molde de herrería: Mejora de netherita']);
});

// Callarse aquí encogería el catálogo sin que nadie se enterase, y la causa más
// probable es haber pedido las dos fuentes para versiones distintas.
test('un item sin nombre planta el script en vez de desaparecer', () => {
  const items = [{ name: 'stone' }, { name: 'item_de_una_version_mas_nueva' }];

  assert.throws(() => namesFromRegistry(items, LANG), /no trae el nombre de 1 items/);
});

test('las claves heredadas de Object no cuelan como nombre', () => {
  assert.throws(() => namesFromRegistry([{ name: 'constructor' }], LANG), /no trae el nombre/);
});

test('las filas que no son items se ignoran, sin reventar la generación', () => {
  assert.deepEqual(namesFromRegistry([null, 42, { id: 7 }, { name: 'stone' }], LANG), ['Piedra']);
});

test('unos ficheros que no son los que se esperan se detectan', () => {
  assert.throws(() => namesFromRegistry({ items: [] }, LANG), /no es una lista/);
  assert.throws(() => namesFromRegistry(ITEMS, null), /idioma no vale/);
  assert.throws(() => namesFromRegistry([], LANG), /ningún item aprovechable/);
  assert.throws(() => namesFromRegistry([{ name: 'air' }], LANG), /ningún item aprovechable/);
});
