# Especificación — ¿Quién soy? (v5)

**Versión:** 5.0 (v5)
**Fecha:** 2026-08-31
**Autor:** Eric Batalla
**Sustituye a:** `docs/ESPEC-V4.md`, que se conserva como registro de lo construido.

**Entra Minecraft, con sus 1504 items.** Y con él se cae una palabra que la v4 dio
por buena: lo que se elige al crear una sala ya no es un anime, porque Minecraft no
lo es. Es un **mundo**, y un mundo no tiene por qué estar hecho de personajes.

---

## 1. Qué cambia respecto a la v4

La v4 abrió el juego a varios animes y dejó el molde hecho: un fichero de nombres,
una entrada en el registro y un bloque de colores. Minecraft cabe en ese molde sin
tocarlo… salvo en dos sitios donde el código y la interfaz dan por hecho que lo que
se adivina es **un personaje de un anime**, y ninguna de las dos cosas es cierta.

| | v4 | v5 |
|---|---|---|
| Qué se elige al crear la sala | Un anime | Un **mundo**, que puede no ser un anime |
| Cómo se llama en el código | `anime`, `ANIMES`, `data-anime` | `world`, `WORLDS`, `data-world` |
| Qué se adivina | Un personaje, siempre | Lo que diga el mundo: un personaje o un objeto |
| Qué dice la interfaz | "Elige el personaje de Nami" | Lo mismo, con la palabra del mundo |
| Mundos | One Piece, Hunter × Hunter | …y **Minecraft** |
| De dónde salen los nombres | API francesa, o a mano | …o del propio juego, traducidos por Mojang |

Lo demás sigue igual y sigue teniendo que cumplirse: salas con código, secreto real,
reconexión, expiración, revancha con marcador, historial, tablero de pistas, selector
con buscador, salir de la sala, y un catálogo y un estilo por mundo.

## 2. Cómo se juega (lo que cambia)

1. **Se elige mundo**, en la misma pantalla de entrada y con los mismos botones. Ahora
   hay tres.
2. **En Minecraft no adivinas quién eres, sino qué eres.** Eres un objeto: un yunque,
   una zanahoria dorada, una escalera de roble oscuro. Las preguntas dejan de ir de
   bandas y de poderes y pasan a ir de si te puedes comer, si ardes o si te mina un
   pico. La interfaz lo dice con esa palabra —"objeto"— y no con "personaje".
3. **Lo demás, igual.** Se busca en el catálogo del mundo, se pregunta, se responde y
   se arriesga exactamente como hasta ahora.

## 3. Alcance v5 — qué SÍ entra

- **Minecraft como tercer mundo**, con **todos sus items**: los 1504 del registro del
  juego, que es lo que se pidió. Bloques, herramientas, comida, discos, moldes,
  huevos generadores y los que solo salen en creativo.
- **Los nombres, en español y los de Mojang.** No una traducción propia ni el inglés:
  los mismos que lee quien juega en español, sacados del fichero de idioma oficial.
- **El renombrado de `anime` a `world`** en todo el código, la interfaz y la
  documentación. Sin cambios de comportamiento y en su propio commit.
- **Cada mundo dice cómo se llama lo que hay dentro**: "personaje" en One Piece y en
  Hunter × Hunter, "objeto" en Minecraft. La interfaz usa esa palabra donde antes
  decía "personaje" a secas.
- **Un script que genera el catálogo de Minecraft**, con la misma regla de siempre: se
  ejecuta a mano, el resultado se sube al repositorio y el juego no sale a internet.
- **Estilo propio de Minecraft**: su emblema y sus colores, dibujo original.

## 4. Alcance v5 — qué NO entra

Nada de esto se implementa en v5:

- **Recortar la lista de Minecraft.** Se pidió con todos los items y con todos se
  entrega. Que sean muchos está en la sección 7, no aquí.
- **Filtrar por categoría** (bloques, comida, herramientas). Sería lo natural con 1504
  items, pero exige un dato por objeto más allá del nombre, y eso lleva fuera desde la
  v3.
- **Imágenes o texturas de Minecraft.** Ni de ningún mundo: la estética es propia.
- **Nombres en otro idioma que no sea el que hable la interfaz.** No hay selector de
  idioma y sigue sin haberlo.
- **Cambiar el título del juego según el mundo.** Se sigue llamando "¿Quién soy?"
  aunque en Minecraft se adivine un qué. Es el nombre del juego, no una frase.
- **Elo, ranking o estadísticas entre partidas.** Apartado por tercera vez; sigue
  siendo el candidato para la siguiente.
