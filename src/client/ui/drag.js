/**
 * Arrastrar pistas con el puntero.
 *
 * Se usan eventos de puntero y no la API de arrastrar y soltar de HTML porque
 * aquella no existe en una pantalla táctil: con ella, el tablero solo se podría
 * ordenar con ratón. Aquí valen el ratón, el dedo y el lápiz por igual, y para
 * quien no pueda arrastrar están los botones de cada pista.
 *
 * Este fichero solo mueve elementos por la pantalla. Dónde cae al final lo decide
 * `dropIndex`, que es una función pura y está testeada aparte.
 *
 * Todo se engancha al contenedor y no a cada pista, porque la interfaz se repinta
 * entera con cada mensaje del servidor y los enganches se perderían.
 */

import { dropIndex } from '../clues.js';

/** Cuánto hay que mover el dedo para que sea arrastrar y no un toque. */
export const DRAG_THRESHOLD_PX = 6;

/** Margen de gracia alrededor del tablero: soltar justo al borde también cuenta. */
const DROP_MARGIN_PX = 24;

export function trackDragging({ root, boardId, onDrop, onDraggingChange }) {
  let drag = null;

  root.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    const handle = event.target.closest('[data-drag]');
    if (handle === null) return;
    if (event.target.closest('button') !== null) return; // los botones siguen siendo botones

    drag = {
      handle,
      index: Number(handle.dataset.drag),
      from: handle.dataset.from,
      startX: event.clientX,
      startY: event.clientY,
      pointerId: event.pointerId,
      moving: false,
      ghost: null,
      slot: null,
      to: null,
    };
  });

  root.addEventListener('pointermove', (event) => {
    if (drag === null || event.pointerId !== drag.pointerId) return;

    if (!drag.moving) {
      const travelled = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
      if (travelled < DRAG_THRESHOLD_PX) return;
      begin(event);
    }

    follow(event);
    event.preventDefault(); // que arrastrar no desplace la página por debajo
  });

  root.addEventListener('pointerup', finish);
  root.addEventListener('pointercancel', cancel);

  function begin(event) {
    drag.moving = true;

    // La captura mantiene los eventos en este elemento aunque el puntero se salga.
    // Si el navegador la rechaza no pasa nada: los eventos siguen llegando al
    // contenedor, que es donde se escuchan.
    try {
      drag.handle.setPointerCapture(event.pointerId);
    } catch {
      // sin captura, pero se puede arrastrar igual
    }
    drag.handle.classList.add('dragging');

    drag.ghost = drag.handle.cloneNode(true);
    drag.ghost.classList.add('drag-ghost');
    drag.ghost.classList.remove('dragging');
    for (const button of drag.ghost.querySelectorAll('button')) button.remove();
    drag.ghost.style.width = `${drag.handle.getBoundingClientRect().width}px`;
    document.body.append(drag.ghost);

    drag.slot = document.createElement('li');
    drag.slot.className = 'clue-slot';

    onDraggingChange(true);
  }

  function follow(event) {
    drag.ghost.style.transform = `translate(${event.clientX}px, ${event.clientY}px)`;

    const board = root.querySelector(`#${boardId}`);
    if (board === null) return;

    const point = { x: event.clientX, y: event.clientY };
    if (!isOver(board, point)) {
      drag.slot.remove();
      drag.to = null;
      board.classList.remove('receiving');
      return;
    }

    // Ni el hueco ni la propia pista que se arrastra cuentan para decidir dónde cae.
    const others = [...board.children].filter((el) => el !== drag.slot && el !== drag.handle);
    drag.to = dropIndex(
      others.map((el) => el.getBoundingClientRect()),
      point,
    );

    board.classList.add('receiving');
    board.insertBefore(drag.slot, others[drag.to] ?? null);
  }

  function finish() {
    if (drag === null) return;

    const dropped = drag.moving && drag.to !== null ? { ...drag } : null;
    cleanUp();
    if (dropped !== null) onDrop({ from: dropped.from, index: dropped.index, to: dropped.to });
  }

  function cancel() {
    cleanUp();
  }

  function cleanUp() {
    if (drag === null) return;

    const wasMoving = drag.moving;
    drag.ghost?.remove();
    drag.slot?.remove();
    drag.handle.classList.remove('dragging');
    root.querySelector(`#${boardId}`)?.classList.remove('receiving');
    drag = null;

    if (wasMoving) onDraggingChange(false);
  }
}

/** ¿Está el puntero encima del tablero, con su margen de gracia? */
function isOver(board, point) {
  const rect = board.getBoundingClientRect();

  return (
    point.x >= rect.left - DROP_MARGIN_PX &&
    point.x <= rect.right + DROP_MARGIN_PX &&
    point.y >= rect.top - DROP_MARGIN_PX &&
    point.y <= rect.bottom + DROP_MARGIN_PX
  );
}
