/**
 * El registro de animes: con cuáles se puede jugar.
 *
 * Es la única lista, y la miran los tres lados: el servidor para saber qué catálogos
 * cargar y para rechazar una sala de un anime que no existe, el navegador para pintar
 * la pantalla de entrada, y las pruebas para comprobar que a ninguno le falta nada.
 *
 * Capa pura, como el catálogo: aquí no se lee ningún fichero. Vive en `src/game`
 * porque lo necesitan los dos lados, y por eso se sirve por HTTP.
 *
 * **Añadir un anime es añadir una entrada aquí**, su fichero de personajes y su
 * bloque de colores en `styles/main.css`. Nada más: ni reglas, ni salas, ni mensajes
 * (criterio 8 de la espec v4).
 */

/**
 * Los animes, en el orden en que se ofrecen. El primero es el que viene elegido.
 *
 * El identificador **no se deriva del nombre**, al revés que el de un personaje:
 * "Hunter × Hunter" daría `hunter-hunter`, porque la equis no es una letra. Son unos
 * pocos y se escriben a mano, que además es lo que corresponde a algo que acaba
 * siendo un nombre de fichero y un trozo de URL (sección 5.1 de la espec v4).
 */
export const ANIMES = [
  {
    id: 'one-piece',
    name: 'One Piece',
    tagline: 'Piratas, frutas del diablo y un sombrero de paja',
  },
  {
    id: 'hunter-x-hunter',
    name: 'Hunter × Hunter',
    tagline: 'Cazadores, nen y un examen del que no vuelven todos',
  },
];

/** Con el que se juega si no se elige otro: el primero de la lista. */
export const DEFAULT_ANIME = ANIMES[0].id;

/**
 * Un objeto de JSON no se puede consultar con `[]` sin arriesgarse a que una clave
 * como `constructor` conteste que sí, y aquí lo que se consulta viene del cable.
 */
const BY_ID = new Map(ANIMES.map((anime) => [anime.id, anime]));

/** El anime, o `null` si no es ninguno de los que hay. */
export function findAnime(id) {
  if (typeof id !== 'string') return null;
  return BY_ID.get(id) ?? null;
}

/**
 * ¿Es este uno de los animes?
 *
 * A diferencia de `isCharacterId`, que solo mira la forma, esto contesta si existe:
 * los personajes viven en un fichero que se carga al arrancar y los animes están
 * aquí mismo, así que no hace falta preguntarlo en dos sitios.
 */
export function isAnimeId(id) {
  return findAnime(id) !== null;
}

/**
 * Dónde está el catálogo de este anime, dentro del repositorio, y también la URL por
 * la que lo pide el navegador.
 *
 * Se **deriva** del identificador en vez de escribirse en el registro: un anime no
 * puede apuntar a un fichero cualquiera, y así no hay dos sitios donde equivocarse.
 */
export function catalogPath(id) {
  if (!isAnimeId(id)) throw new Error(`No hay ningún anime llamado ${JSON.stringify(id)}`);
  return `data/${id}.json`;
}
