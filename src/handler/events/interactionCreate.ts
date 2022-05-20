import type { CommandInteraction, Interaction, MessageComponentInteraction, SelectMenuInteraction } from 'discord.js';
import { concatMap, fromEvent, map, Observable, of, throwError } from 'rxjs';
import type Wrapper from '../structures/wrapper';
import * as Files from '../utilities/readFile';
import { match } from 'ts-pattern';
import { SernError } from '../structures/errors';
import Context from '../structures/context';
import { controller } from '../sern';
import type { Module } from '../structures/module';
import {
    isButton,
    isChatInputCommand,
    isMessageCtxMenuCmd,
    isPromise,
    isSelectMenu,
    isUserContextMenuCmd,
} from '../utilities/predicates';
import { filterCorrectModule } from './observableHandling';
import { CommandType } from '../structures/enums';
import type { Result } from 'ts-results';

function applicationCommandHandler(mod: Module | undefined, interaction: CommandInteraction) {
    const mod$ = <T extends CommandType>(cmdTy: T) => of(mod).pipe(
        filterCorrectModule(cmdTy),
    );
    return match(interaction)
        .when(isChatInputCommand, i => {
                const ctx = Context.wrap(i);
                //SUPPORT COMMANDTYPE.BOTH
                return mod$(CommandType.Slash).pipe(
                    concatMap(m => {
                        return of(m.onEvent?.map(e => e.execute(
                            [ctx, ['slash', i.options]],
                            controller,
                        )) ?? []).pipe(map(res => ({
                            mod, res, execute() {
                                return m.execute(ctx, ['slash', i.options]);
                            },
                        })));
                    }),
                );
            },
        )
        //Todo: refactor so that we dont have to have two separate branches. They're near identical!!
        //Only thing that differs is type of interaction
        .when(isMessageCtxMenuCmd, ctx => {
                return mod$(CommandType.MenuMsg).pipe(
                    concatMap(m => {
                        return of(m.onEvent?.map(e => e.execute(
                            [ctx],
                            controller,
                        )) ?? []).pipe(map(res => ({
                            mod, res, execute() {
                                return m.execute(ctx);
                            },
                        })));
                    }),
                );
            },
        )
        .when(isUserContextMenuCmd, ctx => {
            return mod$(CommandType.MenuUser).pipe(
                concatMap(m => {
                    return of(m.onEvent?.map(e => e.execute(
                        [ctx],
                        controller,
                    )) ?? []).pipe(map(res => ({
                        mod, res, execute() {
                            return m.execute(ctx);
                        },
                    })));
                }),
            );
        })
        .run();
}

function messageComponentInteractionHandler(
    mod: Module | undefined,
    interaction: MessageComponentInteraction,
) {

    const mod$ = <T extends CommandType>(ty: T) => of(mod).pipe(filterCorrectModule(ty));
    //Todo: refactor so that we dont have to have two separate branches. They're near identical!!
    //Only thing that differs is type of interaction
    return match(interaction)
        .when(isButton, ctx => {
            return mod$(CommandType.Button).pipe(
                concatMap(m => {
                    return of(m.onEvent?.map(e => e.execute(
                        [ctx],
                        controller,
                    )) ?? []).pipe(map(res => ({
                        mod, res, execute() {
                            return m.execute(ctx);
                        },
                    })));
                }),
            );
        })
        .when(isSelectMenu, (ctx: SelectMenuInteraction) => {
            return mod$(CommandType.MenuSelect).pipe(
                concatMap(m => {
                    return of(m.onEvent?.map(e => e.execute(
                        [ctx],
                        controller,
                    )) ?? []).pipe(map(res => ({
                        mod, res, execute() {
                            return m.execute(ctx);
                        },
                    })));
                }),
            );
        })
        .otherwise(() => throwError(() => SernError.NotSupportedInteraction));
}

export function onInteractionCreate(wrapper: Wrapper) {
    const { client } = wrapper;

    const interactionEvent$ = <Observable<Interaction>>fromEvent(client, 'interactionCreate');

    interactionEvent$
        .pipe(
            /*processing plugins*/
            concatMap(interaction => {
                if (interaction.isCommand()) {
                    const modul =
                        Files.ApplicationCommands[interaction.commandType].get(interaction.commandName) ??
                        Files.BothCommands.get(interaction.commandName);
                    return applicationCommandHandler(modul, interaction);
                }
                if (interaction.isMessageComponent()) {
                    const modul = Files
                        .MessageCompCommands[interaction.componentType]
                        .get(interaction.customId);
                    return messageComponentInteractionHandler(modul, interaction);
                } else return throwError(() => SernError.NotSupportedInteraction);
            }),
        ).subscribe({
        async next({ mod, res: eventPluginRes, execute }) {
            const ePlugArr: Result<void, void>[] = [];
            for await (const res of eventPluginRes) {
                if (isPromise(res)) {
                    ePlugArr.push(res);
                }
                ePlugArr.push(res as Awaited<Result<void, void>>);
            }
            if (ePlugArr.every(e => e.ok)) {
                await execute();
                wrapper.sernEmitter?.emit('module.activate', { success: true, module: mod! });
            } else {
                wrapper.sernEmitter?.emit('module.activate', {
                    success: false,
                    module: mod!,
                    reason: SernError.PluginFailure,
                });
            }
        },
        error(err) {
            wrapper.sernEmitter?.emit('error', err);
        },
    });
}