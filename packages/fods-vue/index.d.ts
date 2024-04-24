import { Source, Composition } from 'fods';
import { Ref } from 'vue';

declare function useSource<T, U extends any[]>(source: Source<T, U>, defaultValue?: T): {
  data: Ref<T>;
  loading: Ref<boolean>;
  empty: Ref<boolean>;
  reloading: Ref<boolean>;
  error: Ref<Error | null>;
  init: (...params: U) => Promise<T>;
  refresh: () => Promise<T>;
}

declare function useSource<T, U>(source: Composition<T, U>, defaultValue?: T[]): {
  data: Ref<T[]>;
  loading: Ref<boolean>;
  empty: Ref<boolean>;
  reloading: Ref<boolean>;
  error: Ref<Error | null>;
  init: (params: U[]) => Promise<T[]>;
  refresh: () => Promise<T[]>;
};

export { useSource };
