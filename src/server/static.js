/**
 * Qué ficheros del repositorio se pueden pedir por HTTP.
 *
 * El servidor sirve el juego además de coordinar las partidas, así que aquí se
 * decide qué es público. Se hace con una lista blanca y no prohibiendo `..`: si un
 * día aparece un fichero con credenciales en el repositorio, una lista blanca no lo
 * publica sola, y una lista negra sí.
 *
 * Es una función pura sobre la URL pedida, así que los intentos de escapar del
 * directorio se pueden testear sin levantar nada.
 */

import { WORLDS, catalogPath } from '../game/worlds.js';

/**
 * Ficheros sueltos que se sirven tal cual.
 *
 * Además del juego, el catálogo de cada mundo y las tres piezas puras que el
 * navegador necesita: el registro de mundos para la pantalla de entrada, y las dos
 * que buscan en un catálogo. Se nombran una a una en vez de abrir `src/game/`: ahí
 * también viven las reglas y la vista, que son cosa del servidor.
 *
 * Los catálogos salen del registro y no de una lista escrita aquí: añadir un mundo no
 * puede exigir acordarse de publicar su fichero (criterio 8 de la espec v4).
 */
const PUBLIC_FILES = [
  'index.html',
  ...WORLDS.map((world) => catalogPath(world.id)),
  'src/game/worlds.js',
  'src/game/catalog.js',
  'src/game/normalize.js',
];

/**
 * Carpetas públicas enteras. Solo la interfaz: desde la v2 las reglas corren en el
 * servidor, así que el navegador no necesita `src/game` entero y no se sirve.
 */
const PUBLIC_DIRS = ['styles/', 'src/client/'];

const CONTENT_TYPES = new Map([
  ['html', 'text/html; charset=utf-8'],
  ['css', 'text/css; charset=utf-8'],
  ['js', 'text/javascript; charset=utf-8'],
  ['svg', 'image/svg+xml'],
  ['json', 'application/json; charset=utf-8'],
]);

/**
 * La ruta dentro del repositorio que corresponde a esta URL, o `null` si no se
 * sirve. La raíz es el juego.
 */
export function publicPath(url) {
  const path = pathOf(url);
  if (path === null) return null;
  if (path === '') return 'index.html';

  if (PUBLIC_FILES.includes(path)) return path;
  if (PUBLIC_DIRS.some((dir) => path.startsWith(dir))) return path;

  return null;
}

export function contentType(path) {
  const extension = path.split('.').pop();
  return CONTENT_TYPES.get(extension) ?? 'application/octet-stream';
}

/**
 * La parte de camino de la URL, ya sin query y sin escapes, o `null` si trae algo
 * con lo que no queremos ni empezar.
 */
function pathOf(url) {
  if (typeof url !== 'string' || !url.startsWith('/')) return null;

  let path;
  try {
    // La base da igual: solo se usa para poder quedarnos con el pathname.
    path = decodeURIComponent(new URL(url, 'http://localhost').pathname).slice(1);
  } catch {
    return null; // escapes rotos, como un %ZZ suelto
  }

  // Un '..' ya no puede aparecer por accidente: solo lo escribe quien quiere salirse.
  if (path.split('/').includes('..') || path.includes('\\') || path.includes('\0')) return null;

  return path;
}
