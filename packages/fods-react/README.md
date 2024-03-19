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
  const { data } = useSource(SomeSource, [id], {
    default: { id },
    immediate: true,
  });

  return <div>{data.id} {data.name}</div>
}
```

Firstly, you should use `fods` to define sources. Then use these sources into `useSource`.
Notice: only SOURCE_TYPE, COMPOSE_TYPE supported now.

## API

```
useSource<T, U extends any[]>(source: Source<T, U>, params?: U, options?: {
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
}
```

- source: the source object defined by `fods`
- params: request params to pass into query
- options:
  - default: before inited, what to be as data
  - immediate: wheather to send request when the component mounted
- data: the data of source with the given params
- initing: before the first query attached to local, when `init` is invoked, it will be `true`
- empty: before the first query, wheather the data is empty
- refreshing: when `refresh` is invoked, it will be `true`
- error: when some errors occur during `init` or `refresh`, it will be an Error
- init: first query data
- refresh: refresh the data

*If the source is COMPOSE_TYPE, the params should be an array passed into `compose` directly.*

When we use a source in a component, we may change the params, it will react when params changed.

```js
function App() {
  const [state, setState] = useState(0);
  useEffect(() => {
    setState(1); // --> change id to 1 will trigger init with new params, however empty will not reset to `false`
  }, []);
  return <MyComponent id={state} />
}
```

In sometimes, we want it to request data after some state is ready, we should use `init`, before we invoke `init`, the data is empty:

```js
const [state, setState] = useState()
const { data, init } = useSource(source, [state]);

useEffect(() => {
  if (state) {
    init();
  }
}, [state]);
```

In sometimes, we want it to request at the same time component mounted, we can give a `immediate` option to let it request automaticly:

```js
const { data } = useSource(source, [1], { immediate: true });
```

However, in this situation, we should pass a certain params list, if we want to pass dynamic params, we should set `immediate` to be `auto`:

```js
export function MyComponent(id) {
  const { data } = useSource(source, [id], { immediate: 'auto' });
}
```

Here, when `id` is undefined, the first query will not be sent. When `id` changes to be a real value, the first query will be sent then.
