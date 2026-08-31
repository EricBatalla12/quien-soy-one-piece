# ¿Quién soy?

Juego web de "¿Quién soy?" para dos jugadores.

Se elige con qué mundo jugáis —**One Piece**, **Hunter × Hunter** o **Minecraft**— y
cada jugador elige en secreto, de la lista de ese mundo, lo que su rival deberá
adivinar: un personaje, o un objeto si jugáis a Minecraft. Por turnos, se hacen
preguntas que se responden con **Sí**, **No** o **A veces**, hasta que alguien se
atreve a arriesgar.

Uno crea la sala, le dicta el código de cinco letras a la otra persona, y a jugar.
Podéis estar en ordenadores distintos. El mundo lo elige quien crea la sala y quien
entra con el código juega al mismo. De la sala se sale cuando quieras: se cierra para
los dos y se vuelve a la pantalla de entrada.

## Estado

✅ **v5 terminada.** Entra **Minecraft** con sus **1504 objetos**, y con él se cae una
palabra: lo que se elige ya no es un anime sino un **mundo**, porque Minecraft no lo
es. Cada mundo dice además cómo se llama lo que tiene dentro, así que la interfaz no
le llama personaje a un yunque.

✅ **v4 terminada.** El juego deja de ser solo One Piece. Se elige el mundo antes de
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

- [`docs/ESPEC-V5.md`](docs/ESPEC-V5.md) — lo último construido.
- [`docs/ESPEC-V4.md`](docs/ESPEC-V4.md), [`docs/ESPEC-V3.md`](docs/ESPEC-V3.md) y
  [`docs/ESPEC-V2.md`](docs/ESPEC-V2.md) — lo anterior, cuyos criterios siguen
  valiendo.
- [`docs/ESPEC.md`](docs/ESPEC.md) — la v1, como registro.
- [`CLAUDE.md`](CLAUDE.md) — reglas de trabajo dentro del repositorio.

## Desarrollo

Una sola dependencia, `ws`, para los WebSocket del servidor.

```bash
npm install
npm start     # sirve el juego y coordina las partidas en http://localhost:8000
npm test      # todo, sin navegador y sin red de verdad
npm run catalog    # vuelve a generar data/one-piece.json desde la API (rara vez)
npm run minecraft  # vuelve a generar data/minecraft.json desde el registro del juego
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
| `src/game/` | Reglas, el registro de mundos, los catálogos y la vista de cada jugador |
| `src/server/` | Salas, validación de lo que llega, y el servidor HTTP + WebSocket |
| `src/client/` | Conexión, sesión de la pestaña, selector de personaje e interfaz |
| `data/` | Un catálogo por mundo, y las correcciones a los nombres de One Piece |
| `scripts/` | Los scripts que generan catálogos |

Los catálogos son ficheros del repositorio, no llamadas a una API: el juego no sale a
internet mientras se juega, así que si una fuente se cae, la partida sigue. Cada mundo
tiene la suya:

| Mundo | De dónde salen los nombres |
|---|---|
| One Piece | La API de [api-onepiece.com](https://api-onepiece.com), con [correcciones a mano](data/one-piece-corrections.json) para que regenerarla no las pierda |
| Hunter × Hunter | Escritos a mano, sin script detrás |
| Minecraft | Del registro del propio juego y del fichero de idioma español de Mojang |

Una prueba comprueba que **todos** cumplen las mismas reglas —identificador derivado
del nombre, orden alfabético, sin repetidos y un objeto por línea—, los genere un
script o los haya escrito una persona.

### Añadir un mundo

Tres cosas, y ninguna es código de reglas:

1. **Su lista** en `data/<mundo>.json`, con un `{"id","name"}` por línea. El
   identificador sale del nombre; si te equivocas, `npm test` te lo dice.
2. **Su entrada en el registro**, [`src/game/worlds.js`](src/game/worlds.js): nombre,
   una línea que lo presente, **cómo se llama lo que tiene dentro** (`personaje`,
   `objeto`…) y su emblema en SVG, dibujado con las clases del tema (`bone`, `ink`,
   `accent`, `hot`) y sin colores propios.
3. **Su bloque de colores** en [`styles/main.css`](styles/main.css), colgando de
   `[data-world='<mundo>']`.

Ni las salas, ni las reglas, ni los mensajes que van por el cable cambian.

El personaje que te toca adivinar **no sale nunca del servidor** hasta que la partida
termina. A diferencia de la v1, abrir las herramientas de desarrollo no sirve de nada.

Las partidas viven en memoria: si el servidor se reinicia, se pierden. Una sala
abandonada caduca a los quince minutos, y se cierra en el acto si uno de los dos
jugadores se sale.

## Aviso

Proyecto de fan, sin ánimo de lucro y sin relación con los propietarios de One Piece,
de Hunter × Hunter ni de Minecraft. No incluye arte ni material con derechos: la
estética es original, emblemas incluidos.

De los nombres, solo son nombres: los de One Piece vienen de la API pública de
[api-onepiece.com](https://api-onepiece.com) con algunas correcciones propias, los de
Hunter × Hunter están escritos a mano, y los de Minecraft salen del registro del juego
y del fichero de idioma español de Mojang.
