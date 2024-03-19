# fods-vue

Use fods in Vue component.

```
npm i fods fods-vue
```

## Usage

```html
<script setup>
  import { useSource } from 'fods-vue';
  import { SomeSource } from './datasources';
  import { watch } from 'vue';

  const props = defineProps({ id: String });

  const { data, initing, empty, error, refreshing, init, refresh } = useSource(SomeSource);

  watch(
    () => props.id,
    () => props.id && init(props.id),
    { immediate: true },
  );
</script>

<template>
  <div>{{ data.id }} {{ data.name }}</div>
  <button @click="refresh" :disabled="refreshing || initing">refresh</button>
</template>
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
