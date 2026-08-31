/**
 * Lo que llega por el cable.
 *
 * Todo mensaje entra por aquí antes de tocar nada. Al otro lado hay un navegador
 * que no controlamos: puede mandar una versión vieja del cliente, un JSON roto, o
 * directamente cualquier cosa escrita a mano desde la consola. Es el mismo papel que
 * hacía `isValidState` en la v1, pero al revés: entonces desconfiábamos del estado
 * que llegaba, ahora desconfiamos de las acciones.
 *
 * Esta capa no sabe de reglas ni de salas. Solo responde a "¿esto tiene forma de
 * acción?", y devuelve una acción ya limpia o un error en castellano que se le puede
 * enseñar al jugador tal cual.
 */

import { isAnimeId } from '../game/animes.js';
import { isCharacterId } from '../game/catalog.js';
import { ANSWERS } from '../game/state.js';
import { isValidCode, normalizeCode } from './rooms.js';

/**
 * Tope de cualquier texto que escriba un jugador.
 *
 * Ni una pregunta ni un nombre de personaje llegan de lejos a esto. El tope está
 * para que nadie ocupe la memoria del servidor mandando un mensaje de diez megas.
 */
export const MAX_TEXT_LENGTH = 200;

/** Acciones para entrar en una sala; las demás exigen estar ya sentado en una. */
const ENTRY_TYPES = ['create', 'join', 'resume'];

export function isEntryType(type) {
  return ENTRY_TYPES.includes(type);
}

/** Un mensaje crudo (texto) → una acción limpia. Lanza si no la hay. */
export function readMessage(raw) {
  const message = parseJson(raw);

  switch (message.type) {
    case 'create':
      return {
        type: 'create',
        name: readText(message.name, 'El nombre'),
        anime: readAnime(message.anime),
      };
    case 'join':
      return {
        type: 'join',
        code: readCode(message.code),
        name: readText(message.name, 'El nombre'),
      };
    case 'resume':
      return { type: 'resume', code: readCode(message.code), token: readToken(message.token) };
    case 'secret':
      return { type: 'secret', characterId: readCharacterId(message.characterId) };
    case 'ask':
      return { type: 'ask', text: readText(message.text, 'La pregunta') };
    case 'answer':
      return { type: 'answer', answer: readAnswer(message.answer) };
    case 'guess':
      return { type: 'guess', characterId: readCharacterId(message.characterId) };
    case 'rematch':
      return { type: 'rematch' };
    case 'leave':
      return { type: 'leave' };
    default:
      throw new Error('Esa acción no existe');
  }
}

function parseJson(raw) {
  let message;
  try {
    message = JSON.parse(String(raw));
  } catch {
    throw new Error('El mensaje no se entiende');
  }

  if (message === null || typeof message !== 'object') throw new Error('El mensaje no se entiende');
  return message;
}

/**
 * `label` viene del sitio que llama porque el mismo campo `text` es una pregunta,
 * un personaje o un nombre según la acción, y el jugador merece leer cuál falla.
 */
function readText(value, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${label} no puede estar vacío`);
  }
  if (value.length > MAX_TEXT_LENGTH) throw new Error(`${label} es demasiado largo`);

  return value.trim();
}

/**
 * Desde la v3 el personaje viaja como identificador. Aquí solo se mira que tenga la
 * forma de uno; que además exista lo comprueban las reglas, que son las que tienen el
 * catálogo delante.
 */
function readCharacterId(value) {
  if (!isCharacterId(value)) throw new Error('Ese personaje no existe');
  return value;
}

/**
 * El anime de una sala nueva.
 *
 * Aquí sí se comprueba que exista, y no solo que tenga forma, al revés que con un
 * personaje: los animes son unos pocos y están en el registro, que es código puro,
 * así que no hace falta esperar a tener un catálogo delante. Es el criterio 6 de la
 * v4, y vale también para un `create` escrito a mano por el WebSocket.
 */
function readAnime(value) {
  if (!isAnimeId(value)) throw new Error('Ese anime no existe');
  return value;
}

function readCode(value) {
  if (!isValidCode(value)) throw new Error('Ese código de sala no vale');
  return normalizeCode(value);
}

function readToken(value) {
  if (typeof value !== 'string' || value === '') throw new Error('Falta tu identificación');
  return value;
}

function readAnswer(value) {
  if (!ANSWERS.includes(value)) throw new Error('Esa respuesta no existe');
  return value;
}
