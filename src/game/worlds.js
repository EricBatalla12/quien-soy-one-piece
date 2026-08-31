/**
 * El registro de mundos: con cuáles se puede jugar.
 *
 * Es la única lista, y la miran los tres lados: el servidor para saber qué catálogos
 * cargar y para rechazar una sala de un mundo que no existe, el navegador para pintar
 * la pantalla de entrada, y las pruebas para comprobar que a ninguno le falta nada.
 *
 * Capa pura, como el catálogo: aquí no se lee ningún fichero. Vive en `src/game`
 * porque lo necesitan los dos lados, y por eso se sirve por HTTP.
 *
 * **Añadir un mundo es añadir una entrada aquí**, su fichero de personajes y su
 * bloque de colores en `styles/main.css`. Nada más: ni reglas, ni salas, ni mensajes
 * (criterio 8 de la espec v4).
 *
 * El emblema vive aquí y no en el CSS porque es una forma, no un color: cada mundo
 * trae su dibujo y los colores se los pone su tema. Se dibuja con el vocabulario de
 * clases que define `styles/main.css` —`bone`, `ink`, `accent`, `hot`— y no con
 * colores propios, así que el mismo emblema vale para el tema que sea.
 *
 * **Dibujos propios, sin arte con derechos**, en todos los mundos: son formas
 * geométricas. Los nombres de los personajes no son arte, pero un logotipo sí.
 */

/** Calavera pirata con sombrero de paja. */
const STRAW_HAT = `
  <svg class="emblem" viewBox="0 0 100 100" aria-hidden="true">
    <g class="stroke-bone" stroke-width="9">
      <path d="M18 74 L82 46" /><path d="M18 46 L82 74" />
    </g>
    <g class="bone">
      <circle cx="16" cy="74" r="6" /><circle cx="84" cy="46" r="6" />
      <circle cx="16" cy="46" r="6" /><circle cx="84" cy="74" r="6" />
    </g>
    <path class="bone" d="M50 30 C64 30 73 40 73 53 C73 62 68 68 62 71 L62 79 C62 82 59 84 50 84
      C41 84 38 82 38 79 L38 71 C32 68 27 62 27 53 C27 40 36 30 50 30 Z" />
    <ellipse class="ink" cx="41" cy="54" rx="6.5" ry="7.5" />
    <ellipse class="ink" cx="59" cy="54" rx="6.5" ry="7.5" />
    <path class="ink" d="M50 63 L46 71 L54 71 Z" />
    <ellipse class="accent" cx="50" cy="30" rx="34" ry="8" />
    <path class="accent" d="M31 30 C31 18 38 12 50 12 C62 12 69 18 69 30 Z" />
    <path class="hot" d="M31 27 L69 27 L69 31 L31 31 Z" />
  </svg>
`;

/**
 * Licencia de cazador: una tarjeta con la equis del título y la estrella del rango.
 *
 * La equis es lo que se reconoce, y es una aspa, no un logotipo de nadie. La tarjeta
 * y la estrella son formas de manual: sirven para que el medallón tenga peso a cuatro
 * rem, que es donde se ve.
 */
const HUNTER_LICENCE = `
  <svg class="emblem" viewBox="0 0 100 100" aria-hidden="true">
    <g transform="rotate(-7 50 50)">
      <rect class="bone" x="18" y="27" width="64" height="46" rx="7" />
      <rect class="accent" x="18" y="27" width="64" height="11" rx="5.5" />
      <g class="stroke-ink" stroke-width="9">
        <path d="M35 47 L65 68" /><path d="M65 47 L35 68" />
      </g>
    </g>
    <circle class="accent-deep" cx="76" cy="76" r="10" />
    <path class="bone" d="M76 69 L77.9 73.4 L82.7 73.8 L79 77 L80.1 81.7 L76 79.2
      L71.9 81.7 L73 77 L69.3 73.8 L74.1 73.4 Z" />
  </svg>
`;

