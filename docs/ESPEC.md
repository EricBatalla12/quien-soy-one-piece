# Especificación — ¿Quién soy? One Piece

**Versión:** 1.0 (v1)
**Fecha:** 2026-08-28
**Autor:** Eric Batalla

---

## 1. Qué es

Una web para jugar a "¿Quién soy?" entre dos personas, con temática de One Piece.
Cada jugador piensa un personaje en secreto y, por turnos, hace preguntas al rival
para adivinar cuál es.

## 2. Cómo se juega (partida completa)

1. **Preparación.** Cada jugador escribe en secreto el personaje que el rival deberá
   adivinar. Hasta que los dos no lo han escrito, la partida no empieza.
2. **Turnos alternos.** El jugador al que le toca elige entre dos acciones:
   - **Preguntar:** escribe una pregunta, que le aparece al rival.
   - **Arriesgar:** escribe el nombre del personaje que cree que le han asignado.
3. **Respuesta.** Si ha preguntado, el rival responde pulsando uno de tres botones:
   **Sí**, **No** o **A veces**. La pregunta y su respuesta quedan en un historial
   visible para ambos.
4. **Final.** Si un jugador arriesga y acierta, gana y la partida termina. Si falla,
   pierde el turno y la partida continúa.
5. La partida se puede reiniciar en cualquier momento.

## 3. Alcance v1 — qué SÍ entra

- Pantalla de preparación: cada jugador escribe su personaje secreto.
- Tablero de juego: turno actual, historial de preguntas y respuestas, y las
  acciones disponibles según de quién sea el turno.
- Preguntar (texto libre) y responder (Sí / No / A veces).
- Arriesgar el nombre del personaje, con victoria o pérdida de turno.
- Pantalla de fin de partida y opción de volver a jugar.
- Diseño temático de One Piece: divertido pero pulido.

## 4. Alcance v1 — qué NO entra

Esta lista es tan importante como la anterior. Nada de esto se implementa en v1:

- Cuentas de usuario, registro o login.
- Servidor o base de datos.
- Jugar desde dos dispositivos distintos (requiere backend → v2).
- Más de dos jugadores.
- Catálogo de personajes con validación o avatares (v2).
- Chat libre fuera del sistema de preguntas.
- Ranking, estadísticas o historial entre partidas.
- Sonido y música.
- Modo contra la máquina.
- Traducciones (solo español).
- Imágenes o arte oficial de One Piece. La estética se consigue con colores,
  tipografía y formas propias.

## 5. Datos que maneja

Todo vive en el navegador. No se envía nada a ningún servidor.

| Dato | Descripción |
|---|---|
| Personaje secreto de cada jugador | Texto libre, lo escribe el rival |
| Turno actual | Qué jugador tiene la acción |
| Fase de la partida | preparación / jugando / terminada |
| Historial | Lista de preguntas con su respuesta y quién la hizo |
| Ganador | Solo cuando la partida ha terminado |
| Número de jugador de la pestaña | En `sessionStorage`, que es propio de cada pestaña |

Nada se guarda en disco ni sobrevive a cerrar el navegador. **Recargar una pestaña
no pierde la partida**: al volver, pregunta a la otra pestaña por el estado actual y
lo recupera. Si se cierran las dos, la partida desaparece.

## 6. Tecnología

- Web estática, sin servidor.
- Los dos jugadores usan **dos pestañas del mismo navegador**, que se sincronizan
  entre sí (`BroadcastChannel` o equivalente).
- Concreción del stack (con o sin herramienta de construcción): **pendiente, se
  decide en la fase de arquitectura.**

## 7. Limitaciones conocidas y aceptadas

- **El secreto es "de honor".** Al vivir todo en el navegador, un jugador que abra
  las herramientas de desarrollo (F12) puede leer el personaje del rival. Se asume
  conscientemente en v1: el juego es para dos personas que no quieren hacer trampa.
  Un secreto real exigiría servidor, que está fuera de alcance.
- Al ser dos pestañas del mismo navegador, ambos jugadores comparten dispositivo.
- **Abrir las dos pestañas en el mismo instante** (menos de 200 ms) puede hacer que
  las dos se asignen el jugador 1, y entonces ambas podrían actuar en el mismo
  turno. Se asume porque una persona abre las pestañas con segundos de diferencia;
  si ocurre, se arregla recargando una de las dos.
- **Publicado en GitHub Pages, todos los proyectos de una cuenta comparten origen**
  (`usuario.github.io`) y con él el canal entre pestañas. Por eso el estado que
  llega por el canal se valida entero antes de aceptarlo, en lugar de confiar en
  que solo escriba el propio juego.
- El personaje se escribe libre: "Luffy" y "Monkey D. Luffy" son textos distintos y
  la comparación al arriesgar tendrá que ser tolerante (ver criterios de aceptación).

## 8. Criterios de aceptación

La v1 está terminada cuando todo esto se cumple:

1. Con dos pestañas abiertas, una partida completa se puede jugar de principio a fin.
2. La partida no empieza hasta que los dos jugadores han escrito su personaje.
3. Un jugador no puede actuar cuando no es su turno.
4. La pregunta enviada aparece en la otra pestaña sin recargar.
5. El historial muestra las mismas preguntas y respuestas en ambas pestañas.
6. Arriesgar el nombre correcto termina la partida y anuncia al ganador.
7. Arriesgar mal cede el turno y la partida sigue.
8. Al arriesgar no distinguen mayúsculas, acentos ni espacios sobrantes.
9. No se puede enviar una pregunta ni un personaje vacío.
10. La interfaz se ve correctamente en una ventana de escritorio y no se rompe
    en pantalla de móvil.
