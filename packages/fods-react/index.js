import { useState, useEffect, useRef } from 'react';
import { isTypeOf, SOURCE_TYPE, COMPOSE_TYPE, query, getObjectHash, renew as renewSource, addListener, removeListener } from 'fods';

export function useSource(src, defaultValue) {
  if (!isTypeOf(src, SOURCE_TYPE, COMPOSE_TYPE)) {
    throw new Error('useSource only supports SOURCE_TYPE, COMPOSE_TYPE')
  }

  const [loading, setIniting] = useState(false);
  const [reloading, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [empty, setEmpty] = useState(true);
  const [data, setData] = useState(defaultValue);

  const params = useRef();
  const isMatch = (args) => getObjectHash(args) === getObjectHash(params.current);

  const init = (...args) => {
    setIniting(true);
    params.current = args;

    const defer = query(src, ...args);

    defer.then((data) => {
      if (!isMatch(args)) {
        return;
      }
      setError(null);
      setEmpty(false);
      setData(data);
    });

    defer.finally(() => {
      if (!isMatch(args)) {
        return;
      }
      setIniting(false);
    });

    defer.catch((e) => {
      if (!isMatch(args)) {
        return;
      }
      setError(e);
    });

    return defer;
  };

  const renew = (...args) => {
    setRefreshing(true);

    const defer = renewSource(src, ...args);

    defer.then((data) => {
      if (!isMatch(args)) {
        return;
      }
      setError(null);
      setEmpty(false);
      setData(data);
    });

    defer.finally(() => {
      if (!isMatch(args)) {
        return;
      }
      setRefreshing(false);
    });

    defer.catch((e) => {
      if (!isMatch(args)) {
        return;
      }
      setError(e);
    });

    return defer;
  };


  const refresh = () => {
    const args = params.current;
    if (!args) {
      return;
    }
    return renew(...args);
  }

  // react when any other place change source data
  useEffect(() => {
    const update = (args, next) => {
      if (!isMatch(args)) {
        return;
      }
      setData(next);
    };
    addListener(src, 'change', update);
    return () => removeListener(src, 'change', update);
  }, []);

  return { data, loading, empty, error, reloading, init, refresh, renew };
}
