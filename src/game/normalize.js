/**
 * Normalización de nombres: quitar mayúsculas, acentos y espacios sobrantes.
 *
 * En la v2 servía para comparar el personaje que se arriesgaba con el que había
 * escrito el rival. Desde la v3 el personaje se elige de un catálogo y la comparación
 * es por identificador, así que ya no se comparan textos: lo que queda de aquí es la
 * forma común de mirar un nombre, y la usan las dos cosas que sí lo hacen —derivar el
 * identificador de un personaje y buscar en el catálogo (sección 6.4 de la espec v3)—.
 */

/**
 * Quita mayúsculas, acentos y espacios sobrantes.
 *
 * Lo que no es texto se trata como un nombre vacío, igual que hace `isBlank`. Estas
 * dos funciones se usan juntas y sería incoherente que una tolerase lo que la otra
 * rechaza: colaría un TypeError en inglés hasta una interfaz en español.
 */
export function normalizeName(name) {
  if (typeof name !== 'string') return '';

  return name
    .normalize('NFD') // separa cada letra de su acento
    .replace(/\p{Mn}/gu, '') // y borra los acentos, que quedan sueltos
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' '); // varios espacios seguidos cuentan como uno
}

/** Texto vacío, solo espacios, o directamente no es texto. */
export function isBlank(text) {
  return typeof text !== 'string' || text.trim() === '';
}
