# fods-react

Use fods in react component.

```
npm i fods fods-react
```

## Usage

```js
import { useSource } from 'fods-react';
import { SomeSource } from './datasources';

export function MyComponent(id) {
  const { data, init } = useSource(SomeSource, { id, name: '' });

  useEffect(() => {
    if (id) {
      init(id);
    }
  }, [id]);

  return <div>{data.id} {data.name}</div>
}
```

Firstly, you should use `fods` to define sources. Then use these sources into `useSource`.
Notice: only SOURCE_TYPE, COMPOSE_TYPE supported now.

## API

```ts
function useSource<T, U extends any[]>(source: Source<T, U>, defaultValue: T): {
  data: T;
  initing: boolean;
  empty: boolean;
  refreshing: boolean;
  error: Error | null;
  init: (...params: U) => Promise<T>;
  refresh: () => Promise<T>;
}
```

- source: the source object defined by `fods`
- default: before inited, what to be as data
- data: the data of source with the given params
- initing: before the first query attached to local, when `init` is invoked, it will be `true`
- empty: before the first query, wheather the data is empty
- refreshing: when `refresh` is invoked, it will be `true`
- error: when some errors occur during `init` or `refresh`, it will be an Error
- init: first query data
  - params: request params to pass into query
- refresh: refresh the data with the same params of `init`
- renew: refresh the data with certain params, different from params of `init`
