# Especificación — ¿Quién soy? One Piece (v2)

**Versión:** 2.0 (v2)
**Fecha:** 2026-08-28
**Autor:** Eric Batalla
**Sustituye a:** `docs/ESPEC.md` (v1), que queda como registro de lo ya construido.

---

## 1. Qué cambia respecto a la v1

La v1 se juega en dos pestañas del mismo navegador, sincronizadas con
`BroadcastChannel`. La v2 mete un servidor por medio para que **dos personas jueguen
desde ordenadores distintos**, y de paso arregla la limitación que la v1 asumía a
sabiendas: **el secreto pasa a ser secreto de verdad**.

| | v1 | v2 |
|---|---|---|
| Dónde están los jugadores | Dos pestañas, un navegador | Dos ordenadores cualesquiera |
| Quién sincroniza | `BroadcastChannel` entre pestañas | Un servidor por WebSocket |
| Quién aplica las reglas | Cada pestaña, sobre una copia completa | Solo el servidor |
| El secreto | De honor: con F12 se ve | El servidor nunca te envía el tuyo |
| Cómo se emparejan | Abrir dos pestañas | Código de sala que uno dicta al otro |
| Quién es cada jugador | `playerId` en `sessionStorage` | Token de sala en `sessionStorage` |

**La v2 sustituye a la v1.** No hay modo local: si dos personas quieren jugar en el
mismo ordenador, abren dos pestañas y entran a la misma sala como cualquiera. Se
elimina `src/sync/channel.js` y con él `BroadcastChannel`; mantener dos capas de
sincronización y dos formas del estado no compensa.

## 2. Cómo se juega (partida completa)

1. **Entrada.** Cada jugador escribe su nombre y elige entre *crear sala* o *entrar
   con un código*.
2. **Sala.** Quien crea recibe un código de 5 letras (p. ej. `GOMUX`) y espera. Se lo
   dicta al rival por el medio que quiera; el juego no manda nada por su cuenta.
   Cuando el segundo jugador entra con ese código, empieza la preparación.
3. **Preparación.** Cada jugador escribe en secreto el personaje que el rival deberá
   adivinar. Hasta que los dos no lo han escrito, la partida no empieza.
4. **Turnos alternos.** El jugador al que le toca elige entre dos acciones:
   - **Preguntar:** escribe una pregunta, que le aparece al rival.
   - **Arriesgar:** escribe el nombre del personaje que cree que le han asignado.
5. **Respuesta.** Si ha preguntado, el rival responde pulsando uno de tres botones:
   **Sí**, **No** o **A veces**. La pregunta y su respuesta quedan en un historial
   visible para ambos.
6. **Final.** Si un jugador arriesga y acierta, gana, la partida termina y **se
   revelan los dos personajes**. Si falla, pierde el turno y la partida continúa.
7. **Revancha.** Al terminar, cualquiera de los dos puede pedir revancha: se vuelve a
   la preparación **en la misma sala, con el mismo código**, y el marcador de
   partidas ganadas se conserva mientras la sala viva.

Las reglas del juego en sí (turnos, respuestas, acierto tolerante a mayúsculas y
acentos) son **exactamente las de la v1**. Lo que cambia es dónde se aplican.

## 3. Alcance v2 — qué SÍ entra

- Servidor Node que sirve el juego y coordina las partidas.
- Pantalla de entrada: nombre del jugador, crear sala o entrar con código.
- Sala identificada por código de 5 letras, con dos plazas.
- Partida completa contra el rival: preparación, preguntas, respuestas, arriesgar,
  victoria y revancha.
- **Nombre del rival visible en la interfaz**: "Le toca a Eric", no "Le toca al
  jugador 2".
- **Secreto real**: el servidor no envía a un jugador el personaje que debe adivinar.
- **Aviso en vivo de desconexión del rival**: "Nami se ha desconectado, esperando a
  que vuelva".
- Reconexión: recargar la pestaña recupera tu sitio y la partida.
- Expiración explícita de salas inactivas o abandonadas.
- Marcador de partidas ganadas dentro de la sala.
- Diseño temático de One Piece: se reaprovecha el de la v1.

## 4. Alcance v2 — qué NO entra

Esta lista es tan importante como la anterior. Nada de esto se implementa en v2; todo
queda propuesto **para una v3**:

- Catálogo de personajes con validación o avatares. El personaje se sigue escribiendo
  como texto libre.
- Cuentas de usuario, registro o login. El nombre es solo una etiqueta: no se
  comprueba, no se reserva y no persiste entre salas.
- Base de datos. Las partidas viven en la memoria del servidor.
- Más de dos jugadores por sala, y espectadores.
- Chat libre fuera del sistema de preguntas.
- Ranking o estadísticas más allá del marcador de la sala en curso; nada persiste
  cuando la sala desaparece.
