import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Esto hace que el objeto 'global' esté disponible
    globals: true,
    // Indica el entorno de navegador simulado
    environment: 'jsdom',
    // ¡Aquí está la clave! Ruta hacia tu archivo de mocks
    setupFiles: ['./test/setup.js'], 
  },
});