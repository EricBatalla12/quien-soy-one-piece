# ¿Quién soy? — One Piece

Juego web de "¿Quién soy?" para dos jugadores, con temática de One Piece.

Cada jugador escribe en secreto el personaje que su rival deberá adivinar. Por turnos,
se hacen preguntas que se responden con **Sí**, **No** o **A veces**, hasta que alguien
se atreve a arriesgar un nombre.

Uno crea una sala, le dicta el código de cinco letras a la otra persona, y a jugar.
Podéis estar en ordenadores distintos.

## Estado

✅ **v2 terminada y desplegada.** Dos personas juegan desde ordenadores distintos, con
el secreto guardado de verdad en el servidor.

🚧 **v3 en especificación.** El personaje pasará a elegirse de un catálogo cerrado en
vez de escribirse a mano.

✅ **v1 terminada** y sustituida por la v2. Se jugaba en dos pestañas del mismo
navegador, sin servidor.

Este repositorio empieza por la especificación, antes que por el código:

- [`docs/ESPEC-V3.md`](docs/ESPEC-V3.md) — lo que se va a construir.
- [`docs/ESPEC-V2.md`](docs/ESPEC-V2.md) — lo que está en marcha.
- [`docs/ESPEC.md`](docs/ESPEC.md) — la v1, como registro.
- [`CLAUDE.md`](CLAUDE.md) — reglas de trabajo dentro del repositorio.

## Desarrollo

Una sola dependencia, `ws`, para los WebSocket del servidor.

```bash
npm install
npm start     # sirve el juego y coordina las partidas en http://localhost:8000
npm test      # todo, sin navegador y sin red de verdad
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
| `src/game/` | Reglas de la partida y la vista que se le proyecta a cada jugador |
| `src/server/` | Salas, validación de lo que llega, y el servidor HTTP + WebSocket |
| `src/client/` | Conexión, sesión de la pestaña e interfaz |

El personaje que te toca adivinar **no sale nunca del servidor** hasta que la partida
termina. A diferencia de la v1, abrir las herramientas de desarrollo no sirve de nada.

Las partidas viven en memoria: si el servidor se reinicia, se pierden. Una sala
abandonada caduca a los quince minutos.

## Aviso

Proyecto de fan, sin ánimo de lucro y sin relación con los propietarios de One Piece.
No incluye arte ni material con derechos: la estética es original.
