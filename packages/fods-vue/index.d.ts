import { Source, Composition } from 'fods';

declare function useSource<T, U extends any[]>(source: Source<T, U>): {
  data: T;
  initing: boolean;
  empty: boolean;
  refreshing: boolean;
  error: Error | null;
  init: (...params: U) => Promise<T>;
  refresh: () => Promise<T>;
}

declare function useSource<T, U>(source: Composition<T, U>): {
  data: T[];
  initing: boolean;
  empty: boolean;
  refreshing: boolean;
  error: Error | null;
  init: (...params: U[]) => Promise<T[]>;
  refresh: () => Promise<T[]>;
};

export { useSource };
