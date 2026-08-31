# ¿Quién soy? — One Piece

Juego web de "¿Quién soy?" para dos jugadores, con temática de One Piece.

Cada jugador elige en secreto, de una lista de personajes de One Piece, el que su
rival deberá adivinar. Por turnos, se hacen preguntas que se responden con **Sí**,
**No** o **A veces**, hasta que alguien se atreve a arriesgar un personaje.

Uno crea una sala, le dicta el código de cinco letras a la otra persona, y a jugar.
Podéis estar en ordenadores distintos. De la sala se sale cuando quieras: se cierra
para los dos y se vuelve a la pantalla de entrada.

## Estado

✅ **v3 terminada.** El personaje se elige de un catálogo cerrado de 783 personajes en
vez de escribirse a mano: se busca, se pulsa, y acertar se decide comparando
identificadores. Se acabó fallar por escribir "Luffy" donde ponía "Monkey D. Luffy".

En la 3.1 se le añadió **salir de la sala**: hasta entonces solo se salía cerrando la
pestaña o esperando a que caducara. Con el rival dentro se pregunta antes, porque
salir le cierra la sala a él también.

✅ **v2 terminada y desplegada.** Dos personas juegan desde ordenadores distintos, con
el secreto guardado de verdad en el servidor.

✅ **v1 terminada** y sustituida por la v2. Se jugaba en dos pestañas del mismo
navegador, sin servidor.

Este repositorio empieza por la especificación, antes que por el código:

- [`docs/ESPEC-V3.md`](docs/ESPEC-V3.md) — lo último construido.
- [`docs/ESPEC-V2.md`](docs/ESPEC-V2.md) — lo anterior, cuyos criterios siguen valiendo.
- [`docs/ESPEC.md`](docs/ESPEC.md) — la v1, como registro.
- [`CLAUDE.md`](CLAUDE.md) — reglas de trabajo dentro del repositorio.

## Desarrollo

Una sola dependencia, `ws`, para los WebSocket del servidor.

```bash
npm install
npm start     # sirve el juego y coordina las partidas en http://localhost:8000
npm test      # todo, sin navegador y sin red de verdad
npm run catalog  # vuelve a generar data/characters.json desde la API (rara vez)
```

Para probarlo solo, abre dos pestañas: `sessionStorage` es propio de cada una, así que
cuentan como dos jugadores distintos.

## Despliegue

El repositorio trae un [`render.yaml`](render.yaml), así que en Render basta con
**New → Blueprint**, elegir este repositorio y confirmar: el plan gratuito, el
comando de arranque y la versión de Node ya vienen puestos. Cada `git push` a `main`
vuelve a desplegar.

En el plan gratuito el servicio se duerme tras 15 minutos sin recibir nada y tarda
cerca de un minuto en despertar, así que la primera visita después de un rato se hace
larga. Una partida en curso lo mantiene despierto, y cuando se duerme las salas ya
habían caducado de todos modos.

**Este juego no funciona en GitHub Pages**, que solo sirve ficheros y no puede
ejecutar el servidor que reparte las partidas.

## Cómo está hecho

El servidor manda. El navegador no aplica reglas: manda acciones y pinta lo que le
contestan.

| Capa | Qué hace |
|---|---|
| `src/game/` | Reglas de la partida, el catálogo de personajes y la vista de cada jugador |
| `src/server/` | Salas, validación de lo que llega, y el servidor HTTP + WebSocket |
| `src/client/` | Conexión, sesión de la pestaña, selector de personaje e interfaz |
| `data/` | El catálogo de personajes y las correcciones a sus nombres |
| `scripts/` | El script que genera el catálogo |

El catálogo es un fichero del repositorio, no una llamada a una API: el juego no sale
a internet mientras se juega, así que si la API se cae, la partida sigue. Volver a
generarlo es `npm run catalog`, y las correcciones a los nombres viven aparte en
[`data/corrections.json`](data/corrections.json) para que regenerarlo no las pierda.

El personaje que te toca adivinar **no sale nunca del servidor** hasta que la partida
termina. A diferencia de la v1, abrir las herramientas de desarrollo no sirve de nada.

Las partidas viven en memoria: si el servidor se reinicia, se pierden. Una sala
abandonada caduca a los quince minutos, y se cierra en el acto si uno de los dos
jugadores se sale.

## Aviso

Proyecto de fan, sin ánimo de lucro y sin relación con los propietarios de One Piece.
No incluye arte ni material con derechos: la estética es original.

Los nombres de los personajes vienen de la API pública de
[api-onepiece.com](https://api-onepiece.com), con algunas correcciones propias.