- **Partidas mezcladas entre mundos**, cambiar de mundo sin salir de la sala, avatares,
  datos por objeto, cuentas, base de datos, más de dos jugadores, espectadores, chat
  libre, emparejamiento, sonido, modo contra la máquina y traducciones. Todo sigue
  fuera.

## 5. Datos que maneja

### 5.1 El registro, que ya no es de animes

Lo que la v4 llamaba anime pasa a llamarse **mundo**, y le crece un campo:

| Campo | Qué es |
|---|---|
| `id` | Identificador estable (`one-piece`, `minecraft`) |
| `name` | El nombre tal y como se enseña |
| `tagline` | Una línea que lo presenta en la pantalla de entrada |
| `emblem` | El dibujo de su medallón, en SVG |
| `noun` | Cómo se llama lo que hay dentro: `personaje`, `objeto` |

`noun` va en singular y la interfaz forma el plural añadiendo una ese, que es lo que
toca en las dos palabras que hay y en casi cualquier otra que venga. Si algún día
entra una que no —"lápiz"—, se le añade el plural al registro; hoy sería inventarse un
problema.

El renombrado no es cosmético. `data-anime` es el atributo del que cuelgan los colores
en el CSS, `anime` es un campo del mensaje `create` y otro de la vista, y `room.anime`
es lo que hace que una sala valide contra el catálogo que le toca. Se cambian los tres
a la vez, en un commit que no cambia nada más.

### 5.2 El catálogo de Minecraft

El mismo formato que los otros: una lista de `{ id, name }` ordenada por nombre, un
objeto por línea, con el identificador derivado del nombre.

Es unas cuatro veces el de One Piece —1504 contra 778— y sigue siendo un fichero de
texto de unos 70 KB. No cambia nada de cómo se carga ni de cómo se busca.

## 6. Tecnología

### 6.1 De dónde salen los items

De dos sitios públicos, y ninguno es una API de terceros que haya que creerse:

