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

## Convenciones

- Interfaz, documentación y mensajes de commit: **en español**.
- Nombres de variables, funciones y ficheros: **en inglés**.

## Comandos

- `npm test` — ejecuta los tests de la lógica pura (`node --test`, pueden haber dependecias, por ejemplo ws).
- `npm run dev` — sirve el juego en http://localhost:8000 con `python3 -m http.server`.

El proyecto **no tiene ninguna dependencia** y no queremos que las tenga. Módulos ES
nativos, sin empaquetador. Si crees que hace falta instalar algo, pregunta antes.

Abrir el `index.html` directamente con `file://` **no funciona**: el origen opaco
rompe `BroadcastChannel`. Hay que servirlo por HTTP.
