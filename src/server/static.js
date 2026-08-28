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

/** Ficheros sueltos que se sirven tal cual. */
const PUBLIC_FILES = ['index.html'];

/** Carpetas públicas enteras: la interfaz y las reglas, que corren en el navegador. */
const PUBLIC_DIRS = ['styles/', 'src/client/', 'src/game/'];

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
