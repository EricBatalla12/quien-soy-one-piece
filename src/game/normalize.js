/**
 * Comparación tolerante de nombres de personaje.
 *
 * Como el personaje se escribe a mano (ver sección 6 de la espec), al arriesgar
 * no podemos exigir una coincidencia exacta: "ZORO", "zoro" y " Zóro " tienen que
 * valer igual. Es el criterio de aceptación 8.
 */

/** Quita mayúsculas, acentos y espacios sobrantes. */
export function normalizeName(name) {
  return name
    .normalize('NFD') // separa cada letra de su acento
    .replace(/\p{Mn}/gu, '') // y borra los acentos, que quedan sueltos
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' '); // varios espacios seguidos cuentan como uno
}

/** ¿Son el mismo personaje, ignorando la forma de escribirlo? */
export function sameName(a, b) {
  return normalizeName(a) === normalizeName(b);
}

/** Texto vacío, solo espacios, o directamente no es texto. */
export function isBlank(text) {
  return typeof text !== 'string' || text.trim() === '';
}
