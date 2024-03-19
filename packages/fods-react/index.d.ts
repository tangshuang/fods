import { Source, Composition } from 'fods';

declare function useSource<T, U extends any[]>(source: Source<T, U>, params?: U, options?: {
  default: T;
  immediate: boolean | 'auto';
}): {
  data: T;
  initing: boolean;
  empty: boolean;
  refreshing: boolean;
  error: Error | null;
  init: () => Promise<T>;
  refresh: () => Promise<T>;
};

declare function useSource<T, U>(source: Composition<T, U>, params?: U[], options?: {
  default: T[];
  immediate: boolean | 'auto';
}): {
  data: T[];
  initing: boolean;
  empty: boolean;
  refreshing: boolean;
  error: Error | null;
  init: () => Promise<T[]>;
  refresh: () => Promise<T[]>;
};

export { useSource };
