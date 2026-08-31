# ¿Quién soy? One Piece

Juego web de "¿Quién soy?" para dos jugadores desde ordenadores distintos, con un
servidor Node por medio.

**La especificación manda.** Léela antes de proponer o escribir nada:

- `docs/ESPEC-V4.md` es lo que se está construyendo ahora: varios animes, elegidos
  al crear la sala.
- `docs/ESPEC-V3.md` y `docs/ESPEC-V2.md` describen lo ya construido y en marcha; sus
  criterios de aceptación siguen teniendo que cumplirse.
- `docs/ESPEC.md` es la v1, sustituida: se conserva como registro, no como guía.

## Reglas de trabajo

- No implementes nada que esté en la sección 4 de la espec ("qué NO entra"). Si crees
  que algo de esa lista hace falta, dilo y espera; no lo añadas por tu cuenta.
- Antes de dar una funcionalidad por terminada, comprueba contra los criterios de
  aceptación (sección 8 de la espec) y di cuáles cumple.
- El servidor es quien manda: las reglas se aplican en `src/server`, y el navegador
  solo manda acciones y pinta la vista que recibe. Nada que un jugador no deba ver
  puede salir de `projectView`.
- Trabajamos por piezas pequeñas, con un commit por pieza. No encadenes varias
  funcionalidades en una sola tanda de cambios.
- Toda capa necesita tests. Si algo parece no testeable porque depende del navegador,
  extrae la parte pura y testea esa (como `projectView`, `hasExpired` o el propio
  `app.js` del cliente). "Lo he
  probado a mano" no cuenta como verificado: los doce fallos de la auditoría estaban
  justo en los dos ficheros que no tenían tests.
- Los renombrados van en su propio commit, sin cambios de comportamiento.

## Convenciones

- Interfaz, documentación y mensajes de commit: **en español**.
- Nombres de variables, funciones y ficheros: **en inglés**.

## Comandos

- `npm test` — ejecuta los tests (`node --test`).
- `npm start` — sirve el juego y coordina las partidas en http://localhost:8000.
  `npm run dev` hace lo mismo.

La única dependencia es `ws`, ya aprobada. Añade solo las imprescindibles y pregunta
antes de cada una.

Abrir el `index.html` directamente con `file://` **no funciona**: el juego lo sirve
el propio servidor, que es también con quien habla por WebSocket.
