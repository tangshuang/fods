export const SOURCE_TYPE: symbol;
export const ACTION_TYPE: symbol;
export const STREAM_TYPE: symbol;
export const COMPOSE_TYPE: symbol;

export interface Source<T = any, U extends any[] = any[]> {
  (...args: U): Promise<T>;
  query: (...params: U) => Promise<T>;
  request: (...args: U) => Promise<T>;
  renew: (...args: U) => Promise<T>;
  read: (...args: U) => T;
  clear: (...args: U) => void;
  readonly value: T;
  readonly params: U;
}

export interface Composition<T = any, I = any, U extends any[] = any[]> {
  (params: I[], ...args: U): Promise<T[]>;
  query: (params: I[], ...args: U) => Promise<T[]>;
  request: (params: I[], ...args: U) => Promise<T[]>;
  renew: (params: I[], ...args: U) => Promise<T[]>;
  read: (params: I[], ...args: U) => T[];
  clear: (params: I[], ...args: U) => void;
  readonly value: T[];
  readonly params: I[];
}

export interface Stream<T extends any[] = any[], U extends any[] = any[]> {
  (...params: U): (fn: (chunk: any, chunks: T) => void) => void;
  emit: (...params: U) => (fn: (chunk: any, chunks: T) => void) => void;
  request: (...args: U) => Promise<T>;
  renew: (...args: U) => Promise<T>;
  read: (...args: U) => T;
  clear: (...args: U) => void;
  readonly chunks: T;
  readonly params: U;
}

export interface Action<T = any, U extends any[] = any[]> {
  (...params: U): Promise<T>;
  take: (...params: U) => Promise<T>;
  request: (...args: U) => Promise<T>;
  readonly data: T;
  readonly params: U;
}

/**
 * define a SOURCE_TYPE store
 * @param get data getter function
 */
export declare function source<T, U extends any[]>(
  get: (...args: U) => T | Promise<T>,
): Source<T, U>;

/**
 * define a COMPOSE_TYPE store
 * @param get data list getter function
 * @param find function to find out a item from list
 */
export declare function compose<T, I, U extends any[] = any[]>(
  get: (params: I[], ...args: U) => T[] | Promise<T[]>,
  find: (ret: T[], param: I) => (T | void),
): Composition<T, I, U>;

/**
 * query data from a SOURCE_TYPE store
 * @param source
 * @param params params passed into getter function
 */
export declare function query<T, U extends any[]>(source: Source<T, U>, ...params: U): Promise<T>;
export declare function query<T, I, U extends any[]>(source: Composition<T, I, U>, params: I[], ...args: U): Promise<T[]>;

/**
 * define a ACTION_TYPE store
 * @param act
 */
export declare function action<T, U extends any[]>(act: (...args: U) => T | Promise<T>): Action<T, U>;

/**
 * run an action which is ACTION_TYPE store
 * @param source
 * @param params
 */
export declare function take<T, U extends any[]>(action: Action<T, U>, ...params: U): Promise<T>;

/**
 * define a STREAM_TYPE store
 * @param executor
 */
export declare function stream<T extends any[], U extends any[]>(
  executor: (
    ondata: (chunk: any) => void,
    onend: (chunks: T) => void,
    onerror: (err: Error) => void,
  ) => (...params: U) => void
): Stream<T, U>;

/**
 * subscribe a stream
 * @param stream
 * @param options
 */
export declare function subscribe<T extends any[], U extends any[]>(stream: Stream<T, U>, options: {
  ondata: (chunk: any) => void;
  onend: (chunks: T) => void;
  onerror: (err: Error) => void;
}): (...params: U) => void;

// -----------------

declare function renew<T, U extends any[]>(source: Source<T, U>, ...params: U): Promise<T>;
declare function renew<T, I, U extends any[]>(source: Composition<T, I, U>, params: I[], ...args: U): Promise<T[]>;
declare function renew<T extends any[], U extends any[]>(stream: Stream<T, U>, ...params: U): void;

declare function clear<T, U extends any[]>(source: Source<T, U>, ...params: U): Promise<void>;
declare function clear<T, I, U extends any[]>(source: Composition<T, I, U>, params: I[], ...args: U): Promise<void>;
declare function clear<T extends any[], U extends any[]>(stream: Stream<T, U>, ...params: U): Promise<void>;
declare function clear<T, U extends any[]>(source: Source<T, U>): Promise<void>;
declare function clear<T, I, U extends any[]>(source: Composition<T, I, U>): Promise<void>;
declare function clear<T extends any[], U extends any[]>(stream: Stream<T, U>): Promise<void>;

declare function read<T, U extends any[]>(source: Source<T, U>, ...params: U): T;
declare function read<T, I, U extends any[]>(source: Composition<T, I, U>, params: I[], ...args: U): T[];
declare function read<T extends any[], U extends any[]>(stream: Stream<T, U>, ...params: U): T;

declare function request<T, U extends any[]>(source: Source<T, U>, ...params: U): Promise<T>;
declare function request<T, I, U extends any[]>(source: Composition<T, I, U>, params: I[], ...args: U): Promise<T[]>;
declare function request<T extends any[], U extends any[]>(stream: Stream<T, U>, ...params: U): Promise<T>;
declare function request<T, U extends any[]>(action: Action<T, U>, ...params: U): Promise<T>;

type EventName = 'change' | 'beforeRenew' | 'afterRenew' | 'beforeClear' | 'afterClear';

declare function addListener<T, U extends any[]>(source: Source<T, U>, event: EventName, callback: (params: U, value?: T) => void): () => void;
declare function addListener<T, I, U extends any[]>(source: Composition<T, I, U>, event: EventName, callback: (params: [I[], ...U], value?: T[]) => void): () => void;
declare function addListener<T extends any[], U extends any[]>(stream: Stream<T, U>, event: 'data', callback: (params: U, chunk: any) => void): () => void;
declare function addListener<T extends any[], U extends any[]>(stream: Stream<T, U>, event: 'end', callback: (params: U, chunks: T) => void): () => void;
declare function addListener<T extends any[], U extends any[]>(stream: Stream<T, U>, event: 'error', callback: (params: U, error: Error) => void): () => void;
declare function removeListener<T extends any[], U extends any[]>(source: Stream<T, U>, event: 'beforeClear' | 'afterClear', callback: (params: U) => void): void;

declare function removeListener<T, U extends any[]>(source: Source<T, U>, event: EventName, callback: Function): void;
declare function removeListener<T, U>(source: Composition<T, U>, event: EventName, callback: Function): void;
declare function removeListener<T extends any[], U extends any[]>(source: Stream<T, U>, event: 'data' | 'end' | 'error' | 'beforeClear' | 'afterClear', callback: Function): void;

export { renew, clear, read, request, bind, addListener, removeListener };

export declare function isTypeOf(
  value: any,
  ...types:
    (
      | typeof SOURCE_TYPE
      | typeof ACTION_TYPE
      | typeof ACTION_TYPE
      | typeof COMPOSE_TYPE
      | typeof STREAM_TYPE
    )[]
): value is Source | Stream | Action | Composition;
