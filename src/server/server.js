/**
 * El servidor: HTTP para el juego, WebSocket para las partidas.
 *
 * Es la capa que toca el mundo —sockets, ficheros, el reloj— y por eso es la más
 * tonta a propósito: recibe un mensaje, se lo pasa a las capas que sí deciden y
 * reparte a cada jugador su vista. Todo lo que se puede equivocar de verdad (las
 * reglas, las salas, la validación, el secreto) vive fuera de aquí y está testeado
 * aparte.
 *
 * Nunca se envía una sala: se envía `projectView` de esa sala para cada jugador.
 */

import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { join } from 'node:path';

import { WebSocketServer } from 'ws';

import { loadCatalogs } from './catalog.js';
import { createLobby } from './lobby.js';
import { isEntryType, readMessage } from './protocol.js';
import { contentType, publicPath } from './static.js';

/**
 * Cada cuánto se tiran las salas caducadas y se comprueba que los sockets siguen
 * vivos. Se puede cambiar al arrancar para no tener que esperar medio minuto en los
 * tests.
 */
const UPKEEP_MS = 30_000;

export function startServer({
  port = 0,
  root = process.cwd(),
  catalogs = loadCatalogs(root),
  lobby = createLobby({ catalogs }),
  upkeepMs = UPKEEP_MS,
} = {}) {
  const http = createServer((request, response) => serveFile(request, response, root));
  const wss = new WebSocketServer({ server: http });

  /** Qué socket ocupa cada plaza: código → { 1: socket, 2: socket }. */
  const sockets = new Map();

  wss.on('connection', (socket) => {
    // El asiento de ESTE socket. Vacío hasta que entra en una sala.
    const seat = { code: null, playerId: null };
    socket.isAlive = true;

    socket.on('pong', () => {
      socket.isAlive = true;
    });

    socket.on('message', (raw) => {
      try {
        handle(socket, seat, readMessage(raw));
      } catch (cause) {
        send(socket, { type: 'error', message: cause.message });
      }
    });

    socket.on('close', () => {
      if (seat.code === null) return;
      // Si otro socket ya ocupó la plaza (una reconexión rápida), este no pinta nada.
      if (socketAt(seat.code, seat.playerId) !== socket) return;

      releaseSeat(seat.code, seat.playerId);
      lobby.leave(seat.code, seat.playerId);
      broadcast(seat.code);
    });
  });

  const upkeep = setInterval(() => {
    for (const room of lobby.sweep()) closeRoom(room.code, 'La sala ha caducado');
    for (const socket of wss.clients) checkAlive(socket);
  }, upkeepMs);
  upkeep.unref();

  /** Una acción ya validada. Entrar en una sala y jugar dentro son cosas distintas. */
  function handle(socket, seat, message) {
    if (isEntryType(message.type)) {
      enter(socket, seat, message);
      return;
    }

    if (seat.code === null) throw new Error('Todavía no estás en ninguna sala');

    if (message.type === 'leave') {
      leave(socket, seat);
      return;
    }

    lobby.act(seat.code, seat.playerId, message);
    broadcast(seat.code);
  }

  /**
   * Un jugador se sale de la sala, y la sala se acaba para los dos: sin rival no hay
   * partida que seguir, y dejarla viva solo dejaría al otro esperando a alguien que
   * no va a volver.
   *
   * Al rival se le avisa con `expired`, que es el mensaje de "esta sala ya no
   * existe": lo que cambia es el motivo. A los dos se les vacía la plaza en vez de
   * cerrarles el socket —como sí hace una sala caducada—, para que ninguno pase por
   * una reconexión ni lea que su sitio le espera cuando ya no hay sitio.
   */
  function leave(socket, seat) {
    const room = lobby.close(seat.code);
    const who = room === null ? 'Tu rival' : room.players[seat.playerId].name;

    for (const [playerId, other] of Object.entries(sockets.get(seat.code) ?? {})) {
      if (Number(playerId) === seat.playerId) continue;

      send(other, { type: 'expired', message: `${who} ha salido de la sala` });
      freeSeat(other);
    }

    sockets.delete(seat.code);
    freeSeat(socket);

    send(socket, { type: 'left' });
  }

  /** Deja el socket sin sala, listo para crear otra o entrar en una distinta. */
  function freeSeat(socket) {
    if (socket.seat === undefined) return;

    socket.seat.code = null;
    socket.seat.playerId = null;
  }

  function enter(socket, seat, message) {
    if (seat.code !== null) throw new Error('Ya estás en una sala');

    const seated =
      message.type === 'create'
        ? lobby.open(message.name, message.world)
        : message.type === 'join'
          ? lobby.join(message.code, message.name)
          : lobby.resume(message.code, message.token);

    seat.code = seated.code;
    seat.playerId = seated.playerId;
    takeSeat(seated.code, seated.playerId, socket);

    // La plaza cuelga también del socket para poder vaciársela a otro sin cerrarle la
    // conexión, que es lo que hace que salir de una sala no le provoque al rival una
    // reconexión y el aviso, ya falso, de que su sitio le espera.
    socket.seat = seat;

    // El token solo se manda a quien acaba de sentarse, nunca en la vista.
    send(socket, { type: 'seated', code: seated.code, playerId: seated.playerId, token: seated.token });
    broadcast(seated.code);
  }

  /** A cada jugador conectado de la sala, su vista. */
  function broadcast(code) {
    const seats = sockets.get(code);
    if (seats === undefined) return;

    for (const [playerId, socket] of Object.entries(seats)) {
      try {
        send(socket, { type: 'view', view: lobby.view(code, Number(playerId)) });
      } catch {
        // La sala ha caducado entre medias; la limpieza se encargará de cerrarla.
      }
    }
  }

  function closeRoom(code, reason) {
    const seats = sockets.get(code);
    if (seats === undefined) return;

    for (const socket of Object.values(seats)) {
      send(socket, { type: 'expired', message: reason });
      socket.close();
    }
    sockets.delete(code);
  }

  /**
   * Sienta el socket, echando al anterior si lo había: una reconexión que llega
   * antes de que el servidor se entere de la caída dejaría dos sockets en la misma
   * plaza, y el jugador vería la partida por uno y jugaría por el otro.
   */
  function takeSeat(code, playerId, socket) {
    const seats = sockets.get(code) ?? {};
    const previous = seats[playerId];
    seats[playerId] = socket;
    sockets.set(code, seats);

    if (previous !== undefined && previous !== socket) previous.close();
  }

  function releaseSeat(code, playerId) {
    const seats = sockets.get(code);
    if (seats === undefined) return;

    delete seats[playerId];
    if (Object.keys(seats).length === 0) sockets.delete(code);
  }

  function socketAt(code, playerId) {
    return sockets.get(code)?.[playerId];
  }

  /**
   * Un cable desenchufado no avisa: el socket se queda abierto para siempre y el
   * rival nunca vería que te has caído. El ping lo destapa.
   */
  function checkAlive(socket) {
    if (socket.isAlive === false) {
      socket.terminate();
      return;
    }

    socket.isAlive = false;
    socket.ping();
  }

  return {
    listen() {
      return new Promise((resolve) => {
        http.listen(port, () => resolve(http.address().port));
      });
    },

    close() {
      clearInterval(upkeep);
      for (const socket of wss.clients) socket.terminate();
      return new Promise((resolve) => {
        wss.close(() => http.close(resolve));
      });
    },
  };
}

function send(socket, message) {
  if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(message));
}

/** El juego, servido desde el mismo sitio que lo coordina: un solo origen. */
async function serveFile(request, response, root) {
  const path = request.method === 'GET' ? publicPath(request.url) : null;
  if (path === null) {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Aquí no hay nada');
    return;
  }

  const file = join(root, path);
  try {
    const info = await stat(file);
    if (!info.isFile()) throw new Error('no es un fichero');

    response.writeHead(200, { 'content-type': contentType(path), 'content-length': info.size });
    createReadStream(file).pipe(response);
  } catch {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Aquí no hay nada');
  }
}
