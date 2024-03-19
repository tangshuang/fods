import { ref, onMounted, onUnmounted } from 'vue';
import { isTypeOf, SOURCE_TYPE, COMPOSE_TYPE, query, getObjectHash, renew, addListener, removeListener } from 'fods';

export function useSource(src) {
  if (!isTypeOf(src, SOURCE_TYPE, COMPOSE_TYPE)) {
    throw new Error('useSource only supports SOURCE_TYPE, COMPOSE_TYPE')
  }

  const data = ref();
  const initing = ref(false);
  const empty = ref(true);
  const error = ref(null);
  const refreshing = ref(false);
  const params = ref();

  const init = (...args) => {
    initing.value = true;
    params.value = args;

    const defer = query(src, ...args);

    defer.then((res) => {
      error.value = null;
      empty.value = false;
      data.value = res;
    });

    defer.finally(() => {
      initing.value = false;
    });

    defer.catch((e) => {
      error.value = e;
    });

    return defer;
  };

  const refresh = () => {
    const args = params.value;
    if (!args) {
      throw new Error(`You should must invoke init firstly.`);
    }

    refreshing.value = true;

    const defer = renew(src, ...args);

    defer.then((res) => {
      error.value = null;
      empty.value = false;
      data.value = res;
    });

    defer.finally(() => {
      refreshing.value = false;
    });

    defer.catch((e) => {
      error.value = e;
    });

    return defer;
  };

  const update = (args, next) => {
    if (getObjectHash(args) === getObjectHash(params.value)) {
      data.value = next;
    }
  };

  onMounted(() => {
    addListener(src, 'change', update);
  });

  onUnmounted(() => {
    removeListener(src, 'change', update);
  });

  return { data, initing, empty, error, refreshing, init, refresh };
}
