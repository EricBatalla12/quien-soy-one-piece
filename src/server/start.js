/**
 * Arranca el servidor. Es lo que ejecuta `npm start`.
 *
 * El puerto lo pone el hosting en la variable PORT; en local vale el de siempre.
 */

import { fileURLToPath } from 'node:url';

import { startServer } from './server.js';

const root = fileURLToPath(new URL('../..', import.meta.url));
const port = Number(process.env.PORT ?? 8000);

const server = startServer({ port, root });
const listening = await server.listen();

console.log(`¿Quién soy? escuchando en http://localhost:${listening}`);
