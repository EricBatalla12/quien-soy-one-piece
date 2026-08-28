# ¿Quién soy? One Piece

Juego web de "¿Quién soy?" para dos jugadores en dos pestañas del mismo navegador.

**La especificación manda: `docs/ESPEC.md`.** Léela antes de proponer o escribir nada.

## Reglas de trabajo

- No implementes nada que esté en la sección 4 de la espec ("qué NO entra"). Si crees
  que algo de esa lista hace falta, dilo y espera; no lo añadas por tu cuenta.
- Antes de dar una funcionalidad por terminada, comprueba contra los criterios de
  aceptación (sección 8 de la espec) y di cuáles cumple.
- Trabajamos por piezas pequeñas, con un commit por pieza. No encadenes varias
  funcionalidades en una sola tanda de cambios.
- Toda capa necesita tests. Si algo parece no testeable porque depende del navegador,
  extrae la parte pura y testea esa (como `reconcile` o `choosePlayerId`). "Lo he
  probado a mano" no cuenta como verificado: los doce fallos de la auditoría estaban
  justo en los dos ficheros que no tenían tests.
- Los renombrados van en su propio commit, sin cambios de comportamiento.

## Convenciones

- Interfaz, documentación y mensajes de commit: **en español**.
- Nombres de variables, funciones y ficheros: **en inglés**.

## Comandos

- `npm test` — ejecuta los tests (`node --test`).
- `npm run dev` — sirve el juego en http://localhost:8000 con `python3 -m http.server`.

El v1 no tiene ninguna dependencia y así se queda. El v2 con servidor necesitará al menos una (ws o equivalente): añade solo las imprescindibles y pregunta antes de cada una.

Abrir el `index.html` directamente con `file://` **no funciona**: el origen opaco
rompe `BroadcastChannel`. Hay que servirlo por HTTP.
