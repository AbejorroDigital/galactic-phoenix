/**
 * @typedef {Object} StateCallbacks
 * @property {Function} [enter] - Llamado al entrar en el estado.
 * @property {Function} [update] - Llamado durante la actualización del estado.
 * @property {Function} [exit] - Llamado al salir del estado.
 */

/**
 * @class StateMachine
 * @description Sistema de gestión de estados para entidades.
 * Permite definir estados con funciones de callback para entrar, actualizar y salir, vinculados a un contexto.
 * 
 * @example
 * this.stateMachine = new StateMachine('IDLE', {
 *     IDLE: { enter: () => console.log('Inactivo'), update: (t, d) => {} },
 *     MOVE: { enter: () => console.log('Moviéndose') }
 * }, this);
 */
export default class StateMachine {
    /**
     * @param {string} [initialState=null] - El nombre del estado inicial.
     * @param {Object.<string, StateCallbacks>} [states={}] - Mapa de nombres de estado a sus callbacks.
     * @param {Object} [context=null] - El contexto 'this' para los callbacks.
     */
    constructor(initialState = null, states = {}, context = null) {
        /** @type {string} */
        this.currentState = initialState;
        /** @type {Object.<string, StateCallbacks>} */
        this.states = states;
        /** @type {Object} */
        this.context = context;
        /** @type {number} */
        this.stateTime = 0;

        // Llamar a enter para el estado inicial
        if (this.currentState && this.states[this.currentState]?.enter) {
            this.states[this.currentState].enter.call(this.context);
        }
    }

    /**
     * Añade un nuevo estado a la máquina.
     * @param {string} name - Nombre del estado.
     * @param {StateCallbacks} callbacks - Callbacks del estado.
     */
    addState(name, callbacks) {
        this.states[name] = callbacks;
    }

    /**
     * Establece el estado actual disparando los callbacks de transición.
     * @param {string} state - Nombre del estado.
     * @param {...any} args - Argumentos para el callback 'enter'.
     */
    setState(state, ...args) {
        this.transition(state, ...args);
    }

    /**
     * Transiciona a un nuevo estado.
     * @param {string} newState - Nombre del estado de destino.
     * @param {...any} args - Argumentos opcionales pasados al callback 'enter' del nuevo estado.
     */
    transition(newState, ...args) {
        if (!this.states[newState]) {
            console.warn(`StateMachine: Estado '${newState}' no existe`);
            return;
        }

        if (newState === this.currentState) return; // Ya en este estado

        // Salir del estado actual
        if (this.states[this.currentState]?.exit) {
            this.states[this.currentState].exit.call(this.context);
        }

        const prevState = this.currentState;
        this.currentState = newState;
        this.stateTime = 0;

        // Entrar en el nuevo estado
        if (this.states[newState]?.enter) {
            this.states[newState].enter.call(this.context, prevState, ...args);
        }
    }

    /**
     * Actualiza el estado actual y rastrea el tiempo transcurrido en él.
     * @param {number} time - Tiempo total transcurrido del juego.
     * @param {number} delta - Tiempo transcurrido desde la última actualización.
     */
    update(time, delta) {
        this.stateTime += delta;

        if (this.states[this.currentState]?.update) {
            this.states[this.currentState].update.call(this.context, time, delta);
        }
    }

    /**
     * Devuelve el nombre del estado actual.
     * @returns {string}
     */
    getState() {
        return this.currentState;
    }

    /**
     * Comprueba si la máquina está actualmente en un estado específico.
     * @param {string} state - Nombre del estado a comprobar.
     * @returns {boolean}
     */
    isInState(state) {
        return this.currentState === state;
    }
}
