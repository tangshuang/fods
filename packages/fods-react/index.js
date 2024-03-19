import { useState, useEffect, useMemo, useRef } from 'react';
import { isTypeOf, SOURCE_TYPE, COMPOSE_TYPE, query, getObjectHash, renew, read, addListener, removeListener } from 'fods';

export function useSource(src, args = [], options = {}) {
  if (!isTypeOf(src, SOURCE_TYPE, COMPOSE_TYPE)) {
    throw new Error('useSource only supports SOURCE_TYPE, COMPOSE_TYPE')
  }

  const params = isTypeOf(COMPOSE_TYPE) ? [args] : args;

  const { default: defaultValue, immediate } = options;
  const curr = read(src, ...params);
  const hash = getObjectHash(args);
  const data = typeof curr === 'undefined' ? defaultValue : curr;

  const [initing, setIniting] = useState(false);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [empty, setEmpty] = useState(typeof curr !== 'undefined' ? false : true);

  const isInited = useRef(false);

  const [, setState] = useState({});
  const forceUpdate = () => setState({});

  const init = () => {
    setIniting(true);

    const defer = query(src, ...params);

    defer.then(() => {
      setError(null);
      forceUpdate();
      setEmpty(false);
    });

    defer.finally(() => {
      setIniting(false);
    });

    defer.catch((e) => {
      setError(e);
    });

    isInited.current = true;

    return defer;
  };

  const refresh = () => {
    setRefreshing(true);

    const defer = renew(src, ...params);

    defer.then(() => {
      setError(null);
      forceUpdate();
      setEmpty(false);
    });

    defer.finally(() => {
      setRefreshing(false);
    });

    defer.catch((e) => {
      setError(e);
    });

    return defer;
  };

  // the first time request immediately
  // only run before inited
  useMemo(() => {
    if (isInited.current) {
      return;
    }
    if (immediate === 'auto') {
      if (!args.length) {
        init();
      }
      else if (args.length && args.every(item => typeof item !== 'undefined')) {
        init();
      }
    }
    else if (immediate) {
      init();
    }
  }, [src, hash]);

  // when src, args changed, and first query called, re-query data automaticly
  // only run after inited
  useEffect(() => {
    if (isInited.current) {
      init();
    }
  }, [src, hash]);

  // react when any other place change source data
  useEffect(() => {
    const update = (params) => {
      const h = getObjectHash(params);
      if (h === hash) {
        forceUpdate();
      }
    };
    addListener(src, 'change', update);
    return () => removeListener(src, 'change', update);
  }, [src, hash]);

  return { data, initing, empty, error, refreshing, init, refresh };
}
