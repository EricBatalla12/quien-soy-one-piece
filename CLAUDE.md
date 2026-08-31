# ¿Quién soy?

Juego web de "¿Quién soy?" para dos jugadores desde ordenadores distintos, con un
servidor Node por medio. Se juega con lo que haya dentro de un mundo, que elige quien
crea la sala: hoy One Piece, Hunter × Hunter y Minecraft.

**La especificación manda.** Léela antes de proponer o escribir nada:

- `docs/ESPEC-V5.md` es lo que se está construyendo ahora: Minecraft, y el anime que
  pasa a ser un mundo.
- `docs/ESPEC-V4.md`, `docs/ESPEC-V3.md` y `docs/ESPEC-V2.md` describen lo anterior,
  también en marcha; sus criterios de aceptación siguen teniendo que cumplirse.
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
- `npm run catalog` — vuelve a generar `data/one-piece.json` desde la API. Los mundos
  que no tienen script se escriben a mano; el README cuenta cómo añadir uno.

La única dependencia es `ws`, ya aprobada. Añade solo las imprescindibles y pregunta
antes de cada una.

Abrir el `index.html` directamente con `file://` **no funciona**: el juego lo sirve
el propio servidor, que es también con quien habla por WebSocket.
