# ¿Quién soy? — One Piece

Juego web de "¿Quién soy?" para dos jugadores, con temática de One Piece.

Cada jugador escribe en secreto el personaje que su rival deberá adivinar. Por turnos,
se hacen preguntas que se responden con **Sí**, **No** o **A veces**, hasta que alguien
se atreve a arriesgar un nombre.

**▶ Jugar: https://ericbatalla12.github.io/quien-soy-one-piece/**

Ábrelo en **dos pestañas** del mismo navegador, una por jugador.

## Estado

✅ **v1 terminada.** Cumple los diez criterios de aceptación de la especificación.

Este repositorio empieza por la especificación, antes que por el código:

- [`docs/ESPEC.md`](docs/ESPEC.md) — qué se construye, qué queda fuera y cuándo se
  considera terminado.
- [`CLAUDE.md`](CLAUDE.md) — reglas de trabajo dentro del repositorio.

## Desarrollo

No tiene ninguna dependencia. Hace falta Node solo para ejecutar los tests.

```bash
npm test      # reglas del juego
npm run dev   # sirve el juego en http://localhost:8000
```

Abrir el `index.html` con `file://` **no funciona**: el origen opaco de los ficheros
locales impide que las pestañas se comuniquen. Hay que servirlo por HTTP.

## Cómo se juega

Dos jugadores comparten un ordenador y abren el juego en **dos pestañas** del mismo
navegador, que se sincronizan entre sí. No hay servidor: nada sale del navegador.

Al vivir todo en el cliente, el secreto es "de honor" — quien abra las herramientas de
desarrollo puede ver el personaje del rival. Es una limitación asumida y está explicada
en la especificación.

## Aviso

Proyecto de fan, sin ánimo de lucro y sin relación con los propietarios de One Piece.
No incluye arte ni material con derechos: la estética es original.
