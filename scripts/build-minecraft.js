/**
 * Genera `data/minecraft.json`: todos los items de Minecraft, con su nombre español.
 *
 * Se ejecuta a mano —`npm run minecraft`— y el resultado se sube al repositorio, igual
 * que el catálogo de One Piece: el juego no llama a nadie mientras se juega (sección
 * 6.1 de la espec v5). Si mañana estas dos fuentes desaparecen, se sigue jugando con
 * el fichero que ya hay.
 *
 * Lo único que toca la red es `main`. La parte que decide —de los dos ficheros a una
 * lista de nombres— es pura y está testeada con ficheros de mentira.
 *
 * **De dónde sale cada cosa, y por qué de ahí:**
 *
 * - La lista de items, del **registro del propio juego**. No hay que decidir qué
 *   cuenta como item ni fiarse del criterio de nadie: si está en el registro, está en
 *   el juego.
 * - Los nombres, del **fichero de idioma español de Mojang**. No son una traducción
 *   nuestra ni el inglés: son los que lee quien juega en español.
 *
 * Esta vez la procedencia se miró antes de usarla, que es justo lo que no se hizo con
 * la API de One Piece y por lo que hubo que escribir un fichero de correcciones.
 */

import { writeFileSync } from 'node:fs';
import { argv } from 'node:process';
import { fileURLToPath } from 'node:url';

import { buildCatalog } from '../src/game/catalog.js';
import { serializeCatalog } from './catalog-file.js';

/**
 * La versión de Minecraft que se retrata.
 *
 * Las dos fuentes se piden para la **misma**: mezclar la lista de una con los nombres
 * de otra dejaría items sin nombre, y el script se planta si eso pasa.
 */
export const MINECRAFT_VERSION = '1.21.11';

export const ITEMS_URL =
  `https://raw.githubusercontent.com/PrismarineJS/minecraft-data/master/data/pc/${MINECRAFT_VERSION}/items.json`;

export const LANG_URL =
  `https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/${MINECRAFT_VERSION}/assets/minecraft/lang/es_es.json`;

const CATALOG_FILE = new URL('../data/minecraft.json', import.meta.url);

/**
 * Lo que está en el registro pero no se puede tener en la mano.
 *
 * Solo el aire, comprobado sobre la 1.21.11: ocupa el identificador 0 porque por
 * dentro un hueco vacío es "aire", pero nadie lleva aire en el inventario y adivinarlo
 * no sería un juego.
 */
const NOT_ITEMS = ['air'];

/**
 * Los dos ficheros → los nombres de todos los items, en español.
 *
 * Un item se llama igual que su bloque cuando es un bloque, así que se mira en las dos
 * familias de claves del fichero de idioma.
 *
 * Y hay una segunda línea que en el juego se lee debajo del nombre: es lo que
 * distingue un disco de música de otro, un molde de herrería de otro y un diseño de
 * estandarte de otro. Sin ella, 48 items se llamarían de tres maneras y `buildCatalog`
 * los fundiría, porque comparten identificador. Se pegan las dos con dos puntos:
 * "Disco de música: Lena Raine - Pigstep".
 */
export function namesFromRegistry(items, lang) {
  if (!Array.isArray(items)) throw new Error('El registro de items no es una lista');
  if (lang === null || typeof lang !== 'object') throw new Error('El fichero de idioma no vale');

  // Un objeto de JSON no se consulta con `[]` sin arriesgarse a que `constructor`
  // conteste que sí: se pasa a Map antes de tocarlo, como hace `buildCatalog`.
  const text = new Map(Object.entries(lang).filter(([, value]) => typeof value === 'string'));

  const names = [];
  const unnamed = [];

  for (const item of items) {
    if (item === null || typeof item !== 'object') continue;
    const key = item.name;
    if (typeof key !== 'string' || NOT_ITEMS.includes(key)) continue;

    const base = text.get(`item.minecraft.${key}`) ?? text.get(`block.minecraft.${key}`);
    if (base === undefined) {
      unnamed.push(key);
      continue;
    }

    const variant = text.get(`item.minecraft.${key}.new`) ?? text.get(`item.minecraft.${key}.desc`);
    names.push(variant === undefined ? base : `${base}: ${variant}`);
  }

  // Quedarse callado aquí encogería el catálogo sin que nadie se enterase, y la causa
  // más probable es haber pedido las dos fuentes para versiones distintas.
  if (unnamed.length > 0) {
    throw new Error(
      `El fichero de idioma no trae el nombre de ${unnamed.length} items ` +
        `(${unnamed.slice(0, 5).join(', ')}…). ¿Son las dos fuentes de la misma versión?`,
    );
  }

  if (names.length === 0) throw new Error('El registro no ha dado ningún item aprovechable');

  return names;
}

async function fetchJson(url, what) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${what} ha contestado ${response.status}`);

  return response.json();
}

async function main() {
  console.log(`Pidiendo los items de Minecraft ${MINECRAFT_VERSION}…`);
  const [items, lang] = await Promise.all([
    fetchJson(ITEMS_URL, 'El registro de items'),
    fetchJson(LANG_URL, 'El fichero de idioma'),
  ]);

  const names = namesFromRegistry(items, lang);
  const catalog = buildCatalog(names);

  writeFileSync(CATALOG_FILE, serializeCatalog(catalog));

  console.log(`${catalog.length} objetos de los ${items.length} que trae el registro.`);
  if (catalog.length !== names.length) {
    console.log(`Ojo: ${names.length - catalog.length} se han fundido por compartir nombre.`);
  }
}

// Solo sale a la red si se ejecuta el script; importarlo para testearlo no hace nada.
if (argv[1] === fileURLToPath(import.meta.url)) await main();
