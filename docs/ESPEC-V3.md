# Especificación — ¿Quién soy? One Piece (v3)

**Versión:** 3.1 (v3)
**Fecha:** 2026-08-30
**Autor:** Eric Batalla
**Sustituye a:** `docs/ESPEC-V2.md`, que se conserva como registro de lo construido.

**Novedad de la 3.1:** salir de una sala, que no estaba en la 3.0. Se construyó
después de darla por terminada y se recoge aquí —secciones 6.6 y 8— en vez de
esperar a una v4: es de esta versión, y una espec que no cuenta lo que hay hace más
daño que una espec corta.

---

## 1. Qué cambia respecto a la v2

Hasta ahora el personaje se escribe a mano. Eso obliga a comparar textos con
tolerancia —"ZORO", "zoro" y " Zóro " tienen que valer igual— y aun así deja fuera el
caso de siempre: **"Luffy" y "Monkey D. Luffy" son la misma persona y el juego no lo
sabe**. En la v3 el personaje se elige de un catálogo cerrado.

| | v2 | v3 |
|---|---|---|
| Cómo se elige el personaje | Se escribe a mano | Se busca y se elige de una lista |
| Cómo se arriesga | Se escribe a mano | Se busca y se elige de la misma lista |
| Qué guarda la partida | El texto que escribiste | El identificador del personaje |
| Cómo se decide si aciertas | Comparando textos con tolerancia | Comparando identificadores |
| Personajes posibles | Cualquier cosa, incluida una errata | Los del catálogo, y solo esos |

Lo demás de la v2 sigue igual: salas con código, secreto real, reconexión,
expiración, revancha con marcador, historial que se desplaza y tablero de pistas.

## 2. Cómo se juega (lo que cambia)

1. **Preparación.** En vez de escribir el personaje, cada jugador **busca y elige**
   el que su rival deberá adivinar. Escribe unas letras, aparecen las coincidencias y
   se pulsa una. Hasta que no hay una elegida, no se puede confirmar.
2. **Arriesgar.** Igual: se busca y se elige de la misma lista. Ya no se puede fallar
   por escribir mal un nombre; se falla por equivocarse de personaje, que es de lo
   que va el juego.
3. **Final.** Al terminar se revelan los dos personajes, como hasta ahora.
4. **Salir** (3.1). Desde cualquier pantalla de la sala se puede volver a la de
   entrada. La sala se cierra para los dos: sin rival no hay partida que seguir.

## 3. Alcance v3 — qué SÍ entra

- **Catálogo cerrado de personajes de One Piece**, guardado en el repositorio.
- **Selector con buscador**, en la preparación y al arriesgar: se escribe, se filtra y
  se elige. Insensible a mayúsculas y acentos, como ya lo era la comparación.
- **El servidor solo acepta personajes del catálogo**, tanto al elegir el secreto como
  al arriesgar. Un identificador inventado se rechaza.
- **El acierto se decide comparando identificadores**, no textos.
- **Un script que genera el catálogo** desde una API pública, con las correcciones a
  mano guardadas aparte para que volver a ejecutarlo no las pierda.
- **Salir de la sala** (3.1) desde cualquiera de sus pantallas, cerrándola para los
  dos jugadores. Ver sección 6.6.

## 4. Alcance v3 — qué NO entra

Nada de esto se implementa en v3:

- **Tablero de personajes para ir descartando** (la rejilla del "¿Quién es quién?" de
  toda la vida). Es el candidato natural para una versión siguiente, y ahora que la
  lista es cerrada por fin tendría sentido, pero no entra aquí.
- **Elo, ranking o estadísticas entre partidas.** Propuesto para la v4.
- Avatares, imágenes o arte de One Piece. La estética sigue siendo propia.
- Datos por personaje más allá del nombre: ni tripulación, ni recompensa, ni arco.
  Sin ellos no hay filtros por banda ni preguntas que se respondan solas.
