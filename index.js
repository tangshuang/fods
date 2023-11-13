import { getObjectHash } from 'ts-fns';

export const SOURCE_TYPE = Symbol('source');
export const ACTION_TYPE = Symbol('action');
export const STREAM_TYPE = Symbol('stream');

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

export function source(get) {
  return {
    type: SOURCE_TYPE,
    get,
    atoms: [],
    event: new Event(),
  };
}

export function action(act) {
  const cache = {};
  const fn = (...args) => {
    const hash = getObjectHash(args);
    if (cache[hash]) {
      return cache[hash];
    }

    cache[hash] = Promise.resolve(act(...args)).finally(() => {
      cache[hash] = null;
    });
    return cache[hash];
  };
  return {
    type: ACTION_TYPE,
    atoms: [],
    act: fn,
  };
}

export function stream(executor) {
  return {
    type: STREAM_TYPE,
    executor,
    atoms: [],
    event: new Event(),
  };
}

export function query(source, ...params) {
  const { type, atoms, get, event } = source;

  if (type !== SOURCE_TYPE) {
    throw new Error('query can only invoke SOURCE_TYPE');
  }

  const hash = getObjectHash(params);
  const atom = atoms.find(item => item.hash === hash);

  if (atom) {
    return atom.defer;
  }

  const item = {
    hash,
  };
  const renew = () => Promise.resolve().then(() => get(...params)).then((value) => {
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

export function emit(source, ...params) {
  const { type, atoms, executor, event } = source;

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

export function submit(source, ...params) {
  const { type, act, atoms } = source;

  if (type !== ACTION_TYPE) {
    throw new Error('submit can only invoke ACTION_TYPE');
  }

  const hash = getObjectHash(params);
  const atom = atoms.find(item => item.hash === hash);

  if (atom) {
    return atom.defer;
  }

  const item = {
    hash,
  };

  const defer = Promise.resolve().then(() => act(...params)).finally(() => {
    const index = atoms.indexOf(item);
    if (index > -1) {
      atoms.splice(index, 1);
    }
  });
  item.defer = defer;
  atoms.push(item);
  return defer;
}

export function renew(source, ...params) {
  const { type, atoms } = source;

  if (![SOURCE_TYPE, STREAM_TYPE].includes(type)) {
    throw new Error('renew can only invoke SOURCE_TYPE and STREAM_TYPE');
  }

  const hash = getObjectHash(params);
  const atom = atoms.find(item => item.hash === hash);

  if (!atom) {
    if (type === SOURCE_TYPE) {
      return query(source, ...params);
    }
    else {
      return emit(source, ...params);
    }
  }

  return atom.renew();
}

export function clear(source, ...params) {
  const { type, atoms } = source;

  if (![SOURCE_TYPE, STREAM_TYPE].includes(type)) {
    throw new Error('clear can only invoke SOURCE_TYPE and STREAM_TYPE');
  }

  // release all local atoms
  if (!params.length) {
    atoms.length = 0;
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

export function read(source, ...params) {
  const { type, atoms } = source;

  if (![SOURCE_TYPE, STREAM_TYPE].includes(type)) {
    throw new Error('read can only invoke SOURCE_TYPE and STREAM_TYPE');
  }

  const hash = getObjectHash(params)
  const atom = atoms.find(item => item.hash === hash)

  if (atom) {
    return type === SOURCE_TYPE ? atom.value : atom.chunks;
  }
}

export function request(source, ...params) {
  const { type } = source

  if (type === ACTION_TYPE) {
    return Promise.resolve(source.act(...params))
  }

  if (type === SOURCE_TYPE) {
    return Promise.resolve(source.get(...params))
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
      const execute = source.executor(dispatch);
      execute(...params);
    }, 0);
    return subscribe;
  }
}

export function addListener(source, fn) {
  const { type, event } = source;

  if (![SOURCE_TYPE, STREAM_TYPE].includes(type)) {
    throw new Error('addEventListener can only invoke SOURCE_TYPE and STREAM_TYPE');
  }

  event.on(fn);

  return () => event.off(fn);
}

export function removeListener(source, fn) {
  const { type, event } = source;

  if (![SOURCE_TYPE, STREAM_TYPE].includes(type)) {
    throw new Error('removeEventListener can only invoke SOURCE_TYPE and STREAM_TYPE');
  }

  event.off(fn);
}

export function apply(get) {
  function qry(...params) {
    return query(qry, ...params);
  }
  const src = source(get);
  Object.assign(qry, src);
  return qry;
}