- **La lista de items, del registro del propio juego**, publicado por
  [minecraft-data](https://github.com/PrismarineJS/minecraft-data) (`data/pc/<versión>/items.json`).
  Es el registro que usa Minecraft por dentro: si un item está en el juego, está ahí,
  y no hay que decidir qué cuenta como item.
- **Los nombres, del fichero de idioma español de Mojang**, publicado por
  [minecraft-assets](https://github.com/InventivetalentDev/minecraft-assets)
  (`assets/minecraft/lang/es_es.json`). Son los nombres que enseña el juego, escritos
  por quien lo hizo.

**Esta vez la procedencia se ha mirado antes**, que es justo lo que no se hizo con la
API de One Piece: de ahí salieron "Ener" por Enel y cinco Gorosei repetidos. Aquí los
nombres no son la interpretación de nadie, son los del juego.

Se traen las dos cosas para **la misma versión** de Minecraft, que se escribe en el
script. Mezclar la lista de una con los nombres de otra dejaría items sin nombre.

Como con One Piece: **el script se ejecuta a mano, el resultado se sube al repositorio
y el juego no llama a nadie mientras se juega.**

### 6.2 Las tres costuras de los datos, y por qué no hacen falta correcciones

Comprobado sobre los ficheros reales de la versión 1.21.11:

- **El aire no es un item.** El registro empieza por `air`, que existe por dentro pero
  no se puede tener en la mano. Se tira, y es el único.
- **Cuarenta y ocho items comparten nombre de tres en tres.** Los 21 discos de música
  se llaman todos "Disco de música", los 19 moldes de herrería "Molde de herrería" y
  los 8 diseños de estandarte "Diseño de estandarte". En el juego no se confunden
  porque debajo llevan una segunda línea con cuál es, y esa línea está en el mismo
  fichero de idioma. El script la pega: "Disco de música: Lena Raine - Pigstep". Sin
  eso, `buildCatalog` los fundiría —hacen el mismo identificador— y se perderían 45
  items de los 1504 pedidos.
- **Lo demás sale limpio.** Con esas dos reglas, los 1504 nombres son distintos entre
  sí y sus 1504 identificadores también. **Minecraft no necesita fichero de
  correcciones**, y no se le crea uno vacío: el de One Piece existe porque hizo falta.

### 6.3 Buscar entre 1504

No cambia nada. El buscador ya enseña como mucho 30 coincidencias y cuenta las que se
deja (criterio 4 de la v3), y recorrer 1504 nombres por tecla no se nota. Lo que sí
cambia es cuántas veces avisará de que hay más: escribir "escalera" en Minecraft da
decenas. Eso es información buena, no un fallo.

### 6.4 La palabra de cada mundo

Donde la interfaz decía "personaje" ahora dice lo que diga el mundo. Son siete sitios,
contados sobre el código: el título de la preparación, el texto que lo acompaña, el
marcador de posición del buscador, el "Cargando los…" de mientras llega el catálogo,
el aviso de no haber podido cargarlo, el de que no hay coincidencias, y la línea que
recuerda qué hay que adivinar. Y el rótulo de la lista de resultados, que no se ve
pero lo lee en voz alta un lector de pantalla.

No se toca el nombre del juego ni el `<h1>`: en Minecraft se adivina un qué, pero el
juego se llama "¿Quién soy?" y así se queda.

### 6.5 Tests

Además de lo que ya había, y que sigue valiendo con la palabra cambiada:

- Que el catálogo de Minecraft esté, se cargue, y sea exactamente el que sale de
  construirlo desde sus nombres, como los otros dos.
- Que tenga los 1504 items y no 1459: la prueba de que las tres costuras de la 6.2
  siguen resueltas.
- Que la parte del script que decide —de los dos ficheros a una lista de nombres— sea
  pura y se pruebe con ficheros de mentira, sin salir a internet.
- Que cada mundo del registro tenga su palabra, y que la interfaz la use en vez de
  decir "personaje" a secas.

## 7. Limitaciones conocidas y aceptadas

- **1504 items son muchísimos, más del doble que One Piece.** La espec de la v3 ya
  daba 786 personajes por demasiados, y esto es peor por un motivo nuevo: no es que
  haya objetos que nadie conoce, es que hay **familias enteras casi idénticas** —cada
  madera por cada forma: escalera, losa, valla, trampilla, puerta, botón, placa— y
  llegar a "escalera de abedul" desde "escalera de roble" pide preguntas que el juego
  no distingue bien. Se asume a propósito, porque se pidió la lista entera; recortarla
  sería cambiar un fichero de datos, no el código.
- **A cambio, adivinar un objeto es más fácil que adivinar a un secundario.** "¿Se
  puede comer?", "¿arde?", "¿lo mina un pico?" parten la lista por la mitad de verdad,
  cosa que "¿es de la banda de Barbablanca?" no hace. La partida es distinta, no peor.
- **El catálogo se queda quieto en una versión de Minecraft.** La que diga el script.
  Un item nuevo no aparece hasta que alguien lo ejecuta y sube el resultado.
- **Los nombres son los de Mojang en español**, con sus rarezas: un huevo generador se
  llama "Generar creeper", porque es lo que pone en el juego.
- **La palabra de cada mundo forma el plural con una ese, y se supone masculina.**
  Vale para "el personaje" y "el objeto"; no valdría para todas las palabras del
  castellano, y el día que entre una que no cumpla, habrá que decírselo al registro.

## 8. Criterios de aceptación

La v5 está terminada cuando todo esto se cumple:

1. En la pantalla de entrada se puede elegir Minecraft, y la sala se crea con él.
2. El catálogo de Minecraft tiene **1504 items**, sin nombres ni identificadores
   repetidos, y sin el aire.
3. Los discos de música, los moldes de herrería y los diseños de estandarte están
   todos, cada uno con su nombre completo.
4. Los nombres son los del juego en español.
5. En una sala de Minecraft la interfaz dice "objeto" donde en una de One Piece dice
   "personaje", en todos los sitios de la sección 6.4.
6. Minecraft tiene su emblema y sus colores, y no se ve con los de otro mundo.
7. En el código, en la interfaz y en la documentación no queda ningún `anime`
   hablando de lo que ahora es un mundo.
8. Volver a generar el catálogo de Minecraft da el mismo fichero, byte a byte.
9. Con las dos fuentes apagadas o inaccesibles, el juego arranca y se juega igual, a
   los tres mundos.
10. Todo lo de la v4 sigue cumpliéndose, y con ello lo de la v3 y la v2, leyendo
    "anime" como "mundo" y "personaje" como "lo que ese mundo tenga dentro".

## 9. Plan de trabajo

Por piezas pequeñas, un commit por pieza, cada una con sus tests:

1. El renombrado de `anime` a `world`, en código, interfaz y documentación. Sin
   cambios de comportamiento, en su propio commit.
2. La palabra de cada mundo: el campo en el registro y los cinco sitios que la usan.
3. El script que trae los items y sus nombres, con su parte pura testeada aparte.
4. Minecraft entero: su catálogo generado, su entrada en el registro, su emblema y sus
   colores. Va junto y no en dos piezas porque un catálogo que no está en el registro
   no lo mira ninguna prueba, y un mundo sin colores rompe la que los vigila.
5. La documentación: README y `CLAUDE.md`.
