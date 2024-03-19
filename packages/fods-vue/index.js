import { ref, onMounted, onUnmounted, shallowRef } from 'vue';
import { isTypeOf, SOURCE_TYPE, COMPOSE_TYPE, query, getObjectHash, renew, addListener, removeListener } from 'fods';

export function useSource(src, defaultValue) {
  if (!isTypeOf(src, SOURCE_TYPE, COMPOSE_TYPE)) {
    throw new Error('useSource only supports SOURCE_TYPE, COMPOSE_TYPE')
  }

  const initing = ref(false);
  const refreshing = ref(false);
  const error = ref(null);
  const empty = ref(true);
  const data = shallowRef(defaultValue);

  const params = ref();
  const isMatch = (args) => getObjectHash(args) === getObjectHash(params.value);

  const init = (...args) => {
    initing.value = true;
    params.value = args;

    const defer = query(src, ...args);

    defer.then((res) => {
      if (!isMatch(args)) {
        return;
      }
      error.value = null;
      empty.value = false;
      data.value = res;
    });

    defer.finally(() => {
      if (!isMatch(args)) {
        return;
      }
      initing.value = false;
    });

    defer.catch((e) => {
      if (!isMatch(args)) {
        return;
      }
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
      if (!isMatch(args)) {
        return;
      }
      error.value = null;
      empty.value = false;
      data.value = res;
    });

    defer.finally(() => {
      if (!isMatch(args)) {
        return;
      }
      refreshing.value = false;
    });

    defer.catch((e) => {
      if (!isMatch(args)) {
        return;
      }
      error.value = e;
    });

    return defer;
  };

  const update = (args, next) => {
    if (!isMatch(args)) {
      return;
    }
    data.value = next;
  };

  onMounted(() => {
    addListener(src, 'change', update);
  });

  onUnmounted(() => {
    removeListener(src, 'change', update);
  });

  return { data, initing, empty, error, refreshing, init, refresh };
}
