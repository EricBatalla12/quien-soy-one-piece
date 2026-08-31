# Especificación — ¿Quién soy? (v4)

**Versión:** 4.0 (v4)
**Fecha:** 2026-08-31
**Autor:** Eric Batalla
**Sustituye a:** `docs/ESPEC-V3.md`, que se conserva como registro de lo construido.

**El juego deja de llamarse "¿Quién soy? One Piece".** Se llama "¿Quién soy?" y One
Piece pasa a ser uno de los animes con los que se puede jugar. El segundo es
**Hunter × Hunter**, y lo construido hasta ahora es el molde del que salgan los
demás.

---

## 1. Qué cambia respecto a la v3

Hasta ahora había un catálogo, y era el catálogo. Estaba en un fichero llamado
`data/characters.json`, el servidor cargaba ese, el navegador descargaba ese, y la
sala no necesitaba apuntar de qué anime era su partida porque no había otra
posibilidad. La estética iba a juego: un mar de fondo, un pergamino encima y una
calavera con sombrero de paja incrustada en el código que pinta la cabecera.

En la v4 hay **varios animes**, y el anime se elige al crear la sala.

| | v3 | v4 |
|---|---|---|
| Cuántos catálogos hay | Uno | Uno por anime |
| De qué anime es la partida | De One Piece, siempre | Del que eligió quien creó la sala |
| Cuándo se elige | Nunca: no había nada que elegir | Al crear la sala, en la pantalla de entrada |
| Qué elige quien entra con el código | Nada | Nada: hereda el anime de la sala |
| Qué catálogo descarga el navegador | El único que hay, al arrancar | El del anime de tu sala, al entrar en ella |
| De dónde sale la estética | Fija, One Piece | Del anime: emblema y colores |
| Añadir un anime nuevo | No estaba previsto | Un fichero de personajes, una entrada en el registro y un bloque de color |

Lo demás sigue igual y sigue teniendo que cumplirse: salas con código, secreto real,
reconexión, expiración, revancha con marcador, historial, tablero de pistas, selector
con buscador y salir de la sala.

## 2. Cómo se juega (lo que cambia)

1. **Elegir anime.** En la pantalla de entrada, antes de crear la sala, se elige el
   anime. La pantalla se viste con su emblema y sus colores en cuanto se pulsa, así
   que se ve con cuál se va a jugar antes de crear nada.
2. **Crear sala.** Como siempre, con el nombre y el botón. La sala queda atada al
   anime elegido para toda su vida, revanchas incluidas.
3. **Entrar con el código.** Quien entra **no elige**: teclea el código y se encuentra
   dentro, con el anime que eligió el otro. Lo ve en la cabecera nada más entrar.
4. **A partir de ahí, todo igual.** Se elige el personaje del rival buscándolo en el
   catálogo de ese anime, se pregunta, se responde y se arriesga como en la v3.

## 3. Alcance v4 — qué SÍ entra

- **Dos animes: One Piece y Hunter × Hunter.** El primero conserva su catálogo tal y
  como está; el segundo entra con una lista escrita a mano.
- **Un registro de animes**, que es la lista de los que hay: identificador, nombre,
  emblema y de dónde sale su catálogo. Es la única lista, y la usan el servidor, el
  navegador y las pruebas.
- **Un catálogo por anime**, cada uno en su fichero del repositorio.
- **El anime se elige al crear la sala** y quien entra con el código lo hereda. La
  sala guarda cuál es y el servidor valida los personajes contra ese catálogo y no
  contra otro.
- **La vista dice de qué anime es la sala**, para que el navegador sepa qué catálogo
  pedir y cómo vestirse.
- **Estilo por anime**: emblema propio y colores propios. Dibujo original en los dos
  casos, como hasta ahora.
- **Que añadir un tercero sea añadir datos**: un fichero de personajes, una entrada en
  el registro y un bloque de colores. Sin tocar reglas, salas ni protocolo.

## 4. Alcance v4 — qué NO entra

