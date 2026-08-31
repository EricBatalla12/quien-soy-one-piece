/**
 * Cómo se escribe un catálogo en su fichero.
 *
 * Vivía dentro del script de One Piece, que era el único que había. Desde la v5 hay
 * dos scripts que generan catálogos y una prueba que comprueba el formato de todos
 * los ficheros del repositorio, así que el formato es de los tres y no de uno.
 */

/**
 * El fichero, con un personaje —o un objeto— por línea.
 *
 * Es JSON de verdad, pero puesto de forma que el diff de un catálogo regenerado
 * enseñe una línea por entrada añadida o corregida, y no cuatro.
 */
export function serializeCatalog(catalog) {
  return `[\n${catalog.map((entry) => `  ${JSON.stringify(entry)}`).join(',\n')}\n]\n`;
}
