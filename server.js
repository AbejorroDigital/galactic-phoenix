import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
// 🛡️ Importamos al nuevo guardián
import rateLimit from 'express-rate-limit';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

/**
 * 🚦 Configuración del Limitador: 
 * Esto evita que un solo usuario bombardee el servidor.
 */
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // Ventana de 15 minutos
  max: 100, // Limita cada IP a 100 peticiones por ventana
  message: 'Demasiadas señales desde tu base, piloto. Espera un momento.',
  standardHeaders: true, // Informa al usuario en los headers
  legacyHeaders: false,
});

// Aplicamos el limitador a todas las rutas
app.use(limiter);

// --- El resto de tu código de seguridad que ya corregimos ---
app.use(express.static(path.join(__dirname, '/'))); 

app.use('/node_modules', (req, res) => {
    res.status(403).send('Acceso denegado.');
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Phoenix despegando con escudos activos en: http://localhost:${PORT}`);
});
