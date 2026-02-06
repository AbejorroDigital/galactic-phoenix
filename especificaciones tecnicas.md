# **🛸 Galactic Phoenix: Technical Core & Architecture Specification**

Este documento constituye la referencia definitiva para el desarrollo, refactorización y mantenimiento del videojuego **Galactic Phoenix**. Proporciona un contexto profundo sobre la arquitectura *Data-Driven*, el flujo de estado, la infraestructura de sistemas y el ecosistema de pruebas para desarrolladores senior y agentes de IA.

## **1\. Visión General del Proyecto**

*Galactic Phoenix* es un *shoot 'em up* de scroll horizontal desarrollado con **Phaser 3** y **JavaScript ES6+**. Su diseño es modular y escalable, fundamentado en la **Separación de Conceptos (SoC)** y el uso intensivo de configuraciones JSON para definir la jugabilidad.

## **2\. Topología de Escenas y Transiciones**

El flujo de ejecución está estrictamente definido para separar la carga, el menú y la lógica de juego activa.

graph LR  
    Boot\["BootScene\<br/\>(SCENES.BOOT)"\]  
    Menu\["MenuScene\<br/\>(SCENES.MENU)"\]  
    Game\["GameScene\<br/\>(SCENES.GAME)"\]  
    UI\["UIScene\<br/\>(SCENES.UI)"\]  
    Pause\["PauseScene\<br/\>(SCENES.PAUSE)"\]  
      
    Boot \--\>|"scene.start()"| Menu  
    Menu \--\>|"scene.start(levelKey)"| Game  
    Game \--\>|"scene.launch()"| UI  
    Game \--\>|"scene.launch()"| Pause  
    Game \--\>|"scene.restart()"| Game  
    Game \--\>|"scene.start()"| Menu  
    UI \-.-\>|"parallel execution"| Game  
    Pause \-.-\>|"overlay mode"| Game

## **3\. Arquitectura Integral del Sistema**

El proyecto se divide en capas que separan el motor de juego de la lógica de negocio y las herramientas de desarrollo.

graph TB  
    subgraph Client\["Capa del Cliente (Navegador)"\]  
        Phaser\["Phaser 3 Engine"\]  
          
        subgraph Scenes\["Gestión de Escenas"\]  
            Boot\["BootScene.js"\]  
            Menu\["MenuScene.js"\]  
            Game\["GameScene.js"\]  
            UI\["UIScene.js"\]  
            Pause\["PauseScene.js"\]  
        end  
          
        subgraph Entities\["Sistema de Entidades"\]  
            PlayerEnt\["Player.js"\]  
            EnemyEnt\["Enemy.js"\]  
            BossEnt\["Boss.js"\]  
            ProjEnt\["Projectile.js"\]  
            PowerEnt\["PowerUp.js"\]  
        end  
          
        subgraph Managers\["Capa de Gestión"\]  
            AudioMgr\["AudioManager.js"\]  
            LevelMgr\["LevelManager.js"\]  
            SettingsMgr\["SettingsManager.js"\]  
        end  
          
        subgraph Core\["Sistemas Centrales"\]  
            DamageSys\["DamageSystem.js"\]  
            Constants\["Constants.js"\]  
            Events\["Events.js"\]  
        end  
    end  
      
    subgraph Server\["Capa del Servidor"\]  
        Express\["Express Server"\]  
        RateLimit\["Rate Limiter"\]  
    end  
      
    subgraph Data\["Capa de Datos"\]  
        JSONFiles\["Configuración JSON"\]  
        Assets\["Recursos Estáticos"\]  
    end

    Express \--\> Phaser  
    Phaser \--\> Scenes  
    Scenes \--\> Entities  
    Scenes \--\> Managers  
    Entities \--\> DamageSys  
    Scenes \--\> Core  
    Boot \--\> Data  
    LevelMgr \-.-\> JSONFiles

## **4\. Resolución de Módulos y Estrategia de Importación**

El proyecto utiliza un sistema de módulos de ES6 orquestado por Vite.

graph LR  
    indexHTML\["index.html"\] \--\>|script type=module| mainJS\["main.js"\]  
    mainJS \--\>|new Phaser.Game| config\["config object"\]  
    config \--\> scenesArray\["scene list"\]  
      
    scenesArray \--\> BootScene\["src/scenes/BootScene.js"\]  
    scenesArray \--\> GameScene\["src/scenes/GameScene.js"\]  
      
    BootScene \--\>|import| Managers\["src/managers/\*"\]  
    GameScene \--\>|import| Entities\["src/entities/\*"\]  
    Entities \--\>|import| Core\["src/core/\*"\]

## **5\. Gestión de Estado y Eventos (Reactividad)**

Se utiliza un patrón de **Fuente Única de Verdad** mediante un Singleton de estado y un Bus de Eventos.

### **Flujo de Estado (State Management)**

graph TB  
    subgraph Singleton\["PlayerState (src/core/PlayerState.js)"\]  
        State\["static instance: lives, score, weapons"\]  
    end  
      
    subgraph Writers\["State Writers"\]  
        Player\["Player.die()"\]  
        Enemy\["Enemy.die()"\]  
        PowerUp\["PowerUp.collect()"\]  
    end  
      
    subgraph Readers\["State Readers"\]  
        UIScene\["UIScene (HUD)"\]  
        GameSceneRef\["GameScene (Logic)"\]  
    end  
      
    Writers \--\> State  
    State \-.-\>|"read only"| UIScene  
    State \<--\>|"read/write"| GameSceneRef

### **Reactividad de Eventos**

Las colisiones y cambios de salud emiten eventos que la UIScene escucha para actualizar elementos visuales sin acoplamiento directo entre lógica y HUD.

## **6\. Infraestructura y Flujo de Pruebas**

La validación del código se realiza mediante **Vitest** y **JSDOM**, simulando el entorno del navegador y mockeando las APIs de Phaser.

sequenceDiagram  
    participant Dev as Developer  
    participant Vitest as Vitest Runner  
    participant Setup as test/setup.js  
    participant Tests as test/\*.test.js  
    participant JSDOM as JSDOM Environment

    Dev-\>\>Vitest: npm run test  
    Vitest-\>\>JSDOM: Initialize browser environment  
    Vitest-\>\>Setup: Execute setupFiles (Mocks Phaser)  
    Setup--\>\>Vitest: Global Phaser mock ready  
    Vitest-\>\>Tests: Run Assertions  
    Tests--\>\>Dev: Results & Coverage

## **7\. Directrices para Refactorización (IA Developer)**

Para mantener la coherencia de este desarrollador senior:

1. **Data-Driven**: Cualquier cambio en el balanceo debe reflejarse en los JSON de assets/data/.  
2. **Desacoplamiento**: Usa el Events Bus para comunicar entidades con la UI.  
3. **Mocks de Test**: Al añadir nuevas APIs de Phaser, actualiza test/setup.js.  
4. **Persistencia**: El PlayerState debe ser el único lugar donde residan las métricas globales del jugador.

*Documento actualizado con la arquitectura integral de Galactic Phoenix.*