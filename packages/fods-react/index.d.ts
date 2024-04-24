import { Source, Composition } from 'fods';

declare function useSource<T, U extends any[]>(source: Source<T, U>, defaultValue?: T): {
  data: T;
  loading: boolean;
  empty: boolean;
  reloading: boolean;
  error: Error | null;
  init: (...params: U) => Promise<T>;
  refresh: () => Promise<T>;
};

declare function useSource<T, U>(source: Composition<T, U>, defaultValue?: T[]): {
  data: T[];
  loading: boolean;
  empty: boolean;
  reloading: boolean;
  error: Error | null;
  init: (params: U[]) => Promise<T[]>;
  refresh: () => Promise<T[]>;
};

export { useSource };