Nada de esto se implementa en v4:

- **Partidas mezcladas.** Los dos jugadores de una sala juegan al mismo anime. Que
  cada uno eligiera el suyo permitiría poner un personaje de Hunter × Hunter a quien
  cree estar jugando a One Piece, y entonces "¿eres pirata?" deja de significar nada:
  el juego es hacer preguntas sobre un mundo compartido.
- **Cambiar de anime sin salir de la sala.** La sala es de un anime. Para jugar a otro
  se sale y se crea otra, que cuesta un clic desde la v3.1.
- **Elo, ranking o estadísticas entre partidas.** Se propuso para la v4 en la espec
  anterior y se aparta otra vez: sigue siendo el candidato natural para la siguiente.
- **Tablero de personajes para ir descartando.** Igual que en la v3, sigue fuera.
- **Avatares, imágenes o arte de ningún anime.** La estética es propia, y para cada
  anime nuevo también.
- **Datos por personaje más allá del nombre**: ni tripulación, ni nen, ni arco.
- **Una API para Hunter × Hunter.** Su lista se escribe a mano (sección 6.3).
- **Elegir anime al entrar con un código**, ni un aviso de "esta sala es de otro
  anime": no hay nada que avisar, porque no se elige nada al entrar.
- Cuentas de usuario, base de datos, más de dos jugadores, espectadores, chat libre,
  emparejamiento automático, sonido, modo contra la máquina y traducciones. Todo
  sigue fuera, como en la v2 y la v3.

## 5. Datos que maneja

### 5.1 El registro de animes

Vive en el código y no en un fichero de datos, porque no es una lista de nombres: trae
también el emblema, que es un dibujo. Cada anime es:

| Campo | Qué es |
|---|---|
| `id` | Identificador estable (`one-piece`, `hunter-x-hunter`) |
| `name` | El nombre tal y como se enseña (`Hunter × Hunter`) |
| `tagline` | Una línea que lo presenta en la pantalla de entrada |
| `emblem` | El dibujo de su medallón, en SVG |

A diferencia del `id` de un personaje, el de un anime **no se deriva del nombre**: se
escribe. `Hunter × Hunter` daría `hunter-hunter`, porque la equis no es una letra, y
ese identificador es además el nombre de su fichero y un trozo de URL. Son dos, y los
que vengan también se escriben a mano.

El fichero de personajes de un anime **sí se deriva** de su identificador:
`data/<id>.json`. Un anime no puede apuntar a un fichero cualquiera, y así no hay dos
sitios donde equivocarse.

### 5.2 Los catálogos

Un fichero por anime, con el mismo formato de la v3: una lista de `{ id, name }`,
ordenada por nombre y con un personaje por línea.

**Los identificadores de personaje no llevan prefijo de anime.** `nami` es `nami`, no
`one-piece:nami`. Es la decisión de fondo de esta versión y merece explicarse: la
alternativa —un solo catálogo con identificadores prefijados— obligaría a cambiar los
778 identificadores que ya existen, y el criterio 10 de la v3 dice justamente que
volver a generar el catálogo no cambia los que ya estaban. No hay ninguna necesidad de
que un identificador sea único entre animes: la sala sabe de qué anime es, así que
sabe en qué catálogo buscar, y dos personajes que se llamen igual en dos animes
distintos nunca se van a comparar entre sí.

### 5.3 Lo que cambia en la sala

La sala guarda **de qué anime es**, y no cambia en toda su vida: ni al entrar el
rival, ni en la revancha. La vista que recibe cada jugador lo trae, con nombre y
todo, porque el navegador lo necesita para dos cosas: pedir el catálogo correcto y
vestirse.

Sigue valiendo la regla de oro, y ahora se puede decir más corto: de la vista no sale
el personaje que tú tienes que adivinar. El anime sí sale, claro; es lo que los dos
están mirando.

## 6. Tecnología

### 6.1 Un catálogo por fichero, no uno con prefijos

