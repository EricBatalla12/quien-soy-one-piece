/**
 * Qué hace el cliente con lo que le llega. Capa pura: ni DOM, ni red, ni almacén.
 *
 * En la v1 esto vivía suelto dentro de `main.js` y era, junto al canal, uno de los
 * dos ficheros sin tests donde acabaron apareciendo todos los fallos de la
 * auditoría. Los casos raros de la v2 —perder la conexión, volver a una sala que ya
 * no existe, que caduque mientras juegas— viven aquí para poder testearlos.
 *
 * `receive` devuelve, además del modelo nuevo, qué hacer con la sesión guardada, en
 * vez de tocarla: 'keep' la deja, 'forget' la borra y un objeto la sustituye. Así
 * esta capa decide y `main.js` solo obedece.
 */

/** Lo que se le enseña al jugador cuando su sala ya no está. */
const LOST_ROOM =
  'Tu partida ya no está: la sala ha caducado o el servidor se ha reiniciado. Empieza otra.';

export function initialModel() {
  return { view: null, status: 'connecting', error: null, resuming: false };
}

export function withStatus(model, status) {
  return { ...model, status };
}

/**
 * El socket acaba de abrirse. Si teníamos una plaza guardada, se presenta el token;
 * si no, a la pantalla de entrada. Devuelve también el mensaje que hay que mandar,
 * para que quien llama no tenga que saber cómo se pide una plaza.
 */
export function reconnected(model, session) {
  if (session === null) return { model: { ...model, resuming: false }, send: null };

  return {
    model: { ...model, resuming: true },
    send: { type: 'resume', code: session.code, token: session.token },
  };
}

export function receive(model, message) {
  switch (message.type) {
    case 'seated':
      return {
        model: { ...model, resuming: false, error: null },
        // El token solo llega al crear o al entrar; al recuperar la plaza ya lo tenemos.
        session:
          typeof message.token === 'string'
            ? { code: message.code, token: message.token }
            : 'keep',
      };

    case 'view':
      return { model: { ...model, view: message.view, error: null }, session: 'keep' };

    case 'error':
      // Un error justo al presentar el token significa que esa sala ya no nos espera,
      // y el motivo del servidor ("no existe ese código") confundiría: nadie ha
      // tecleado ningún código.
      if (model.resuming) {
        return {
          model: { ...model, view: null, resuming: false, error: LOST_ROOM },
          session: 'forget',
        };
      }

      return { model: { ...model, error: message.message }, session: 'keep' };

    case 'expired':
      return { model: { ...model, view: null, error: message.message }, session: 'forget' };

    // Te has salido tú: a la pantalla de entrada, y sin ningún aviso que leer. Que la
    // sala ya no está lo sabes de sobra, porque acabas de cerrarla.
    case 'left':
      return { model: { ...model, view: null, error: null }, session: 'forget' };

    default:
      return { model, session: 'keep' };
  }
}

/**
 * ¿Hay que preguntar antes de salir de la sala?
 *
 * Esperando solo en una sala recién creada, salir no le rompe la partida a nadie y
 * un clic basta. Con el rival ya sentado, salir cierra la sala también para él, así
 * que un roce sin querer no puede llevárselo por delante.
 */
export function confirmsLeaving(view) {
  return view !== null && view.rival !== null;
}

/**
 * De qué anime se viste la pantalla, y de cuál hay que pedir el catálogo.
 *
 * Dentro de una sala manda el de la sala, que ya no se elige: quien entró con el
 * código no lo eligió y quien la creó ya no puede cambiarlo. Fuera, el que lleves
 * señalado en la pantalla de entrada, para verlo antes de crear nada.
 */
export function dressedAnime(view, chosen) {
  return view === null ? chosen : view.anime.id;
}

/** Se acaba de mandar una acción: se limpia el error anterior. */
export function sending(model) {
  return { ...model, error: null };
}
