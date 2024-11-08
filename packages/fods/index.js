export const SOURCE_TYPE = Symbol('source');
export const ACTION_TYPE = Symbol('action');
export const STREAM_TYPE = Symbol('stream');
export const COMPOSE_TYPE = Symbol('compose');

function Event() {
  this.events = [];
}
Event.prototype.on = function(e, fn) {
  this.events.push({ e, fn });
}
Event.prototype.off = function(e, fn) {
  this.events.forEach((item, i, items) => {
    if (item.e === e && item.fn === fn) {
      items.splice(i, 1);
    }
  });
}
Event.prototype.emit = function(e, ...args) {
  return Promise.all(
    this.events.map((item) =>
      Promise.resolve().then(() => {
        if (item.e === e) {
          return item.fn(...args);
        }
      })
    )
  );
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
    act,
    fn,
  };

  function run(...params) {
    return take(run, ...params);
  }

  assign(run, src, {
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

  function sub(options) {
    return subscribe(sub, options);
  }

  assign(sub, src, {
    subscribe,
    renew,
    request,
    read,
    clear,
  });

  return sub;
}

// ---

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

    const renew = () => Promise.resolve()
      .then(() => get(...params))
      .then((value) => {
        item.value = deepFreeze(value);
        item.defer = Promise.resolve(value);
        event.emit('change', params, value);
        return value;
      });

    const defer = renew();

    item.renew = renew;
    item.defer = defer;
    atoms.push(item);

    // remove item when error
    defer.catch(() => {
      atoms.splice(atoms.indexOf(item), 1);
    });

    return defer;
  }
  else if (type === COMPOSE_TYPE) {
    const { cache, get, find, event, defers, queue } = src;

    // should must be an array to map to params
    const [args, ...others] = params;

    const paramKeyList = [];

    const pendingParamList = [];
    const group = getObjectHash(others);
    let cachedCount = 0;

    args.forEach((param) => {
      const hash = getObjectHash(param);
      const key = `${group}.${hash}`;
      const cached = key in cache;

      paramKeyList.push(key);

      if (cached) {
        cachedCount ++;
      }
      else {
        pendingParamList.push({
          param,
          others,
          group,
          key,
        });
      }
    });

    // all cahced
    if (cachedCount === args.length) {
      const output = paramKeyList.map(key => cache[key]);
      return Promise.resolve(output);
    }

    // push into queue to wait to be used
    pendingParamList.forEach((item) => {
      const { key } = item;
      const exists = queue[key];
      if (!exists) {
        queue[key] = item;
      }
    });

    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const { queue } = src;
        const keys = Object.keys(queue);

        // queue has been cleaned
        if (!keys.length) {
          Promise.all(paramKeyList.filter(key => defers[key]).map(key => defers[key])).then(() => {
            const res = paramKeyList.map(key => cache[key]);
            return res;
          }).then(resolve, reject);
          return;
        }

        // clear queue
        src.queue = {};

        const pendingList = [];
        const groupList = [];

        keys.forEach((key) => {
          if (defers[key]) {
            pendingList.push(defers[key]);
            return;
          }

          const item = queue[key];
          const { group, others } = item;
          const exists = groupList.find(item => item.hash === group);
          if (exists) {
            exists.items.push(item);
          }
          else {
            groupList.push({
              hash: group,
              others,
              items: [item],
            });
          }
        });

        groupList.forEach((group) => {
          const { others, items } = group;
          const params = items.map(item => item.param);

          const request = Promise.resolve()
            .then(() => get(params, ...others))
            .then((ret) => {
              // make sure the find function will receive non-null item
              const res = ret.filter(item => typeof item !== 'undefined');
              items.forEach((item) => {
                const value = find(res, item.param);
                const key = item.key;
                cache[key] = deepFreeze(value);
                delete defers[key];
              });
            });

          items.forEach((item) => {
            defers[item.key] = request;
          });

          // remove item when error
          request.catch(() => {
            items.forEach((item) => {
              delete defers[item.key];
            });
          });

          pendingList.push(request);
        });

        Promise.all(pendingList).then(() => {
          const res = paramKeyList.map(key => cache[key]);
          event.emit('change', params, res);
          return res;
        }).then(resolve, reject);
      }, 64);
    });
  }

  throw new Error('query can only invoke SOURCE_TYPE, COMPOSE_TYPE');
}

