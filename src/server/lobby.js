/**
 * Las salas vivas del servidor.
 *
 * Es la única pieza con estado que cambia: un mapa de código → sala, en memoria. Si
 * el servidor se reinicia, las partidas se pierden; está asumido en la sección 7 de
 * la espec v2.
 *
 * Sigue sin saber nada de sockets, así que se testea sin levantar nada. El reloj, el
 * azar de los códigos, el de los tokens y los catálogos llegan de fuera por la misma
 * razón; los catálogos, además, son lo que valida los personajes y lo que resuelve
 * sus nombres para la vista.
 *
 * Desde la v4 hay uno por anime y cada sala usa el suyo, el que eligió quien la creó:
 * el lobby es el único sitio donde se sabe qué catálogo le toca a qué partida.
 */

import { randomUUID } from 'node:crypto';

import { applyAction } from './actions.js';
import { projectView } from '../game/view.js';
import {
  createRoom,
  hasExpired,
  joinRoom,
  makeCode,
  playerIdByToken,
  setConnected,
} from './rooms.js';

/** Intentos para dar con un código libre antes de rendirse. */
const CODE_ATTEMPTS = 20;

export function createLobby({
  catalogs,
  now = Date.now,
  newCode = makeCode,
  newToken = randomUUID,
} = {}) {
  if (catalogs === undefined) throw new Error('El lobby necesita los catálogos de personajes');

  const rooms = new Map();

  /** El catálogo con el que se juega en esta sala: el de su anime. */
  function catalogOf(room) {
    return catalogs.of(room.anime);
  }

  /** La sala, o un error. Una sala caducada es una sala que ya no existe. */
  function liveRoom(code) {
    const room = rooms.get(code);
    if (room === undefined) throw new Error('No existe ninguna sala con ese código');

    if (hasExpired(room, now())) {
      rooms.delete(code);
      throw new Error('Esa sala ha caducado');
    }

    return room;
  }

  return {
    /**
     * Abre una sala nueva. Quien la abre se sienta en la plaza 1 y elige el anime;
     * quien entre después lo hereda.
     */
    open(name, anime) {
      const code = freeCode();
      const token = newToken();
      rooms.set(code, createRoom({ code, name, token, anime, now: now() }));

      return { code, playerId: 1, token };
    },

    /** Se sienta en la plaza libre de una sala existente. */
    join(code, name) {
      const room = liveRoom(code);
      const token = newToken();
      rooms.set(code, joinRoom(room, { name, token, now: now() }));

      return { code, playerId: 2, token };
    },

    /**
     * Recupera la plaza que ya era tuya.
     *
     * Es lo que hace que recargar la pestaña no pierda la partida (criterio 14): el
     * token de `sessionStorage` vale lo mismo que estar conectado sin haberse ido.
     */
    resume(code, token) {
      const room = liveRoom(code);
      const playerId = playerIdByToken(room, token);
      if (playerId === null) throw new Error('Tu sitio en esa sala ya no existe');

      rooms.set(code, setConnected(room, playerId, true, now()));
      return { code, playerId };
    },

    /** Una acción de dentro de la sala. Devuelve la sala ya avanzada. */
    act(code, playerId, message) {
      const before = liveRoom(code);
      const room = applyAction(before, playerId, message, now(), catalogOf(before));
      rooms.set(code, room);

      return room;
    },

    /**
     * Se ha caído la conexión de un jugador. Su plaza sigue siendo suya: nadie más
     * puede ocuparla mientras la sala viva, y el rival ve que se ha ido.
     */
    leave(code, playerId) {
      const room = rooms.get(code);
      if (room === undefined || room.players[playerId] === null) return null;

      const left = setConnected(room, playerId, false, now());
      rooms.set(code, left);

      return left;
    },

    /** Lo que hay que enseñarle a un jugador de esta sala. */
    view(code, playerId) {
      const room = liveRoom(code);
      return projectView(room, playerId, catalogOf(room));
    },

    /**
     * Cierra una sala porque alguien se ha ido: deja de existir para los dos.
     *
     * No se queja si ya no estaba —pudo caducar justo antes—, porque quien se va se
     * va igual. Devuelve la sala que había, o `null`, para que el servidor sepa a
     * quién avisar y con qué nombre.
     */
    close(code) {
      const room = rooms.get(code) ?? null;
      rooms.delete(code);

      return room;
    },

    /**
     * Tira las salas caducadas y devuelve cuáles eran, para que el servidor avise a
     * quien siguiera conectado antes de cerrarle el socket.
     */
    sweep() {
      const dead = [];

      for (const [code, room] of rooms) {
        if (!hasExpired(room, now())) continue;
        rooms.delete(code);
        dead.push(room);
      }

      return dead;
    },

    /** Cuántas salas hay vivas. Para los tests y para mirar cómo va el servidor. */
    get size() {
      return rooms.size;
    },
  };

  /**
   * Un código que no esté cogido.
   *
   * Con 22^5 códigos y salas que duran minutos, chocar es rarísimo; aun así se
   * comprueba, porque un choque le daría a un desconocido la partida de otro.
   */
  function freeCode() {
    for (let attempt = 0; attempt < CODE_ATTEMPTS; attempt += 1) {
      const code = newCode();
      if (!rooms.has(code)) return code;
    }

    throw new Error('No se ha podido crear la sala, inténtalo otra vez');
  }
}