Ya está razonado en 5.2. La consecuencia práctica es que el servidor deja de cargar
*el* catálogo y carga **todos** al arrancar, uno por anime del registro, y los guarda
por identificador. Son unos pocos cientos de kilobytes en total y se leen una vez: si
falta uno o está roto, el servidor no arranca, igual que en la v3 no arrancaba sin el
único que había. Es preferible a descubrirlo cuando alguien cree una sala de ese
anime.

### 6.2 Cómo llega al navegador

Como en la v3, por HTTP y no por el WebSocket, pero **ya no al arrancar**: el
navegador no sabe qué catálogo le hace falta hasta que está dentro de una sala. Lo
pide cuando entra, y se lo queda: volver a entrar en una sala del mismo anime no lo
vuelve a descargar, y la caché del navegador se encarga del resto.

En la pantalla de entrada no se descarga ningún catálogo. Ahí no hay a quién elegir:
solo se elige anime, y para eso basta el registro.

### 6.3 De dónde salen los personajes de cada anime

**Hay dos vías, y las dos son de primera.**

- **One Piece sigue viniendo de la API** de api-onepiece.com por el script de la v3,
  con su fichero de correcciones a mano al lado. No cambia nada salvo el nombre de los
  dos ficheros.
- **Hunter × Hunter se escribe a mano.** No se busca API: la de One Piece resultó ser
  de origen francés y dejó nombres que un lector no reconoce —"Ener" por Enel— y cinco
  personajes duplicados, y eso costó un fichero de correcciones. Para un anime que
  entra con una lista de menos de cien nombres, escribirlos bien de una vez sale más
  barato que traerlos mal y arreglarlos después.

Escribir un anime a mano no es un apaño ni deja el fichero fuera de control: la lista
pasa por la misma función que la de la API, así que se le derivan los identificadores,
se funden repetidos y se ordena igual. Y hay una prueba que lo comprueba sobre los
ficheros del repositorio (sección 6.6).

### 6.4 El protocolo

Al de la v3 le cambia un mensaje y le crece la vista:

| Mensaje | Dirección | Qué cambia |
|---|---|---|
| `create` | del cliente | Lleva además `anime`: el identificador del elegido |
| `view` | del servidor | Trae `anime: { id, name }` |

`join` y `resume` no cambian: quien entra hereda, y quien vuelve vuelve a la sala que
ya era suya. Un `create` con un anime que no existe se rechaza como cualquier otra
acción inválida, y también si se manda a mano por el WebSocket: es el mismo criterio 5
de la v3 aplicado a los animes.

### 6.5 El estilo

Dos piezas, y ninguna nueva:

- **El emblema** deja de estar incrustado en el código que pinta la cabecera y pasa al
  registro, uno por anime. Se dibuja con los colores del tema, no con los suyos
  propios, así que un anime nuevo trae su forma y los colores se los pone el tema.
- **Los colores** siguen donde estaban, en las variables CSS de `styles/main.css`. Lo
  que hay que hacer es que dejen de ser las únicas: las de One Piece se quedan como
  están y las de Hunter × Hunter se escriben en un bloque aparte. El navegador marca
  en la página de qué anime es lo que está viendo, y el bloque correspondiente manda.

Los colores que hoy están escritos a pelo en medio del CSS —el rojo de los títulos, el
hueso de la calavera, el dorado oscuro de los bordes— pasan a ser variables. Si no, un
tema nuevo cambiaría el fondo y dejaría los títulos del color de One Piece.

**Sin arte con derechos, en ningún anime.** Los dos emblemas son dibujos propios de
formas geométricas, como el de la v1. Los nombres de los personajes no son arte.

### 6.6 Tests

Lo de siempre: todo lo que decide se escribe como función pura y se testea sin red ni
navegador. De lo nuevo:

- El registro: que los identificadores sean únicos y tengan forma de identificador,
  que cada anime tenga nombre y emblema, y que buscar uno que no existe conteste que
  no.