- Cuentas de usuario, base de datos, más de dos jugadores, espectadores, chat libre,
  emparejamiento automático, sonido, modo contra la máquina y traducciones. Todo
  sigue fuera, como en la v2.
- Consultar la API en caliente durante la partida (ver sección 6).

## 5. Datos que maneja

### 5.1 El catálogo

Un fichero de datos del repositorio. Cada personaje es lo mínimo:

| Campo | Qué es |
|---|---|
| `id` | Identificador estable, derivado del nombre (`monkey-d-luffy`) |
| `name` | El nombre tal y como se enseña |

El `id` no se coge de la API sino que **se deriva del nombre**: normalizado, sin
acentos y con guiones. Así, volver a generar el catálogo no cambia los
identificadores de los personajes que ya estaban, y dos entradas repetidas de la API
caen en el mismo `id` y se quedan en una.

### 5.2 Lo que cambia en la partida

En el servidor, `secretFor` pasa a guardar **identificadores** en vez de textos, y lo
mismo los intentos del historial.

La **vista** que recibe cada jugador sigue trayendo nombres ya resueltos, no
identificadores: el historial se pinta igual que hasta ahora y el cliente no tiene
que cruzar nada para enseñarlo. Lo que no cambia ni un ápice es la regla de oro: **el
personaje que tú debes adivinar no sale del servidor** hasta que la partida termina,
ni como nombre ni como identificador.

## 6. Tecnología

### 6.1 De dónde sale el catálogo

