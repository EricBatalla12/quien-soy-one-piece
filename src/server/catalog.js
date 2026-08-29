/**
 * El catálogo, leído del repositorio al arrancar.
 *
 * Es la única parte del catálogo que toca el disco; lo que se hace con él es puro y
 * vive en `src/game/catalog.js`. Se lee una vez y de forma síncrona: sin catálogo no
 * hay partida que jugar, así que no tiene sentido levantar el servidor sin él.
 *
 * El fichero está en el repositorio a propósito (sección 6.1 de la espec v3): con la
 * API apagada o inaccesible el juego arranca y se juega igual (criterio 9).
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { createCatalog } from '../game/catalog.js';

/** Dentro del repositorio, y también la URL por la que lo pide el navegador. */
export const CATALOG_PATH = 'data/characters.json';

export function loadCatalog(root) {
  let entries;
  try {
    entries = JSON.parse(readFileSync(join(root, CATALOG_PATH), 'utf8'));
  } catch (cause) {
    throw new Error(`No se ha podido leer ${CATALOG_PATH}: ${cause.message}`);
  }

  const catalog = createCatalog(entries);
  if (catalog.size === 0) throw new Error(`${CATALOG_PATH} no tiene ningún personaje`);

  return catalog;
}
