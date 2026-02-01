# Galactic Phoenix

**Galactic Phoenix** es un videojuego de naves *shoot 'em up* de scroll horizontal, inspirado en clásicos como *Gradius*. Desarrollado con **Phaser 3** y JavaScript moderno (ES6+), destaca por su arquitectura escalable y basada en datos (*Data-Driven*), donde niveles, enemigos y jefes se definen en archivos JSON.

[Juega Galactic Phoenix aquí](https://galactic-phoenix.vercel.app)

## 📜 Tabla de Contenidos
- [Acerca del Proyecto](#-acerca-del-proyecto)
- [Características Principales](#características-principales)
- [Tecnologías Utilizadas](#tecnologías-utilizadas)
- [🏛️ Arquitectura del Proyecto](#arquitectura-del-proyecto)
- [🚀 Cómo Empezar](#cómo-empezar)
  - [Prerrequisitos](#prerrequisitos)
  - [Instalación y Ejecución](#instalación-y-ejecución)
- [🧪 Ejecutar Pruebas](#ejecutar-pruebas)
- [📄 Licencia](#licencia)
- [✒️ Autor](#autor)

## 🕹️ Acerca del Proyecto
**Galactic Phoenix** es un *shooter* espacial que recrea la experiencia de los arcades clásicos con un enfoque moderno de desarrollo web. Controla la nave **"Phoenix"** a través de campos de asteroides y flotas enemigas, recoge *power-ups* y enfréntate a jefes épicos de final de nivel.

Este proyecto demuestra buenas prácticas de desarrollo de videojuegos en JavaScript: separación de conceptos, diseño basado en datos y pruebas unitarias.

## ✨ Características Principales
- **Scroll Horizontal Clásico**: Jugabilidad inspirada en la saga *Gradius*.
- **Sistema de Niveles Dinámico**: Niveles construidos desde "bloques" de desafíos en JSON.
- **Jefes de Final de Nivel**: Batallas con patrones de ataque únicos.
- **Power-Ups**: Mejora tu nave con orbes de enemigos derrotados.
- **Gestión de Estado Profesional**: Lógica del juego, UI y estado del jugador claramente separados.
- **Suite de Pruebas**: Código robusto con pruebas unitarias en **Vitest**.

## 💻 Tecnologías Utilizadas
- **Motor de Juego**: Phaser 3
- **Servidor de Desarrollo**: Node.js/Express
- **Empaquetador**: Vite
- **Pruebas**: Vitest con JSDOM
- **Lenguaje**: JavaScript (ES6+)

## 🏛️ Arquitectura del Proyecto
Código **modular, escalable y mantenible**.

### Diseño Basado en Datos (*Data-Driven*)
Comportamiento de enemigos, jefes, armas y secuencia de niveles definido en `assets/data/*.json`. Modifica el juego sin tocar código.

### Separación de Conceptos (SoC)
```
scenes/          # Menú, Juego, UI, Pausa (UIScene || GameScene)
managers/        # LevelManager, AudioManager (lógica global)
entities/        # Player, Enemy, Boss, Projectile (autocontenidos)
core/            # StateMachine, DamageSystem (reutilizables)
```

### Flujo de Datos
```
[ PlayerState (Singleton) ] ← Fuente única de verdad (vidas, score)
       ↓
[ GameScene ] ← Orquesta (no posee estado)
  ↓ LevelManager → Lee JSON → Genera enemigos
  ↓ Player → Lee/Escribe PlayerState
       ↓
[ UIScene ] ← Lee PlayerState → Actualiza HUD
```

## 🚀 Cómo Empezar

### Prerrequisitos
- **Node.js** (versión LTS recomendada)
```bash
npm install -g npm@latest
```

### Instalación y Ejecución
```bash
git clone https://github.com/tu-usuario/galactic-phoenix.git
cd galactic-phoenix
npm install
npm run dev
```

**Abrir**: `http://localhost:3000` (recarga automática con *hot reload*).

## 🧪 Ejecutar Pruebas
**Vitest** para unitarias e integración.

```bash
npm run test              # Una vez
npm run test:watch        # Modo watch
npm run test:coverage     # Cobertura (/coverage/)
```

## 📄 Licencia
**[ISC License](LICENSE)** - Software libre permisivo. Consulta `LICENSE` para detalles.

## ✒️ Autor
**Carlos García Torín (Abejorro Digital)**  
Desarrollo inicial y arquitectura.

***
