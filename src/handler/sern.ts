import type {
    DiscordEvent,
} from '../types/handler';

import {
    ApplicationCommandType,
    Client,
} from 'discord.js';

import type Wrapper from './structures/wrapper';
import { fromEvent } from 'rxjs';
import { SernError } from './structures/errors';
import { onReady } from './events/readyEvent';
import { onMessageCreate } from './events/messageEvent';
import { onInteractionCreate } from './events/interactionCreate';
import { match } from 'ts-pattern';
import { P } from 'ts-pattern';
import { Sern } from '..';

export function init( wrapper : Wrapper ) {
   const { events, client } = wrapper; 
   if (events !== undefined) eventObserver(client, events);
   onReady( wrapper );
   onMessageCreate( wrapper );
   onInteractionCreate ( wrapper ); 
}

//TODO : Add event listener for any other generic node js event emitter
function eventObserver(client: Client, events: DiscordEvent[] ) {
  events.forEach( ( [event, cb] ) => {
      if (event === 'ready') throw Error(SernError.ReservedEvent);
      fromEvent(client, event, cb).subscribe();
  });
}

/**
 * @enum { number };
 */
export enum CommandType {
    Text  =      0b0000001,
    Slash =      0b0000010,
    MenuUser =   0b0000100,
    MenuMsg =    0b0001000,
    Button =     0b0010000,
    MenuSelect = 0b0100000,
    Both  =      0b0000011,
}

export function cmdTypeToDjs(ty: CommandType) {
   return match(ty)  
      .with(CommandType.Slash, () => ApplicationCommandType.ChatInput)
      .with(CommandType.MenuUser, () => ApplicationCommandType.User)
      .with(CommandType.MenuMsg, ()=> ApplicationCommandType.Message)
      .with(CommandType.Both, () => ApplicationCommandType.ChatInput )
      .with(P._, () => { throw new Error(SernError.NonValidModuleType) })
      .exhaustive()
}


