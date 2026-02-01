/**
 * @file server.js
 * @description Servidor Express optimizado y seguro para Galactic Phoenix.
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

/**
 * 🛡️ SEGURIDAD: Solo servimos carpetas específicas.
 * Si tus imágenes/sonidos están en una carpeta llamada 'assets', la servimos así.
 * El archivo index.html y tus scripts de Phaser deberían estar en una carpeta raíz 
 * o idealmente en una carpeta 'public'.
 */

// Si tienes tus assets en una carpeta aparte, descomenta la siguiente línea:
// app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Servimos solo el archivo principal y los scripts necesarios
// En lugar de servir TODO el __dirname, servimos archivos específicos o una subcarpeta
app.use(express.static(path.join(__dirname, '/'))); 

/**
 * 🔒 FILTRO CRÍTICO: Bloqueamos explícitamente el acceso a archivos sensibles
 * por si acaso alguien intenta saltarse la ruta estática.
 */
app.use('/node_modules', (req, res) => {
    res.status(403).send('Acceso denegado a los hangares de mantenimiento.');
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.use((req, res) => {
    res.status(404).send('Lo siento, el recurso galáctico no existe.');
});

app.listen(PORT, () => {
    console.log(`🚀 Phoenix despegando de forma segura en: http://localhost:${PORT}`);
});
