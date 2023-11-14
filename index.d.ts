export const SOURCE_TYPE = Symbol('source') as const;
export const ACTION_TYPE = Symbol('action') as const;
export const STREAM_TYPE = Symbol('stream') as const;
export const COMPOSE_TYPE = Symbol('compose') as const;

export interface Source<T = any, U = any[] | void> {
  (...args: U): Promise<T>;
  readonly value: T;
  readonly params: U;
}

export interface Stream<T = any[], U = any[] | void> {
  readonly chunks: T;
  readonly params: U;
}

export interface Action<T = any, U = any[] | void> {
  readonly data: T;
  readonly params: U;
}

/**
 * define a SOURCE_TYPE store
 * @param get data getter function
 */
export declare function source<T, U extends any[] = any[]>(get: (...args: U) => T | Promise<T>): Source<T, U>;

/**
 * query data from a SOURCE_TYPE store
 * @param source
 * @param params params passed into getter function
 */
export declare function query<T, U extends any[]>(source: Source<T, U>, ...params: U): Promise<T>;

/**
 * define a ACTION_TYPE store
 * @param act
 */
export declare function action<T, U extends any[] = any[]>(act: (...args: U) => T | Promise<T>): Action<T, U>;

/**
 * run the action from a ACTION_TYPE store
 * @param source
 * @param params
 */
export declare function submit<T, U extends any[]>(action: Action<T, U>, ...params: U): Promise<T>;

/**
 * define a STREAM_TYPE store
 * @param executor
 */
export declare function stream<T = any, U extends any[] = any[]>(
  executor:
    (dispatch: (chunk: any) => void, defineStop: (stop: Function) => void) => (...params: U) => void
): Stream<T, U>;

/**
 * emit a stream
 * @param stream
 * @param params
 */
export declare function emit<T, U extends any[]>(stream: Stream<T, U>, ...params: U): (fn: (chunk: any, chunks: T) => void) => void;

declare function renew<T, U extends any[]>(source: Source<T, U>, ...params: U): Promise<T>;
declare function renew<T, U extends any[]>(stream: Stream<T, U>, ...params: U): (fn: (chunk: any, chunks: T) => void) => void;

declare function clear<T, U extends any[]>(source: Source<T, U>, ...params?: U): void;
declare function clear<T, U extends any[]>(stream: Stream<T, U>, ...params?: U): void;
declare function clear<T, U extends any[]>(source: Source<T, U>): void;
declare function clear<T, U extends any[]>(stream: Stream<T, U>): void;

declare function read<T, U extends any[]>(source: Source<T, U>, ...params?: U): T;
declare function read<T, U extends any[]>(stream: Stream<T, U>, ...params?: U): T;

declare function request<T, U extends any[]>(source: Source<T, U>, ...params?: U): Promise<T>;
declare function request<T, U extends any[]>(stream: Stream<T, U>, ...params: U): (fn: (chunk: any, chunks: T) => void) => void;
declare function request<T, U extends any[]>(action: Action<T, U>, ...params?: U): Promise<T>;

declare function addListener<T, U extends any[]>(source: Source<T, U>, listener: (params: U, value: T) => void): void;
declare function addListener<T, U extends any[]>(stream: Stream<T, U>, listener: (params: U, chunk: any, chunks: T) => void): void;

declare function removeListener<T, U extends any[]>(source: Source<T, U>, listener: (params: U, value: T) => void): void;
declare function removeListener<T, U extends any[]>(stream: Stream<T, U>, listener: (params: U, chunk: any, chunks: T) => void): void;

export { renew, clear, read, request, addListener, removeListener };

export declare function isTypeOf(
  value: any,
  ...types:
    | typeof SOURCE_TYPE
    | typeof ACTION_TYPE
    | typeof ACTION_TYPE
    | typeof COMPOSE_TYPE
): value is Source | Stream | Action;

export declare function compose<T = any, U = any>(
  get: (...args: U[]) => T[] | Promise<T[]>,
  find: (ret: T[], param: U) => T,
): Source<T[], U[]>;