- Los catálogos del repositorio, **todos**, y no solo el que había: que cada fichero
  exista, que se cargue, que no tenga nombres repetidos ni vacíos, y que sea
  exactamente lo que da la función que construye catálogos a partir de sus nombres.
  Esa última es la que mantiene honesta la lista escrita a mano.
- Que el servidor sirva por HTTP el catálogo de cada anime del registro, y siga sin
  servir nada más.
- Que la sala guarde su anime, que la revancha no lo cambie y que la vista lo traiga.
- Que un `create` con un anime inventado se rechace.
- Que cada anime del registro tenga sus colores en el CSS, igual que ya se comprueba
  que las tres respuestas tengan el suyo.

## 7. Limitaciones conocidas y aceptadas

- **Los dos jugadores juegan al mismo anime**, y quien entra con el código no puede
  cambiarlo. Es la decisión de la sección 4, no un olvido.
- **Hunter × Hunter tiene bastantes menos personajes que One Piece.** La lista escrita
  a mano cubre a los conocidos, no a todos los que han salido en una viñeta. Es la
  otra cara de la limitación que ya tenía One Piece —786 personajes son demasiados— y
  se asume igual: partidas más justas, a cambio de que falte algún secundario.
- **La lista escrita a mano se queda quieta**, y más quieta que la de la API: no hay
  script que la actualice, se edita el fichero.
- **Un anime nuevo sigue costando escribir un tema de color.** El molde ahorra el
  código, no el gusto: sin su bloque de colores, un anime nuevo se vería con los de
  One Piece.
- **El nombre del juego en la pestaña deja de decir One Piece**, y no cambia al elegir
  anime. Es el título del documento, no parte del tema.

## 8. Criterios de aceptación

La v4 está terminada cuando todo esto se cumple:

1. En la pantalla de entrada se elige entre los animes del registro, y se ve cuál está
   elegido.
2. La sala se crea con ese anime y lo conserva: al entrar el rival y en las revanchas.
3. Quien entra con el código juega al anime de la sala, sin elegir nada, y lo ve.
4. El selector de personaje ofrece los del anime de la sala, y solo esos.
5. El servidor rechaza un personaje que no esté en el catálogo **de esa sala**,
   también si la acción se manda a mano por el WebSocket.
6. El servidor rechaza un `create` con un anime que no existe, también a mano.
7. El emblema y los colores son los del anime de la sala.
8. Añadir un tercer anime es añadir su fichero de personajes, su entrada en el
   registro y su bloque de colores: ninguna regla, sala ni mensaje cambia.
9. Los identificadores de los personajes de One Piece son los mismos que en la v3.
10. Cada catálogo del repositorio es exactamente el que sale de construirlo a partir
    de sus nombres: sin repetidos, sin vacíos y ordenado.
11. El navegador no descarga ningún catálogo hasta que entra en una sala, y descarga
    el de su anime.
12. Con la API de One Piece apagada o inaccesible, el juego arranca y se juega igual,
    a los dos animes.
13. Todo lo de la v3 sigue cumpliéndose, y con ello lo de la v2: sus criterios de
    aceptación siguen valiendo, leyendo "el catálogo" como "el catálogo de la sala".

## 9. Plan de trabajo

Por piezas pequeñas, un commit por pieza, cada una con sus tests:

1. El renombrado: `data/characters.json` y `data/corrections.json` pasan a llevar el
   nombre del anime. Sin cambios de comportamiento, en su propio commit.
2. El registro de animes: la lista, la ruta de su catálogo y la búsqueda por
   identificador. Puro.
3. El catálogo de Hunter × Hunter, escrito a mano, y la prueba que valida todos los
   ficheros de catálogo del repositorio.
4. El servidor carga un catálogo por anime y los sirve todos.
5. La sala guarda su anime, `create` lo lleva y la vista lo trae.
6. La pantalla de entrada elige anime, y el navegador pide el catálogo de la sala.
7. El estilo por anime: el emblema sale del registro y los colores del tema.
8. La documentación: README y `CLAUDE.md` dejan de dar por hecho un solo anime.
