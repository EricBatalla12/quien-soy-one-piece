# ¿Quién soy?

Juego web de "¿Quién soy?" para dos jugadores, con personajes de anime.

Se elige con qué anime jugáis —**One Piece** o **Hunter × Hunter**— y cada jugador
elige en secreto, de la lista de ese anime, el personaje que su rival deberá adivinar.
Por turnos, se hacen preguntas que se responden con **Sí**, **No** o **A veces**,
hasta que alguien se atreve a arriesgar un personaje.

Uno crea la sala, le dicta el código de cinco letras a la otra persona, y a jugar.
Podéis estar en ordenadores distintos. El anime lo elige quien crea la sala y quien
entra con el código juega al mismo. De la sala se sale cuando quieras: se cierra para
los dos y se vuelve a la pantalla de entrada.

## Estado

✅ **v4 terminada.** El juego deja de ser solo One Piece. Se elige el anime antes de
crear la sala, entra **Hunter × Hunter** con 120 personajes escritos a mano, y cada
uno tiene su emblema y sus colores. Añadir un tercero es añadir datos: su lista de
personajes, su entrada en el registro y su bloque de colores.

✅ **v3 terminada.** El personaje se elige de un catálogo cerrado de 778 personajes en
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

- [`docs/ESPEC-V4.md`](docs/ESPEC-V4.md) — lo último construido.
- [`docs/ESPEC-V3.md`](docs/ESPEC-V3.md) y [`docs/ESPEC-V2.md`](docs/ESPEC-V2.md) — lo
  anterior, cuyos criterios siguen valiendo.
- [`docs/ESPEC.md`](docs/ESPEC.md) — la v1, como registro.
- [`CLAUDE.md`](CLAUDE.md) — reglas de trabajo dentro del repositorio.

## Desarrollo

Una sola dependencia, `ws`, para los WebSocket del servidor.

```bash
npm install
npm start     # sirve el juego y coordina las partidas en http://localhost:8000
npm test      # todo, sin navegador y sin red de verdad
npm run catalog  # vuelve a generar data/one-piece.json desde la API (rara vez)
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
| `src/game/` | Reglas, el registro de animes, los catálogos y la vista de cada jugador |
| `src/server/` | Salas, validación de lo que llega, y el servidor HTTP + WebSocket |
| `src/client/` | Conexión, sesión de la pestaña, selector de personaje e interfaz |
| `data/` | Un catálogo de personajes por anime, y las correcciones a sus nombres |
| `scripts/` | El script que genera el catálogo de One Piece |

Los catálogos son ficheros del repositorio, no llamadas a una API: el juego no sale a
internet mientras se juega, así que si la API se cae, la partida sigue. El de One
Piece se regenera con `npm run catalog`, y las correcciones a los nombres viven aparte
en [`data/one-piece-corrections.json`](data/one-piece-corrections.json) para que
regenerarlo no las pierda. El de Hunter × Hunter está escrito a mano y no tiene script
detrás; una prueba comprueba que cumple las mismas reglas que el otro.

### Añadir un anime

Tres cosas, y ninguna es código de reglas:

1. **Su lista de personajes** en `data/<anime>.json`, con un `{"id","name"}` por línea.
   El identificador sale del nombre; si te equivocas, `npm test` te lo dice.
2. **Su entrada en el registro**, [`src/game/animes.js`](src/game/animes.js): nombre,
   una línea que lo presente y su emblema en SVG, dibujado con las clases del tema
   (`bone`, `ink`, `accent`, `hot`) y sin colores propios.
3. **Su bloque de colores** en [`styles/main.css`](styles/main.css), colgando de
   `[data-anime='<anime>']`.

Ni las salas, ni las reglas, ni los mensajes que van por el cable cambian.

El personaje que te toca adivinar **no sale nunca del servidor** hasta que la partida
termina. A diferencia de la v1, abrir las herramientas de desarrollo no sirve de nada.

Las partidas viven en memoria: si el servidor se reinicia, se pierden. Una sala
abandonada caduca a los quince minutos, y se cierra en el acto si uno de los dos
jugadores se sale.

## Aviso

Proyecto de fan, sin ánimo de lucro y sin relación con los propietarios de One Piece
ni de Hunter × Hunter. No incluye arte ni material con derechos: la estética es
original, emblemas incluidos.

Los nombres de los personajes de One Piece vienen de la API pública de
[api-onepiece.com](https://api-onepiece.com), con algunas correcciones propias. Los de
Hunter × Hunter están escritos a mano.