/**
 * Bloque de tierra en isométrica: tres caras y unos píxeles encima.
 *
 * Un cubo en perspectiva es geometría, no el dibujo de nadie, y es lo que dice
 * "Minecraft" sin copiar ni una textura. Los píxeles de la cara de arriba son lo que
 * lo separa de un cubo cualquiera.
 */
const DIRT_BLOCK = `
  <svg class="emblem" viewBox="0 0 100 100" aria-hidden="true">
    <path class="accent-dark" d="M50 50 L82 34 L82 66 L50 82 Z" />
    <path class="accent-deep" d="M18 34 L50 50 L50 82 L18 66 Z" />
    <path class="accent" d="M50 18 L82 34 L50 50 L18 34 Z" />
    <g class="bone">
      <path d="M42 26 L50 30 L42 34 L34 30 Z" />
      <path d="M58 26 L66 30 L58 34 L50 30 Z" />
      <path d="M50 34 L58 38 L50 42 L42 38 Z" />
    </g>
  </svg>
`;

/**
 * Los mundos, en el orden en que se ofrecen. El primero es el que viene elegido.
 *
 * `noun` es cómo se llama lo que hay dentro, en singular: en One Piece se adivina un
 * personaje y en Minecraft un objeto, y la interfaz no puede llamarle personaje a un
 * yunque. El plural se forma con una ese y se da por hecho que la palabra es
 * masculina —"el personaje", "el objeto"—, que es lo que toca en las que hay; el día
 * que entre una que no, se le añadirá el género al registro.
 *
 * El identificador **no se deriva del nombre**, al revés que el de un personaje:
 * "Hunter × Hunter" daría `hunter-hunter`, porque la equis no es una letra. Son unos
 * pocos y se escriben a mano, que además es lo que corresponde a algo que acaba
 * siendo un nombre de fichero y un trozo de URL (sección 5.1 de la espec v4).
 */
export const WORLDS = [
  {
    id: 'one-piece',
    name: 'One Piece',
    tagline: 'Piratas, frutas del diablo y un sombrero de paja',
    noun: 'personaje',
    emblem: STRAW_HAT,
  },
  {
    id: 'hunter-x-hunter',
    name: 'Hunter × Hunter',
    tagline: 'Cazadores, nen y un examen del que no vuelven todos',
    noun: 'personaje',
    emblem: HUNTER_LICENCE,
  },
  {
    id: 'minecraft',
    name: 'Minecraft',
    tagline: 'Bloques, picos y todo lo que cabe en un cofre',
    noun: 'objeto',
    emblem: DIRT_BLOCK,
  },
];

/** Con el que se juega si no se elige otro: el primero de la lista. */
export const DEFAULT_WORLD = WORLDS[0].id;

/**
 * Un objeto de JSON no se puede consultar con `[]` sin arriesgarse a que una clave
 * como `constructor` conteste que sí, y aquí lo que se consulta viene del cable.
 */
const BY_ID = new Map(WORLDS.map((world) => [world.id, world]));

/** El mundo, o `null` si no es ninguno de los que hay. */
export function findWorld(id) {
  if (typeof id !== 'string') return null;
  return BY_ID.get(id) ?? null;
}

/**
 * ¿Es este uno de los mundos?
 *
 * A diferencia de `isCharacterId`, que solo mira la forma, esto contesta si existe:
 * los personajes viven en un fichero que se carga al arrancar y los mundos están
 * aquí mismo, así que no hace falta preguntarlo en dos sitios.
 */
export function isWorldId(id) {
  return findWorld(id) !== null;
}

/**
 * Dónde está el catálogo de este mundo, dentro del repositorio, y también la URL por
 * la que lo pide el navegador.
 *
 * Se **deriva** del identificador en vez de escribirse en el registro: un mundo no
 * puede apuntar a un fichero cualquiera, y así no hay dos sitios donde equivocarse.
 */
export function catalogPath(id) {
  if (!isWorldId(id)) throw new Error(`No hay ningún mundo llamado ${JSON.stringify(id)}`);
  return `data/${id}.json`;
}
