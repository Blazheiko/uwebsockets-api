import { EventEmitter } from 'events';

const wsEventEmitter = new EventEmitter();
wsEventEmitter.setMaxListeners(100);

export { wsEventEmitter };
