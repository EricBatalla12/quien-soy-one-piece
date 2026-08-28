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
      return { type: 'create', name: readText(message.name, 'El nombre') };
    case 'join':
      return {
        type: 'join',
        code: readCode(message.code),
        name: readText(message.name, 'El nombre'),
      };
    case 'resume':
      return { type: 'resume', code: readCode(message.code), token: readToken(message.token) };
    case 'secret':
      return { type: 'secret', text: readText(message.text, 'El personaje') };
    case 'ask':
      return { type: 'ask', text: readText(message.text, 'La pregunta') };
    case 'answer':
      return { type: 'answer', answer: readAnswer(message.answer) };
    case 'guess':
      return { type: 'guess', text: readText(message.text, 'El nombre') };
    case 'rematch':
      return { type: 'rematch' };
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
