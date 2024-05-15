import type { Interaction } from 'discord.js';
import { mergeMap, merge, concatMap } from 'rxjs';
import { PayloadType } from '../core/structures/enums';
import { filterTap, sharedEventStream } from '../core/operators'
import { createInteractionHandler, executeModule, makeModuleExecutor } from './event-utils';
import { SernError } from '../core/structures/enums'
import { isAutocomplete, isCommand, isMessageComponent, isModal, resultPayload, } from '../core/functions'
import { UnpackedDependencies } from '../types/utility';

export function interactionHandler(deps: UnpackedDependencies) {
    //i wish javascript had clojure destructuring 
    const { '@sern/modules': modules,
            '@sern/client': client,
            '@sern/logger': log,
            '@sern/errors': err,
            '@sern/emitter': emitter } = deps
    const interactionStream$ = sharedEventStream<Interaction>(client, 'interactionCreate');
    const handle = createInteractionHandler(interactionStream$, modules);

    const interactionHandler$ = merge(handle(isMessageComponent),
                                      handle(isAutocomplete),
                                      handle(isCommand),
                                      handle(isModal));
    return interactionHandler$
        .pipe(filterTap(e => emitter.emit('warning', resultPayload(PayloadType.Warning, undefined, e))),
              concatMap(makeModuleExecutor(module => 
                emitter.emit('module.activate', resultPayload(PayloadType.Failure, module, SernError.PluginFailure)))),
              mergeMap(payload => executeModule(emitter, log, err, payload)));
}
