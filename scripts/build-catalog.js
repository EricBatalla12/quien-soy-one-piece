/**
 * Genera `data/one-piece.json` a partir de la API pública de One Piece.
 *
 * Se ejecuta a mano —`npm run catalog`— y el resultado se sube al repositorio: el
 * juego nunca llama a la API (sección 6.1 de la espec v3). Si la API se cae, cambia
 * de formato o desaparece, el juego sigue funcionando con el fichero que ya hay.
 *
 * Lo único que toca la red es `main`. La parte que decide —de una respuesta a un
 * catálogo— es pura y está testeada con una respuesta de mentira, sin salir a
 * internet.
 *
 * Las correcciones a los nombres viven aparte, en `data/one-piece-corrections.json`:
 * un mapa de "nombre tal y como lo devuelve la API" → "nombre bueno", escrito a mano.
 * Se aplican antes de derivar el identificador, así que volver a generar el catálogo
 * no las pierde; y si la API deja de devolver un nombre corregido, el script avisa de
 * que esa corrección ya sobra.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { argv } from 'node:process';
import { fileURLToPath } from 'node:url';

import { buildCatalog, unusedCorrections } from '../src/game/catalog.js';

export const API_URL = 'https://api.api-onepiece.com/v2/characters/en';

const root = new URL('../', import.meta.url);
const CATALOG_FILE = new URL('data/one-piece.json', root);
const CORRECTIONS_FILE = new URL('data/one-piece-corrections.json', root);

/**
 * Los nombres que trae la respuesta.
 *
 * De cada personaje solo interesa el nombre: la API trae recompensa, tripulación y
 * fruta, y todo eso queda fuera de la v3 a propósito (sección 4 de la espec). Una
 * entrada sin nombre no es un personaje y se ignora aquí, en vez de reventar la
 * generación entera por una fila mala.
 */
export function namesFromResponse(payload) {
  if (!Array.isArray(payload)) throw new Error('La API no ha devuelto una lista de personajes');

  return payload
    .filter((character) => character !== null && typeof character === 'object')
    .map((character) => character.name)
    .filter((name) => typeof name === 'string');
}

/** Una respuesta de la API + las correcciones a mano → el catálogo. */
export function catalogFromResponse(payload, corrections) {
  const catalog = buildCatalog(namesFromResponse(payload), corrections);
  if (catalog.length === 0) throw new Error('La API no ha devuelto ningún personaje aprovechable');

  return catalog;
}

/**
 * El fichero, con un personaje por línea.
 *
 * Es JSON de verdad, pero puesto de forma que el diff de un catálogo regenerado
 * enseñe una línea por personaje añadido o corregido, y no cuatro.
 */
export function serializeCatalog(catalog) {
  return `[\n${catalog.map((entry) => `  ${JSON.stringify(entry)}`).join(',\n')}\n]\n`;
}

async function main() {
  const corrections = JSON.parse(readFileSync(CORRECTIONS_FILE, 'utf8'));

  console.log(`Pidiendo los personajes a ${API_URL}…`);
  const response = await fetch(API_URL);
  if (!response.ok) throw new Error(`La API ha contestado ${response.status}`);

  const payload = await response.json();
  const catalog = catalogFromResponse(payload, corrections);

  writeFileSync(CATALOG_FILE, serializeCatalog(catalog));

  const names = namesFromResponse(payload);
  console.log(`${catalog.length} personajes de los ${names.length} que ha devuelto la API.`);

  const sobran = unusedCorrections(names, corrections);
  if (sobran.length > 0) {
    console.log('\nCorrecciones que ya no le tocan a nadie, se pueden borrar:');
    for (const key of sobran) console.log(`  ${key}`);
  }
}

// Solo sale a la red si se ejecuta el script; importarlo para testearlo no hace nada.
if (argv[1] === fileURLToPath(import.meta.url)) await main();
