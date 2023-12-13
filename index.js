import { getObjectHash } from 'ts-fns';

export const SOURCE_TYPE = Symbol('source');
export const ACTION_TYPE = Symbol('action');
export const STREAM_TYPE = Symbol('stream');
export const COMPOSE_TYPE = Symbol('compose');

function Event() {
  this.events = [];
}
Event.prototype.on = function(fn) {
  this.events.push(fn);
}
Event.prototype.off = function(fn) {
  this.events.forEach((item, i, items) => {
    if (item.fn === fn) {
      items.splice(i, 1);
    }
  });
}
Event.prototype.emit = function(params, ...args) {
  this.events.forEach((fn) => {
    fn(params, ...args);
  });
}

function assign(fn, src, mapping) {
  Object.assign(fn, src);

  if (!mapping) {
    return;
  }

  const keys = Object.keys(mapping);
  keys.forEach((key) => {
    const value = mapping(key);
    fn[key] = (...params) => {
      return value(fn, ...params);
    };
  });
}

export function source(get) {
  const src = {
    type: SOURCE_TYPE,
    get,
    atoms: [],
    event: new Event(),
  };

  function qry(...params) {
    return query(qry, ...params);
  }

  assign(qry, src, {
    query,
    renew,
    request,
    read,
    clear,
  });

  return qry;
}

export function compose(get, find) {
  const src = {
    type: COMPOSE_TYPE,
    event: new Event(),
    get,
    find,
    cache: {},
    queue: [],
    defers: {},
  };

  function qry(...params) {
    return query(qry, ...params);
  }

  assign(qry, src, {
    query,
    renew,
    request,
    read,
    clear,
  });

  return qry;
}

export function action(act) {
  const cache = {};
  const fn = (...args) => {
    const hash = getObjectHash(args);
    if (cache[hash]) {
      return cache[hash];
    }

    cache[hash] = Promise.resolve(act(...args)).finally(() => {
      delete cache[hash];
    });
    return cache[hash];
  };
  const src = {
    type: ACTION_TYPE,
    atoms: [],
    act: fn,
  };

  function run(...params) {
    return take(run, ...params);
  }

  assign(qry, src, {
    take,
    request,
  });

  return run;
}

export function stream(executor) {
  const src = {
    type: STREAM_TYPE,
    executor,
    atoms: [],
    event: new Event(),
  };

  function emt(...params) {
    return emit(emt, ...params);
  }

  assign(emt, src, {
    emit,
    renew,
    request,
    read,
    clear,
  });

  return emt;
}

export function query(src, ...params) {
  const { type } = src;

  if (type === SOURCE_TYPE) {
    const { atoms, get, event } = src;
    const hash = getObjectHash(params);
    const atom = atoms.find(item => item.hash === hash);

    if (atom) {
      return atom.defer;
    }

    const item = {
      hash,
    };
    const renew = () => Promise.resolve(get(...params)).then((value) => {
      item.value = value;
      item.defer = Promise.resolve(value);
      event.emit(params, value);
      return value;
    });
    const defer = renew();
    item.renew = renew;
    item.defer = defer;

    atoms.push(item)

    return defer;
  }
  else if (type === COMPOSE_TYPE) {
    const { cache, get, find, event, defers, queue } = src;

    const hashMap = params.map(param => getObjectHash([param]));
    const filteredParams = params.filter((_, i) => !(hashMap[i] in cache));

    // all cahced
    if (!filteredParams.length) {
      const output = hashMap.map(hash => cache[hash]);
      return Promise.resolve(output);
    }

    queue.push(...filteredParams);

    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // queue has been cleaned
        if (!queue.length) {
          const qlist = hashMap.map((hash) => {
            if (defers[hash]) {
              return defers[hash];
            }
            return Promise.resolve(cache[hash]);
          });
          Promise.all(qlist).then(() => {
            const res = hashMap.map(hash => cache[hash]);
            return res;
          }).then(resolve, reject);
          return;
        }

        const pendingList = [];
        const queueParams = [...queue];
        const queueHashMap = queueParams.map(param => getObjectHash([param]));

        // clear queue
        queue.length = 0;

        queueHashMap.forEach((hash) => {
          if (defers[hash]) {
            pendingList.push(defers[hash]);
            // remove those in pending
            queueParams.splice(i, 1);
            queueHashMap.splice(i, 1);
          }
        });

        const newRequest = Promise.resolve(get(...queueParams)).then((ret) => {
          queueParams.forEach((param, i) => {
            // support param as a string, for example: res['xxxxxxx']
            const value = find(ret, param);
            const hash = queueHashMap[i];
            cache[hash] = value;
            delete defers[hash];
          });
        });

        queueHashMap.forEach((hash) => {
          defers[hash] = newRequest;
        });

        Promise.all([
          newRequest,
          ...pendingList,
        ]).then(() => {
          const res = hashMap.map(hash => cache[hash]);
          event.emit(params, res);
          return res;
        }).then(resolve, reject);
      }, 64);
    });
  }

  throw new Error('query can only invoke SOURCE_TYPE, COMPOSE_TYPE');
}

