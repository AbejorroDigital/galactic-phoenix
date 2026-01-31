/**
 * @file server.js
 * @description Servidor Express para Galactic Phoenix.
 * Sirve los recursos estáticos y el punto de entrada principal del juego.
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

// Configuración para obtener la ruta en módulos ES6
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
/** @type {number|string} */
const PORT = process.env.PORT || 3000;

// Middleware para servir archivos estáticos
// Esto hace que toda tu carpeta sea accesible desde el navegador
app.use(express.static(__dirname));

/**
 * Ruta principal del juego.
 * @name GET/
 * @function
 */
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Manejo de errores 404 (opcional pero recomendado)
app.use((req, res) => {
    res.status(404).send('Lo siento, el recurso galáctico no existe.');
});

app.listen(PORT, () => {
    console.log(`🚀 Phoenix despegando en: http://localhost:${PORT}`);
});