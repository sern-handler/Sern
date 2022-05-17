import type { Awaitable, ClientEvents, CommandInteractionOptionResolver } from 'discord.js';
import type { EventEmitter } from 'events';
export type Nullish<T> = T | undefined | null;

// Thanks to @kelsny
export type ParseType<T> = {
    [K in keyof T]: T[K] extends unknown ? [k: K, args: T[K]] : never;
}[keyof T];

export type Args = ParseType<{ text: string[]; slash: SlashOptions }>;

export type DiscordEvent = ParseType<{
    [K in keyof ClientEvents]: (...args: ClientEvents[K]) => Awaitable<void>;
}>;
export type EventEmitterRegister = [
    emitter: EventEmitter,
    k: string,
    cb: (...args: unknown[]) => Awaitable<void>,
];

export type SlashOptions = Omit<CommandInteractionOptionResolver, 'getMessage' | 'getFocused'>;

// Source: https://dev.to/vborodulin/ts-how-to-override-properties-with-type-intersection-554l
export type Override<T1, T2> = Omit<T1, keyof T2> & T2;

export type DefinitelyDefined<T, K> = T & Override<T, K>;

type Reconstruct<T> = T extends Omit<infer O, infer _> ? O & Reconstruct<O> : T;

type IsOptional<T> = {
    [K in keyof T]-?: T[K] extends Required<T>[K] ? false : true;
};

export type UnionToIntersection<T> = (T extends unknown ? (x: T) => unknown : never) extends (
    x: infer R,
) => unknown
    ? R
    : never;