- Emparejamiento automático o lista pública de salas.
- Indicador de "está escribiendo".
- Sonido y música.
- Modo contra la máquina.
- Traducciones (solo español).
- Imágenes o arte oficial de One Piece. La estética se consigue con colores,
  tipografía y formas propias.

## 5. Datos que maneja

### 5.1 En el servidor (la única copia que manda)

Todo en memoria, indexado por código de sala:

| Dato | Descripción |
|---|---|
| Código de sala | 5 letras mayúsculas, alfabeto sin caracteres confundibles |
| Jugadores | Por plaza (1 y 2): nombre, token de sesión, si está conectado |
| Personaje secreto de cada jugador | Texto libre, lo escribió el rival |
| Turno actual | Qué jugador tiene la acción |
| Fase de la partida | espera de rival / preparación / jugando / terminada |
| Pregunta pendiente | Mientras espera respuesta |
| Historial | Lista de preguntas con su respuesta y quién la hizo, y los intentos fallidos |
| Ganador | Solo cuando la partida ha terminado |
| Marcador | Partidas ganadas por cada jugador en esta sala |
| Última actividad | Para expirar la sala |

### 5.2 En el navegador

| Dato | Dónde | Por qué |
|---|---|---|
| Token de sala | `sessionStorage`, por código de sala | Recuperar tu sitio al recargar. Es por pestaña, así que dos pestañas del mismo navegador son dos jugadores distintos, igual que en la v1 |
| Vista de la partida | Memoria | Lo último que envió el servidor; se pinta y ya |

### 5.3 La vista: qué recibe cada jugador

Aquí está el cambio de fondo. En la v1 las dos pestañas tenían el estado entero. En
la v2 el servidor **proyecta** el estado a una vista por jugador y envía solo eso:

| Se envía | No se envía |
|---|---|
| Tu número de jugador y tu nombre | **El personaje que tú debes adivinar** |
| El nombre del rival y si está conectado | El token del rival |
| El personaje que TÚ escribiste para el rival | |
| Si el rival ya ha escrito el suyo (sí/no) | |
| Fase, turno, pregunta pendiente, historial, ganador, marcador | |

Al terminar la partida sí se revelan los dos personajes: ya no hay nada que proteger.

El cliente **no simula reglas ni predice el resultado**: envía acciones y pinta la
vista que le devuelven. Así no puede haber dos versiones del estado en desacuerdo.

## 6. Tecnología

- **Servidor:** Node, sin herramienta de construcción, con **una única dependencia de
  producción: `ws`**. Es la primera dependencia del proyecto y está aprobada
  explícitamente; cualquier otra se pregunta antes (regla del `CLAUDE.md`).
- **El mismo servidor sirve el HTML, el CSS y el JS.** Un solo origen: sin CORS, sin
  configurar dos despliegues y sin el problema de `file://` que tenía la v1.
- **Despliegue:** Node en un PaaS gratuito (Render, Fly, Railway o equivalente).
  Puerto por variable de entorno `PORT`, con valor por defecto para desarrollo.
- **Cliente:** el mismo HTML/CSS/JS sin dependencias de la v1. Cambia la capa de
  sincronización y la interfaz gana pantallas de entrada y sala.
- **Tests:** `node --test`, como hasta ahora. Todo lo que sea decisión (proyectar la
  vista, elegir código de sala, validar una acción entrante, aplicar las reglas,
  decidir si una sala ha expirado) se escribe como función pura y se testea sin red
  ni navegador. La regla de la v1 se mantiene entera: **"lo he probado a mano" no
  cuenta como verificado.**

### 6.1 El protocolo

Un único WebSocket por pestaña. Mensajes en JSON, todos con un campo `type`.

**Del cliente al servidor** (acciones; el servidor las valida todas, siempre):

| Mensaje | Contenido | Qué provoca |
|---|---|---|
| `create` | nombre | Crea una sala y te sienta en la plaza 1 |
| `join` | código, nombre | Te sienta en la plaza libre de esa sala |
| `resume` | código, token | Recupera tu plaza tras recargar o caerte |
| `secret` | personaje | Fija el personaje que el rival deberá adivinar |
| `ask` | texto | Hace la pregunta de tu turno |
| `answer` | sí / no / a veces | Responde a la pregunta pendiente |
| `guess` | nombre | Arriesga el personaje |
| `rematch` | nada | Pide revancha con la partida terminada |

**Del servidor al cliente:**

| Mensaje | Contenido | Cuándo |
|---|---|---|
| `seated` | código, tu número, token | Al crear, entrar o recuperar plaza |
| `view` | la vista de la sección 5.3 | Cada vez que cambia algo en la sala |
| `error` | motivo legible | Acción inválida: sala llena, código que no existe, no es tu turno… |
| `expired` | motivo | La sala ha caducado; la partida ha terminado |

Cada cambio provoca el envío de la **vista entera** a los dos jugadores, no de un
trozo. Es lo que ya hacía la v1 con `state` y evita toda una familia de errores de
sincronización a cambio de unos bytes de más.

