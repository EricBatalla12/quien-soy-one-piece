/**
 * La conexión con el servidor. Es la única capa del cliente que sabe que hay red.
 *
 * Ocupa el sitio que tenía `channel.js` en la v1, que sincronizaba dos pestañas con
 * BroadcastChannel. El resto del cliente sigue sin enterarse: recibe mensajes y
 * manda acciones.
 *
 * Reconecta sola. Es lo que hace que un bache de wifi no te eche de la partida: al
 * volver a abrirse el socket, quien nos usa vuelve a presentar su token y recupera
 * su plaza (criterio 14).
 *
 * El `WebSocket` y el temporizador se pueden sustituir al llamar para poder testear
 * la reconexión sin red y sin esperar de verdad.
 */

/** Primera espera antes de reintentar, y tope al que llega duplicándose. */
export const RETRY_BASE_MS = 500;
export const RETRY_MAX_MS = 8000;

/** El servidor del juego es el mismo que sirvió la página, así que basta con mirarla. */
export function socketUrl({ protocol, host }) {
  return `${protocol === 'https:' ? 'wss:' : 'ws:'}//${host}`;
}

/**
 * Cuánto esperar antes del siguiente intento.
 *
 * Se duplica para no machacar un servidor que está arrancando —los alojamientos
 * gratuitos tardan unos segundos en despertar—, con tope para que volver a estar en
 * línea no dependa de cuánto lleves desconectado.
 */
export function retryDelay(attempt) {
  return Math.min(RETRY_BASE_MS * 2 ** attempt, RETRY_MAX_MS);
}

export function connect({
  url,
  onOpen,
  onMessage,
  onStatus,
  open = (target) => new WebSocket(target),
  schedule = setTimeout,
}) {
  let socket = null;
  let attempts = 0;
  let givenUp = false;

  function start() {
    onStatus(attempts === 0 ? 'connecting' : 'offline');
    socket = open(url);

    socket.addEventListener('open', () => {
      attempts = 0;
      onStatus('online');
      onOpen();
    });

    socket.addEventListener('message', (event) => {
      let message;
      try {
        message = JSON.parse(event.data);
      } catch {
        return; // basura por el cable: se ignora, no se rompe la partida
      }
      if (message !== null && typeof message === 'object') onMessage(message);
    });

    socket.addEventListener('close', () => {
      if (givenUp) return;

      socket = null;
      onStatus('offline');
      schedule(start, retryDelay(attempts++));
    });

    // El 'error' siempre viene seguido de un 'close', que es quien reintenta.
    socket.addEventListener('error', () => {});
  }

  start();

  return {
    send(message) {
      if (socket !== null && socket.readyState === 1) socket.send(JSON.stringify(message));
    },

    close() {
      givenUp = true;
      if (socket !== null) socket.close();
    },
  };
}
