/**
 * Los catálogos, leídos del repositorio al arrancar.
 *
 * Es la única parte del catálogo que toca el disco; lo que se hace con él es puro y
 * vive en `src/game/catalog.js`. Se leen una vez y de forma síncrona: sin catálogos
 * no hay partida que jugar, así que no tiene sentido levantar el servidor sin ellos.
 *
 * Desde la v4 hay uno por anime y se cargan **todos**, no el del primero que cree una
 * sala. Son unos pocos cientos de kilobytes y se leen una sola vez; a cambio, un
 * fichero que falte o esté roto se descubre al arrancar y no cuando alguien intenta
 * jugar a ese anime (sección 6.1 de la espec v4).
 *
 * Los ficheros están en el repositorio a propósito: con la API apagada o inaccesible
 * el juego arranca y se juega igual, a los dos animes (criterio 12).
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { ANIMES, catalogPath } from '../game/animes.js';
import { createCatalog } from '../game/catalog.js';

/** El catálogo de un anime. */
export function loadCatalog(root, animeId) {
  const path = catalogPath(animeId);

  let entries;
  try {
    entries = JSON.parse(readFileSync(join(root, path), 'utf8'));
  } catch (cause) {
    throw new Error(`No se ha podido leer ${path}: ${cause.message}`);
  }

  const catalog = createCatalog(entries);
  if (catalog.size === 0) throw new Error(`${path} no tiene ningún personaje`);

  return catalog;
}

/**
 * Todos los catálogos del registro, listos para que cada sala pida el suyo.
 *
 * `of` lanza en vez de devolver nada si le preguntan por un anime que no existe: una
 * sala guarda siempre un anime de verdad, así que llegar aquí con otra cosa es un
 * fallo del servidor y no una acción de un jugador.
 */
export function loadCatalogs(root) {
  const byAnime = new Map(ANIMES.map((anime) => [anime.id, loadCatalog(root, anime.id)]));

  return {
    of(animeId) {
      const catalog = byAnime.get(animeId);
      if (catalog === undefined) throw new Error(`No hay catálogo de ${JSON.stringify(animeId)}`);

      return catalog;
    },

    /** Cuántos animes se pueden jugar ahora mismo. */
    get size() {
      return byAnime.size;
    },
  };
}