### 6.2 Reconexión y expiración

- Al sentarte, el servidor te da un **token** que la pestaña guarda en
  `sessionStorage` junto al código de sala. Al recargar, la pestaña envía `resume` y
  recupera su plaza y la partida.
- Si un jugador se cae, su plaza **le sigue perteneciendo**: el rival ve el aviso de
  desconexión y la partida se queda como estaba, esperando.
- Una sala se destruye cuando pasan **15 minutos sin actividad**, tanto si está
  esperando rival como si está a medias con alguien desconectado. A quien siga
  conectado se le avisa con `expired`.
- Nadie más puede ocupar la plaza de un jugador desconectado mientras la sala viva.
  Un tercero que entre con el código recibe un `error`: la sala está llena.

## 7. Limitaciones conocidas y aceptadas

- **Las partidas viven en memoria.** Si el servidor se reinicia o el PaaS lo duerme,
  las salas abiertas se pierden. Se asume: una base de datos para un juego de dos
  personas que dura diez minutos no compensa.
- **Los PaaS gratuitos duermen.** La primera conexión tras un rato de inactividad
  puede tardar unos segundos en despertar el servidor. La interfaz debe decir que
  está conectando en lugar de parecer rota.
- **El token está en `sessionStorage`.** Recargar funciona; cerrar la pestaña y
  volver a abrirla, no: se pierde el token y con él la plaza, que quedará ocupada
  hasta que la sala expire. Es el mismo compromiso que la v1 hacía con `playerId`, y
  a cambio dos pestañas del mismo navegador siguen siendo dos jugadores distintos.
- **El código de sala es la única llave.** Quien lo tenga y llegue antes que tu rival
  ocupa la plaza. No hay contraseña de sala: con códigos de 5 letras y salas que
  duran minutos, acertar uno por casualidad es irrelevante.
- **El nombre no se comprueba.** Dos jugadores pueden llamarse igual y nadie lo
  impide; es una etiqueta, no una identidad.
- **El secreto está protegido del rival, no del servidor.** El servidor lo conoce
  necesariamente, porque es quien decide si un intento acierta.
- El personaje se escribe libre: "Luffy" y "Monkey D. Luffy" son textos distintos y
  la comparación al arriesgar sigue siendo tolerante, ahora en el servidor.

## 8. Criterios de aceptación

La v2 está terminada cuando todo esto se cumple:

1. Dos personas en ordenadores distintos juegan una partida completa de principio a
   fin, sin compartir nada más que el código de sala.
2. El segundo jugador entra tecleando el código; con un código que no existe, o con
   la sala llena, recibe un mensaje claro y no entra.
3. La partida no empieza hasta que los dos jugadores han escrito su personaje.
4. Un jugador no puede actuar cuando no es su turno, **ni siquiera enviando la acción
   a mano por el WebSocket**: el servidor la rechaza.
5. Ningún mensaje que llega al cliente contiene el personaje que ese jugador debe
   adivinar. Se comprueba mirando el tráfico, no confiando en la interfaz.
6. La pregunta enviada aparece en la pantalla del rival sin recargar.
7. El historial muestra las mismas preguntas y respuestas a los dos jugadores.
8. Arriesgar el nombre correcto termina la partida, anuncia al ganador, revela los
   dos personajes y suma una al marcador.
9. Arriesgar mal cede el turno y la partida sigue.
10. Al arriesgar no distinguen mayúsculas, acentos ni espacios sobrantes.
11. No se puede enviar una pregunta, un personaje ni un nombre vacíos.
12. La interfaz muestra el nombre del rival donde antes decía "jugador 2".
13. Al caerse el rival aparece el aviso de desconexión, y desaparece cuando vuelve.
14. Recargar la pestaña a mitad de partida recupera la partida y la plaza.
15. Una sala sin actividad durante 15 minutos caduca y se avisa a quien siga conectado.
16. La revancha reinicia la partida en la misma sala y conserva el marcador.
17. La interfaz se ve correctamente en una ventana de escritorio y no se rompe en
    pantalla de móvil.

## 9. Plan de trabajo

Por piezas pequeñas, un commit por pieza, cada una con sus tests (regla del
`CLAUDE.md`). Orden propuesto:

1. Mover las reglas de la v1 al servidor, intactas, y añadir la **proyección de la
   vista** por jugador. Todo puro, todo testeable sin red.
2. Salas: crear, entrar, código, plazas, tokens. Puro también: la lógica de sala no
   necesita saber qué es un WebSocket.
3. El servidor: HTTP para los estáticos, WebSocket para las acciones, traduciendo
   mensajes a llamadas a las capas anteriores.
4. Cliente: sustituir `channel.js` por la conexión al servidor y pintar la vista.
5. Pantallas de entrada y sala.
6. Desconexión, reconexión y expiración.
7. Revancha y marcador.
8. Despliegue.
