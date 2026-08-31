/**
 * La sala: dos plazas, una partida y un marcador.
 *
 * Capa pura, igual que las reglas: aquí no hay sockets, ni relojes, ni azar. El
 * momento actual y los valores aleatorios llegan como parámetros para que todo esto
 * se pueda testear sin levantar un servidor.
 *
 * Cada función devuelve una sala nueva en vez de tocar la que recibe, como hacen las
 * acciones del juego. Quien guarda las salas es el `lobby`.
 */

import { isAnimeId } from '../game/animes.js';
import { createGame } from '../game/state.js';
import { isBlank } from '../game/normalize.js';

/** Cuánto aguanta una sala abandonada (sección 6.2 de la espec v2). */
export const ROOM_TTL_MS = 15 * 60 * 1000;

/** El nombre es una etiqueta para la interfaz, no un texto libre: se le pone tope. */
export const MAX_NAME_LENGTH = 20;

export const CODE_LENGTH = 5;

/**
 * Alfabeto del código de sala, sin I, L, O ni Q.
 *
 * El código se dicta en voz alta o por WhatsApp, y esas cuatro letras se confunden
 * con el 1 y el 0 según la tipografía. Quedan 22 letras: 22^5 son cinco millones de
 * códigos, de sobra para salas que duran minutos.
 */
export const CODE_ALPHABET = 'ABCDEFGHJKMNPRSTUVWXYZ';

/** Un código nuevo. `random` se inyecta para poder fijarlo en los tests. */
export function makeCode(random = Math.random) {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    code += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)];
  }
  return code;
}

/** Lo que teclea el jugador: se admiten minúsculas y espacios de más. */
export function normalizeCode(text) {
  if (typeof text !== 'string') return '';
  return text.trim().toUpperCase();
}

export function isValidCode(text) {
  const code = normalizeCode(text);
  return code.length === CODE_LENGTH && [...code].every((letter) => CODE_ALPHABET.includes(letter));
}

/** El nombre tal y como se guardará, o un error si no vale. */
export function cleanName(name) {
  if (isBlank(name)) throw new Error('El nombre no puede estar vacío');
  return name.trim().replace(/\s+/g, ' ').slice(0, MAX_NAME_LENGTH);
}

/**
 * Sala recién creada: quien la abre ocupa la plaza 1, con el anime que ha elegido, y
 * espera rival.
 *
 * El anime es de la sala y no de cada jugador (sección 4 de la espec v4): quien entra
 * con el código lo hereda, y no cambia en toda la vida de la sala, revanchas
 * incluidas. Se comprueba aquí, y no solo al leer el mensaje, porque una sala de un
 * anime que no existe no tendría catálogo con el que validar ni un solo personaje.
 */
export function createRoom({ code, name, token, anime, now }) {
  if (!isAnimeId(anime)) throw new Error('Ese anime no existe');

  return {
    code,
    anime,
    players: { 1: seat(name, token), 2: null },
    game: createGame(),
    score: { 1: 0, 2: 0 },
    lastActivity: now,
  };
}

/** El segundo jugador ocupa la plaza libre. */
export function joinRoom(room, { name, token, now }) {
  if (isFull(room)) throw new Error('La sala ya está llena');

  return { ...room, players: { ...room.players, 2: seat(name, token) }, lastActivity: now };
}

export function isFull(room) {
  return room.players[1] !== null && room.players[2] !== null;
}

/**
 * Qué plaza corresponde a este token.
 *
 * Es la única forma de demostrar que eres quien dices ser, así que se compara contra
 * los dos jugadores y se rechaza cualquier cosa que no sea un token de verdad: un
 * `undefined` colándose aquí abriría la plaza de una sala a cualquiera.
 */
export function playerIdByToken(room, token) {
  if (typeof token !== 'string' || token === '') return null;
  return [1, 2].find((id) => room.players[id] !== null && room.players[id].token === token) ?? null;
}

/**
 * Marca a un jugador como conectado o desconectado.
 *
 * Desconectarse también cuenta como actividad: es justo el instante en el que
 * empieza a correr el plazo de expiración de la sala.
 */
export function setConnected(room, playerId, connected, now) {
  const player = room.players[playerId];
  if (player === undefined || player === null) throw new Error('Esa plaza está libre');

  return {
    ...room,
    players: { ...room.players, [playerId]: { ...player, connected } },
    lastActivity: now,
  };
}

/**
 * Guarda el avance de la partida y, si acaba de terminar, apunta la victoria.
 *
 * El marcador vive en la sala y no en las reglas porque la partida no sabe que
 * existen las salas: es la sala quien encadena varias partidas entre los mismos dos.
 */
export function withGame(room, game, now) {
  const justFinished = game.phase === 'finished' && room.game.phase !== 'finished';
  const score = justFinished
    ? { ...room.score, [game.winner]: room.score[game.winner] + 1 }
    : room.score;

  return { ...room, game, score, lastActivity: now };
}

/** Otra partida entre los mismos dos, con el marcador intacto. */
export function rematch(room, now) {
  if (room.game.phase !== 'finished') throw new Error('La partida todavía no ha terminado');
  if (!isFull(room)) throw new Error('No hay rival con quien jugar la revancha');

  return { ...room, game: createGame(), lastActivity: now };
}

/**
 * ¿Hay que tirar esta sala?
 *
 * El plazo mide abandono, no lentitud: mientras las dos plazas estén ocupadas y sus
 * dos jugadores conectados, la sala no caduca por mucho que uno se tome media hora
 * en preguntar. Caduca la que espera un rival que no llega y la que se quedó a
 * medias con alguien que no ha vuelto.
 */
export function hasExpired(room, now, ttl = ROOM_TTL_MS) {
  if (isFull(room) && room.players[1].connected && room.players[2].connected) return false;
  return now - room.lastActivity > ttl;
}

function seat(name, token) {
  return { name: cleanName(name), token, connected: true };
}