export function subscribe(src, {
  ondata,
  onend,
  onerror,
}) {
  const { type, atoms, executor, event } = src;

  if (type !== STREAM_TYPE) {
    throw new Error('subscribe can only invoke STREAM_TYPE');
  }

  return (...params) => {
    const hash = getObjectHash(params);
    const atom = atoms.find(item => item.hash === hash);

    if (atom?.chunks) {
      // run async
      setTimeout(() => {
        const chunks = atom.chunks;
        chunks.forEach((chunk) => {
          ondata?.(chunk);
          event.emit('data', params, chunk);
        });
        onend?.(chunks);
        event.emit('end', params, chunks);
      }, 0);
      return;
    }

    const item = {
      hash,
    };
    atoms.push(item);

    const renew = () => {
      const chunks = [];
      const execute = executor({
        ondata: (chunk) => {
          chunks.push(chunk);
          ondata?.(chunk);
          event.emit('data', params, chunk);
        },
        onend: () => {
          onend?.(chunks);
          // only patch chunks after successfully
          item.chunks = deepFreeze(chunks);
          event.emit('end', params, chunks);
        },
        onerror: (e) => {
          onerror?.(e);
          event.emit('error', params, e);
        },
      });
      execute(...params);
    };
    item.renew = renew;
    renew();
  };
}

export function take(src, ...params) {
  const { type, fn, atoms } = src;

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

  const defer = Promise.resolve(fn(...params)).finally(() => {
    const index = atoms.indexOf(item);
    if (index > -1) {
      atoms.splice(index, 1);
    }
  });
  item.defer = defer;
  atoms.push(item);
  return defer;
}

// ---

export function renew(src, ...params) {
  const { type, event, renewing } = src;

  if (![SOURCE_TYPE, STREAM_TYPE, COMPOSE_TYPE].includes(type)) {
    throw new Error('renew can only invoke SOURCE_TYPE, STREAM_TYPE, COMPOSE_TYPE');
  }

  if (renewing) {
    return renewing;
  }

  if (type === COMPOSE_TYPE) {
    const { cache } = src;

    const [args, ...others] = params;
    args.forEach((arg) => {
      const group = getObjectHash(others);
      const hash = getObjectHash(arg);
      const key = `${group}.${hash}`;
      delete cache[key];
    });

    const renewing = Promise.resolve()
      .then(() => event.emit('beforeRenew', params))
      .then(() => query(src, ...params))
      .then((data) => event.emit('afterRenew', params, data).then(() => data))
      .finally(() => (delete src.renewing));
    src.renewing = renewing;
    return renewing;
  }

  const { atoms } = src;
  const hash = getObjectHash(params);
  const atom = atoms.find(item => item.hash === hash);

  return Promise.resolve()
    .then(() => event.emit('beforeRenew', params))
    .then(() => atom ? atom.renew() : query(src, ...params))
    .then((data) => event.emit('afterRenew', params, data).then(() => data));
}

export function clear(src, ...params) {
  const { type, atoms, event } = src;

  if (![SOURCE_TYPE, STREAM_TYPE, COMPOSE_TYPE].includes(type)) {
    throw new Error('clear can only invoke SOURCE_TYPE, STREAM_TYPE, COMPOSE_TYPE');
  }

  return event.emit('beforeClear', params).then(() => {
    // release all local atoms
    if (!params.length) {
      if (type === COMPOSE_TYPE) {
        src.cache = {};
      }
      else {
        atoms.length = 0;
      }
      return event.emit('afterClear', params);
    }

    if (type === COMPOSE_TYPE) {
      const { cache } = src;

      const [args, ...others] = params;
      args.forEach((arg) => {
        const group = getObjectHash(others);
        const hash = getObjectHash(arg);
        const key = `${group}.${hash}`;
        delete cache[key];
      });

      return event.emit('afterClear', params);
    }

    // release given params relative atom
    const hash = getObjectHash(params);
    const index = atoms.findIndex(item => item.hash === hash);
    if (index > -1) {
      atoms.splice(index, 1);
    }
    return event.emit('afterClear', params);
  });
}

export function isTypeOf(src, ...types) {
  return src && types.includes(src.type);
}

