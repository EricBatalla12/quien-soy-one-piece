# ¿Quién soy? — One Piece

Juego web de "¿Quién soy?" para dos jugadores, con temática de One Piece.

Cada jugador escribe en secreto el personaje que su rival deberá adivinar. Por turnos,
se hacen preguntas que se responden con **Sí**, **No** o **A veces**, hasta que alguien
se atreve a arriesgar un nombre.

Uno crea una sala, le dicta el código de cinco letras a la otra persona, y a jugar.
Podéis estar en ordenadores distintos.

## Estado

🚧 **v2 en construcción.** El juego funciona de principio a fin contra el servidor;
falta desplegarlo. La [espec de la v2](docs/ESPEC-V2.md) lleva la cuenta de qué entra
y de cuándo se dará por terminada.

✅ **v1 terminada** y sustituida por la v2. Se jugaba en dos pestañas del mismo
navegador, sin servidor; su especificación se conserva en [`docs/ESPEC.md`](docs/ESPEC.md).

Este repositorio empieza por la especificación, antes que por el código:

- [`docs/ESPEC-V2.md`](docs/ESPEC-V2.md) — qué se construye ahora, qué queda fuera y
  cuándo se considera terminado.
- [`docs/ESPEC.md`](docs/ESPEC.md) — la v1, como registro de lo ya construido.
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