De la API pública de [api-onepiece.com](https://api.api-onepiece.com/v2/characters/en),
que no pide registro y devuelve 786 personajes en JSON.

**Pero no se consulta durante la partida.** Un script la lee una vez y deja el
resultado en un fichero del repositorio, que es lo que usa el juego. Las razones:

- Si la API se cae, cambia de formato o desaparece, el juego sigue funcionando.
- El catálogo entra en el repositorio como cualquier otro cambio: se puede leer, se
  puede corregir a mano y se ve en el historial de commits qué cambió.
- No hace falta ninguna dependencia nueva: `fetch` viene con Node.

### 6.2 Los datos vienen con costuras

Comprobado sobre la respuesta real, y por eso el script limpia en vez de copiar:

- **3 nombres duplicados** (`Sanjuan Wolf`, `Silvers Rayleigh`, `Scarlett`). Al derivar
  el `id` del nombre, se funden solos.
- **Restos del francés**, porque la API es de origen francés:
  `Edward Newgate / Barbe Blanche`, `Marchall D. Teach / Barbe Noire`.
- **Nombres que son la versión francesa y no la que se conoce**: `Ener` por **Enel**.
  Distinto de lo anterior: aquí no hay ninguna palabra en francés que delate el
  problema, el nombre está mal a secas, y el buscador de la sección 6.4 busca por
  nombre, así que un personaje así es un personaje inencontrable.
- **Una errata**: `Marchall` por `Marshall`.
- **Puntuación inconsistente**: `Monkey D Luffy` frente a `Rocks D. Xebec`.
- **Cinco personajes por duplicado**: los Gorosei salen con su nombre —Jaygarcia
  Saturn, Marcus Mars, Topman Warcury, Ethanbaron V. Nusjuro y Shepherd Ju Peter— y
  otra vez como `1er Doyen`…`5e Doyen`. Estos no se funden solos, porque el nombre es
  distinto.

Las correcciones viven en **un fichero aparte, escrito a mano**, que el script aplica
al final. Así se puede volver a generar el catálogo cuando la API añada personajes sin
perder lo ya corregido, y cada corrección queda a la vista en vez de escondida en el
código.

Una corrección puede además **tirar la entrada**, y no solo cambiarle el nombre: se
escribe `null` donde iría el nombre bueno. Es lo que se hace con los cinco `Doyen`
duplicados. Se tiran en vez de renombrarlos a propósito: de un "3er Doyen" no hay
manera de saber cuál de los cinco ancianos es, así que ponerle un nombre sería
inventárselo, y los cinco buenos ya están en la lista.

Un nombre con dos formas separadas por barra (`Charlotte Linlin / Big Mom`) se deja
como está: el buscador busca sobre el nombre entero, así que escribir "big mom"
también lo encuentra.

### 6.3 Cómo llega al navegador

El catálogo se sirve como fichero estático por HTTP y el navegador lo pide una vez al
arrancar; el navegador lo guarda en su caché, así que reconectar no vuelve a
descargarlo. El servidor lo lee al arrancar para poder validar.

No se manda por el WebSocket: son unos 20 KB que habría que reenviar en cada
reconexión, y por HTTP se cachean solos.

### 6.4 El buscador

- Filtra por nombre con la normalización que ya existe (sin mayúsculas ni acentos).
- **Enseña como mucho 30 coincidencias**, y dice cuántas se ha dejado fuera. Con 786
  personajes, pintar la lista entera en cada repintado es tirar trabajo, y una lista
  de 786 nombres tampoco se lee.
- Con el campo vacío no enseña nada, solo invita a escribir.
- Se puede usar con el teclado: escribir, bajar por los resultados y elegir.

### 6.5 Tests

Todo lo que decide se escribe como función pura y se testea sin red ni navegador: la
derivación del `id`, la limpieza del catálogo, la búsqueda, y las reglas del juego con
identificadores. El script que llama a la API no se testea contra la API: se testea la
función que transforma una respuesta en catálogo, dándole una respuesta de mentira.

### 6.6 Salir de la sala (3.1)

Hasta ahora de una sala solo se salía de dos maneras, las dos malas: cerrar la
pestaña —y dejar tu plaza ocupada hasta que la sala caducara— o esperar quince
minutos. Se añade una tercera, deliberada: un botón en todas las pantallas de la
sala, que devuelve a la pantalla de entrada.

**Salir cierra la sala para los dos.** Es la decisión de fondo y no es la única
posible, pero sí la única que no deja a nadie a medias: con dos plazas y una partida
entre dos personas concretas, dejar la sala viva solo dejaría al que se queda
esperando a alguien que no va a volver, con un marcador y un historial que ya no son
de nadie. Al rival se le dice quién se ha ido, no que la sala ha caducado, que es
mentira y además le haría sospechar del servidor.

**Con el rival sentado se pregunta antes; esperando solo, no.** Salir de una sala
recién creada no interrumpe a nadie y un clic basta. Con alguien al otro lado, un
roce sin querer —en un móvil, con el pulgar— se llevaría por delante también su
partida, así que hay que confirmar. La confirmación se pinta como una pantalla más y
**no** con un diálogo del navegador: así se lee y se testea como el resto de la
interfaz, y en el móvil no salta una ventana del sistema encima del juego.

Al protocolo de la v2 (sección 6.1 de `docs/ESPEC-V2.md`) le salen dos mensajes:

| Mensaje | Dirección | Qué provoca |
|---|---|---|
| `leave` | del cliente | Cierra la sala en la que estás sentado |
| `left` | del servidor | Te has salido tú: a la pantalla de entrada, sin nada que leer |

Al que se queda se le avisa con el `expired` que ya existía, cambiando el motivo:
"Nami ha salido de la sala". Para el navegador es lo mismo que una sala caducada
—esa sala ya no existe— y así no hace falta un mensaje nuevo para cada forma de
perderla.

**A ninguno de los dos se le cierra el socket**, y en esto se aparta de lo que hace
una sala al caducar. Cerrarlo es la forma fácil de vaciar la plaza, porque la plaza
vive dentro del socket, pero le provoca al jugador una reconexión y, mientras dura,
el aviso de que su sitio en la sala le espera, que en este caso ya es falso. Se le
vacía la plaza y se le deja la conexión: sale, lee lo que ha pasado y puede crear
otra sala en el momento.

## 7. Limitaciones conocidas y aceptadas

- **786 personajes son muchos para adivinar.** El catálogo entero incluye personajes
  que salen en una viñeta, y si tu rival elige uno de esos la partida se vuelve
  imposible. Se asume a propósito: los dos jugadores se conocen y el que elige un
  personaje que nadie ha oído nombrar se está estropeando su propia partida. Si con el
  tiempo molesta, recortar la lista es un cambio de datos, no de código.
- **El catálogo se queda quieto.** Un personaje nuevo del manga no aparece hasta que
  alguien ejecuta el script y sube el resultado.
- **Los nombres son los de la API**, en la forma en que ella los escribe. Las
  correcciones son las que haya en el fichero de correcciones, no todas las posibles.
- **Salir no tiene vuelta atrás** (3.1). La sala se cierra, y con ella el marcador y
  el historial; el código deja de valer. No hay forma de recuperarla, igual que no la
  hay cuando caduca. Por eso se pregunta antes si hay alguien más dentro.
- **El buscador busca nombres, no apodos.** Escribir "zoro" encuentra a "Roronoa
  Zoro", porque busca dentro del nombre entero; pero "el cocinero" no encuentra a
  Sanji, ni "sombrero de paja" a la tripulación. Para eso harían falta datos por
  personaje, que quedan fuera (sección 4).

## 8. Criterios de aceptación

La v3 está terminada cuando todo esto se cumple:

1. En la preparación se elige el personaje del rival buscándolo en una lista, y no se
   puede confirmar sin haber elegido uno.
2. Al arriesgar se elige de la misma lista.
3. El buscador encuentra igual escribiendo con o sin mayúsculas y con o sin acentos.
4. El buscador no enseña más de 30 coincidencias y avisa de cuántas faltan.
5. El servidor rechaza un personaje que no esté en el catálogo, **también si la acción
   se manda a mano por el WebSocket**.
6. Acertar el personaje termina la partida; el acierto se decide por identificador.
7. El historial y la pantalla final siguen enseñando nombres, no identificadores.
8. El personaje que debes adivinar no aparece en ningún mensaje que llegue a tu
   navegador, ni como nombre ni como identificador, hasta que la partida termina.
9. Con la API apagada o inaccesible, el juego arranca y se juega igual.
10. Volver a generar el catálogo no cambia el identificador de un personaje que ya
    estaba, y conserva las correcciones hechas a mano.
11. El catálogo no tiene nombres repetidos ni vacíos.
12. Todo lo de la v2 sigue cumpliéndose: sus veinte criterios de aceptación.
13. El selector se puede usar con el teclado y no se rompe en pantalla de móvil.

Y de la 3.1:

14. Se puede salir de la sala desde cualquiera de sus pantallas: esperando rival,
    eligiendo personaje, jugando y al terminar. En la de entrada no hay botón, porque
    no hay de dónde salir.
15. Salir cierra la sala para los dos: al que se queda se le dice quién se ha ido, y
    el código deja de existir para cualquiera que lo intente después.
16. Con el rival sentado se pregunta antes de salir; esperando solo en una sala
    recién creada, se sale de un clic.
17. Ni el que sale ni el que se queda tienen que recargar la página: los dos pueden
    crear otra sala o entrar en una distinta desde la pantalla de entrada.

## 9. Plan de trabajo

Por piezas pequeñas, un commit por pieza, cada una con sus tests:

1. El catálogo como dato: derivar identificadores, limpiar y validar la lista. Puro.
2. El script que trae la respuesta de la API y el fichero de correcciones.
3. El servidor sirve el catálogo y lo usa para validar; las reglas pasan a comparar
   identificadores.
4. La vista resuelve identificadores a nombres.
5. El buscador: la función que filtra, y el selector en la interfaz.
6. Preparación y arriesgar usan el selector.

Y ya con la v3 terminada, la pieza de la 3.1:

7. Salir de la sala: la acción en el servidor, el botón y su confirmación.
