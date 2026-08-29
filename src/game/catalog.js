/**
 * El catálogo de personajes: la lista cerrada de la que se elige.
 *
 * Capa pura, como las reglas. Aquí no se lee ningún fichero ni se llama a ninguna
 * API: eso lo hacen el script que genera el catálogo y el servidor que lo carga.
 * Este módulo solo sabe convertir nombres en identificadores, limpiar una lista de
 * nombres y contestar preguntas sobre la lista ya limpia.
 *
 * Lo usan los dos lados: el servidor para validar y para resolver nombres, y el
 * navegador para el buscador. Por eso vive en `src/game` y se sirve por HTTP.
 */

import { normalizeName } from './normalize.js';

/**
 * Tope de un identificador. Ningún nombre de personaje se acerca, y sirve para que
 * nadie mande por el cable una cadena enorme con forma de identificador.
 */
export const MAX_ID_LENGTH = 100;

/** Un identificador bien formado: minúsculas, cifras y guiones que separan. */
const ID_SHAPE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * El identificador de un personaje, derivado de su nombre.
 *
 * No se coge de la API a propósito (sección 5.1 de la espec v3): derivarlo del
 * nombre hace que volver a generar el catálogo no cambie los identificadores de los
 * que ya estaban, y que dos entradas repetidas de la API caigan en el mismo.
 *
 * Devuelve cadena vacía si del nombre no sale nada aprovechable, que es la forma de
 * decir "esto no es un personaje".
 */
export function characterId(name) {
  return normalizeName(name)
    .replace(/[^a-z0-9]+/g, '-') // lo que no es letra ni cifra separa
    .replace(/^-+|-+$/g, ''); // y no separa nada al principio ni al final
}

/** ¿Tiene forma de identificador? Que exista o no es otra pregunta. */
export function isCharacterId(value) {
  return typeof value === 'string' && value.length <= MAX_ID_LENGTH && ID_SHAPE.test(value);
}

/**
 * Una lista de nombres en bruto → el catálogo, limpio y ordenado.
 *
 * Es lo que hace que el fichero de datos cumpla el criterio 11: sin nombres
 * repetidos ni vacíos. Los repetidos caen en el mismo identificador y se quedan en
 * uno; los que no dan identificador se tiran.
 *
 * `corrections` es el fichero escrito a mano: nombre tal y como llega → nombre
 * bueno. Se aplica antes de derivar el identificador, porque corregir "Marchall"
 * por "Marshall" tiene que corregir también el identificador.
 *
 * El orden es alfabético para que volver a generar el catálogo dé el mismo fichero
 * y el diff enseñe solo lo que ha cambiado de verdad.
 */
export function buildCatalog(names, corrections = {}) {
  const fixes = correctionMap(corrections);
  const byId = new Map();

  for (const raw of names) {
    const given = tidy(raw);
    const name = fixes.get(given) ?? given;
    const id = characterId(name);

    if (id === '') continue;
    if (!byId.has(id)) byId.set(id, { id, name });
  }

  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

/**
 * Correcciones que ya no le tocan a nadie.
 *
 * Si la API arregla una errata por su cuenta o se deja de escribir un nombre, su
 * corrección se queda ahí sin hacer nada. El script las enseña al terminar para que
 * quien mantenga el fichero pueda borrarlas, en vez de acumular reglas muertas.
 */
export function unusedCorrections(names, corrections = {}) {
  const given = new Set([...names].map(tidy));
  return [...correctionMap(corrections).keys()].filter((key) => !given.has(key));
}

/**
 * El catálogo ya limpio, listo para preguntarle cosas.
 *
 * Se construye una vez —al arrancar el servidor, o al recibir el fichero en el
 * navegador— y a partir de ahí solo se consulta.
 */
export function createCatalog(entries) {
  const list = readEntries(entries);
  const byId = new Map(list.map((entry) => [entry.id, entry]));

  if (byId.size !== list.length) throw new Error('El catálogo tiene identificadores repetidos');

  return {
    get size() {
      return list.length;
    },

    /** La lista entera, en el orden del fichero. */
    get list() {
      return list;
    },

    /** ¿Es este uno de los personajes? Es la validación del criterio 5. */
    has(id) {
      return byId.has(id);
    },

    /** El nombre que se enseña, o `null` si no es ningún personaje. */
    nameOf(id) {
      return byId.get(id)?.name ?? null;
    },
  };
}

/** El fichero de datos podría estar a medias o mal escrito: se comprueba al leerlo. */
function readEntries(entries) {
  if (!Array.isArray(entries)) throw new Error('El catálogo no es una lista');

  return entries.map((entry) => {
    if (entry === null || typeof entry !== 'object') throw new Error('El catálogo tiene una entrada que no es un personaje');
    if (!isCharacterId(entry.id)) throw new Error(`Identificador de personaje inválido: ${JSON.stringify(entry.id)}`);
    if (typeof entry.name !== 'string' || entry.name.trim() === '') {
      throw new Error(`El personaje ${entry.id} no tiene nombre`);
    }

    return { id: entry.id, name: entry.name };
  });
}

/**
 * Un objeto de JSON no se puede consultar con `[]` sin arriesgarse a que una clave
 * como `constructor` conteste que sí: se pasa a Map antes de tocarlo.
 */
function correctionMap(corrections) {
  if (corrections === null || typeof corrections !== 'object') return new Map();

  return new Map(
    Object.entries(corrections)
      .filter(([, fixed]) => typeof fixed === 'string')
      .map(([given, fixed]) => [tidy(given), tidy(fixed)]),
  );
}

/** El nombre sin espacios sobrantes, que es como se guarda y como se compara. */
function tidy(name) {
  if (typeof name !== 'string') return '';
  return name.trim().replace(/\s+/g, ' ');
}
