import type Wrapper from '../structures/wrapper';
import { Subject, type Observable } from 'rxjs';
import type { EventEmitter } from 'events';
import type SernEmitter from '../sernEmitter';
import type { ErrorHandling, Logging } from '../contracts';

export abstract class EventsHandler<T> {
    protected payloadSubject = new Subject<T>();
    protected abstract discordEvent: Observable<unknown>;
    protected client: EventEmitter;
    protected emitter: SernEmitter;
    protected crashHandler: ErrorHandling;
    protected logger: Logging;
    protected constructor({ containerConfig }: Wrapper) {
        const [
            client,
            emitter,
            crash,
            logger
        ] = containerConfig.get('@sern/client', '@sern/emitter', '@sern/errors', '@sern/logger');
        this.logger = logger as Logging;
        this.logger.info('Logger activated ');
        this.client = client as EventEmitter;
        this.logger.info('Client activated: ' + this.client.constructor.name);
        this.emitter = emitter as SernEmitter;
        this.logger.info('SernEmitter activated ');
        this.crashHandler = crash as ErrorHandling;
    }
    protected abstract init(): void;
    protected abstract setState(state: T): void;
}