export function read(src, ...params) {
  const { type } = src;

  if (![SOURCE_TYPE, STREAM_TYPE, COMPOSE_TYPE].includes(type)) {
    throw new Error('read can only invoke SOURCE_TYPE, STREAM_TYPE, COMPOSE_TYPE');
  }

  if (type === COMPOSE_TYPE) {
    const { cache } = src;

    const [args, ...others] = params;
    const out = args.map((arg) => {
      const group = getObjectHash(others);
      const hash = getObjectHash(arg);
      const key = `${group}.${hash}`;
      return cache[key];
    });

    return out;
  }

  const { atoms } = src;
  const hash = getObjectHash(params)
  const atom = atoms.find(item => item.hash === hash)

  if (atom) {
    return type === SOURCE_TYPE ? atom.value
      : type === STREAM_TYPE ? atom.chunks : void 0;
  }
}

export function request(src, ...params) {
  const { type } = src;

  if (type === ACTION_TYPE) {
    return Promise.resolve(src.act(...params));
  }

  if (type === SOURCE_TYPE || type === COMPOSE_TYPE) {
    return Promise.resolve(src.get(...params));
  }

  if (type === STREAM_TYPE) {
    const { executor } = src;
    return new Promise((resolve, reject) => {
      const exec = executor({
        onend: resolve,
        onerror: reject,
      });
      exec(...params);
    });
  }
}

export function addListener(src, e, fn) {
  const { type, event } = src;

  if (![SOURCE_TYPE, STREAM_TYPE, COMPOSE_TYPE].includes(type)) {
    throw new Error('addEventListener can only invoke SOURCE_TYPE, STREAM_TYPE, COMPOSE_TYPE');
  }

  event.on(e, fn);

  return () => event.off(e, fn);
}

export function removeListener(src, e, fn) {
  const { type, event } = src;

  if (![SOURCE_TYPE, STREAM_TYPE, COMPOSE_TYPE].includes(type)) {
    throw new Error('removeEventListener can only invoke SOURCE_TYPE, STREAM_TYPE, COMPOSE_TYPE');
  }

  event.off(e, fn);
}

// ----------------------------------------

function assign(fn, src, mapping) {
  Object.assign(fn, src);

  if (!mapping) {
    return;
  }

  const keys = Object.keys(mapping);
  keys.forEach((key) => {
    const value = mapping[key];
    fn[key] = (...params) => {
      return value(fn, ...params);
    };
  });
}

/**
 * @param {object} obj
 * @returns {string}
 */
export function getObjectHash(obj) {
  if (typeof obj !== 'object') {
    obj = [obj];
  }

  let str = stringify(obj)
  let hash = getStringHash(str)
  return hash
}

/**
 * @param {object} obj
 * @returns {string}
 */
function stringify(obj) {
  const exists = [obj]
  const used = []
  const stringifyObjectByKeys = (obj) => {
    if (Array.isArray(obj)) {
      let items = obj.map((item) => {
        if (item && typeof item === 'object') {
          return stringifyObjectByKeys(item)
        }
        else {
          return JSON.stringify(item)
        }
      })
      let str = '[' + items.join(',') + ']'
      return str
    }

    let str = '{'
    let keys = Object.keys(obj)
    let total = keys.length
    keys.sort()
    keys.forEach((key, i) => {
      let value = obj[key]
      str += key + ':'

      if (value && typeof value === 'object') {
        let index = exists.indexOf(value)
        if (index > -1) {
          str += '#' + index
          used.push(index)
        }
        else {
          exists.push(value)
          const num = exists.length - 1
          str += '#' + num + stringifyObjectByKeys(value)
        }
      }
      else {
        str += JSON.stringify(value)
      }

      if (i < total - 1) {
        str += ','
      }
    })
    str += '}'
    return str
  }
  let str = stringifyObjectByKeys(obj)

  exists.forEach((item, i) => {
    if (!used.includes(i)) {
      str = str.replace(new RegExp(`:#${i}`, 'g'), ':')
    }
  })

  if (used.includes(0)) {
    str = '#0' + str
  }

  return str
}

/**
 * @param {string} str
 * @returns {string}
 */
function getStringHash(str) {
  let hash = 5381
  let i = str.length

  while (i) {
    hash = (hash * 33) ^ str.charCodeAt(--i)
  }

  return hash >>> 0
}

function deepFreeze(obj) {
  // only freeze object and array
  if (!(obj && typeof obj === 'object')) {
    return obj;
  }

  // Freeze properties before freezing self
  const keys = Object.keys(obj);
  keys.forEach((key) => {
    const value = obj[key];
    deepFreeze(value);
  });

  return Object.freeze(obj);
}