export function emit(src, ...params) {
  const { type, atoms, executor, event } = src;

  if (type !== STREAM_TYPE) {
    throw new Error('emit can only invoke STREAM_TYPE');
  }

  const hash = getObjectHash(params);
  const atom = atoms.find(item => item.hash === hash);

  if (atom) {
    const subscribe = (callback) => {
      atom.chunks.forEach((chunk) => {
        callback(chunk, atom.chunks);
      });
      // if stream is not ended, callback will be invoked when come to next emit
      atom.subscribe(callback);
    };
    return subscribe;
  }

  const chunks = [];
  const consumers = [];
  const subscribe = (callback) => {
    consumers.push(callback);
  };
  const dispatch = (chunk) => {
    chunks.push(chunk);
    consumers.forEach((callback) => {
      callback(chunk, chunks);
    });
    event.emit(params, chunk, chunks);
  };
  let stop = null;
  const defineStop = (stopStream) => {
     stop = stopStream;
  };

  const renew = () => {
    stop?.();
    chunks.length = 0;
    consumers.length = 0;
    setTimeout(() => {
      // TODO support end manully
      const execute = executor(dispatch, defineStop);
      execute(...params);
    }, 0);
    return subscribe;
  };
  const item = {
    hash,
    subscribe,
    chunks,
    renew,
  };
  atoms.push(item);

  renew();
  return subscribe;
}

export function take(src, ...params) {
  const { type, act, atoms } = src;

  if (type !== ACTION_TYPE) {
    throw new Error('take can only invoke ACTION_TYPE');
  }

  const hash = getObjectHash(params);
  const atom = atoms.find(item => item.hash === hash);

  if (atom) {
    return atom.defer;
  }

  const item = {
    hash,
  };

  const defer = Promise.resolve(act(...params)).finally(() => {
    const index = atoms.indexOf(item);
    if (index > -1) {
      atoms.splice(index, 1);
    }
  });
  item.defer = defer;
  atoms.push(item);
  return defer;
}

export function renew(src, ...params) {
  const { type } = src;

  if (![SOURCE_TYPE, STREAM_TYPE, COMPOSE_TYPE].includes(type)) {
    throw new Error('renew can only invoke SOURCE_TYPE, STREAM_TYPE, COMPOSE_TYPE');
  }

  if (type === COMPOSE_TYPE) {
    const { cache } = src;
    const hashMap = params.map(param => getObjectHash([param]));
    params.forEach((_, i) => {
      delete cache[hashMap[i]];
    });
    return query(src, ...params);
  }

  const { atoms } = src;
  const hash = getObjectHash(params);
  const atom = atoms.find(item => item.hash === hash);

  if (!atom) {
    if (type === SOURCE_TYPE) {
      return query(src, ...params);
    }
    else {
      return emit(src, ...params);
    }
  }

  return atom.renew();
}

export function clear(src, ...params) {
  const { type, atoms } = src;

  if (![SOURCE_TYPE, STREAM_TYPE, COMPOSE_TYPE].includes(type)) {
    throw new Error('clear can only invoke SOURCE_TYPE, STREAM_TYPE, COMPOSE_TYPE');
  }

  // release all local atoms
  if (!params.length) {
    if (type === COMPOSE_TYPE) {
      src.cache = {};
    }
    else {
      atoms.length = 0;
    }
    return;
  }

  if (type === COMPOSE_TYPE) {
    const { cache } = src;
    const hashMap = params.map(param => getObjectHash([param]));
    params.forEach((_, i) => {
      delete cache[hashMap[i]];
    });
    return;
  }

  // release given params relative atom
  const hash = getObjectHash(params);
  const index = atoms.findIndex(item => item.hash === hash);
  if (index > -1) {
    atoms.splice(index, 1);
  }
}

export function isTypeOf(source, ...types) {
  return source && types.includes(source.type);
}

export function read(src, ...params) {
  const { type } = src;

  if (![SOURCE_TYPE, STREAM_TYPE, COMPOSE_TYPE].includes(type)) {
    throw new Error('read can only invoke SOURCE_TYPE, STREAM_TYPE, COMPOSE_TYPE');
  }

  if (type === COMPOSE_TYPE) {
    const { cache } = src;
    const hashMap = params.map(param => getObjectHash([param]));
    const out = params.map((_, i) => cache[hashMap[i]]);
    return out;
  }

  const { atoms } = src;
  const hash = getObjectHash(params)
  const atom = atoms.find(item => item.hash === hash)

  if (atom) {
    return type === SOURCE_TYPE ? atom.value : atom.chunks;
  }
}

export function request(src, ...params) {
  const { type } = src

  if (type === ACTION_TYPE) {
    return Promise.resolve(src.act(...params));
  }

  if (type === SOURCE_TYPE || type === COMPOSE_TYPE) {
    return Promise.resolve(src.get(...params));
  }

  if (type === STREAM_TYPE) {
    const consumers = [];
    const chunks = [];
    const subscribe = (callback) => {
      consumers.push(callback);
    };
    const dispatch = (chunk) => {
      chunks.push(chunk);
      consumers.forEach((callback) => {
        callback(chunk, chunks);
      });
    };

    setTimeout(() => {
      // TODO support end manully
      const execute = src.executor(dispatch);
      execute(...params);
    }, 0);
    return subscribe;
  }
}

export function addListener(src, fn) {
  const { type, event } = src;

  if (![SOURCE_TYPE, STREAM_TYPE, COMPOSE_TYPE].includes(type)) {
    throw new Error('addEventListener can only invoke SOURCE_TYPE, STREAM_TYPE, COMPOSE_TYPE');
  }

  event.on(fn);

  return () => event.off(fn);
}

export function removeListener(src, fn) {
  const { type, event } = src;

  if (![SOURCE_TYPE, STREAM_TYPE, COMPOSE_TYPE].includes(type)) {
    throw new Error('removeEventListener can only invoke SOURCE_TYPE, STREAM_TYPE, COMPOSE_TYPE');
  }

  event.off(fn);
}
