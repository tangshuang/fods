# FODS (Frontend Operational Data Store)

Make frontend data request more controllable.

## Install

```
npm i fods
```

## Usage

```js
import { source, query } from 'fods';
// import { source, query } from 'https://unpkg.com/fods';

// define a source
const UserBooks = source((uid) => {
    // return user' books
});

// query data from source
const userBooks = await query(UserBooks, '123');

// update data in source
renew(UserBooks, '123');
```

## Idea

1. same source with same params should return same output until the source is renewed
2. same request should not be send again when the request is runing
3. multiple relative data should have their lifecycle management

> A store is a place to put data in local, when we invoke `query` `emit` or `take`, we find some thing in local store and reuse them, so that we can reduce the real request count, and share data amoung requests.

## API

**source & query**

Define a SOURCE_TYPE store by `source` and consume it by `query`.

```js
import { source, query } from 'fods';

// define a source
const UserBooks = source((uid) => {
    // return user' books
});

// query data from source
const userBooks = await query(UserBooks, '123');

// update data in source
renew(UserBooks, '123');
```

**compose**

Define a COMPOSE_TYPE store by `compose` and consume it by `query`.

```js
import { compose, query } from 'fods';

const MyList = compose(
    (ids: string[]) => {
        // return result list array
    },
    // find value in result list to record cache
    // if undefined, ignored
    (res, id: string) => res.find(item => item.id === id),
);

const lite = await query(MyList, [1, 2]);
const all = await query(MyList, [1, 2, 3, 4]);
// here, we query 1, 2 twice, however, in fact same id will be query only once inside fods

renew(MyList, [2, 3]);
```

Notice, the first parameter should be an array, and all of items should be same data type. The rest parameters will be passed.

```js
const MyList = compose(
    (ids: string[], ...params: any[]) => {
        return Promise.all(ids.map(id => fetchData(id, ...params)))
    },
    (res, id: string) => res.find(item => item.id === id),
);

const lite = await query(MyList, [1, 2], 'var1', 'var2');
```

**action & take**

Define a ACTION_TYPE store by `action` and consume it by `take`.

```js
import { action, take } from 'fods';

const AddUserBook = action(async (book) => {
    // send save book request

    // after we add a new book, we should renew the UserBookList in store
    await renew(UserBookList);
});
```

**stream & subscribe**

```js
import { stream, subscribe } from 'fods';

const UserBookRepo = stream(({ ondata, onend, onerror }) => (uid) => {
    const stream = requestUserBooksStream(uid);
    stream.on('data', ondata);
    stream.on('end', onend);
    stream.on('error', onerror);
});

const emit = subscribe(UserBookRepo, {
    ondata(chunk) {},
    onend(chunks) {},
    onerror(e) {},
});

emit('123');
```

**renew**

Clear store and request again.

```js
const newData = await renew(SomeSource, '123');
const newSubscribe = await renew(SomeStream, '123');
```

*Renew stream will not request again, only clear store.*

**clear**

Clear store.

```js
clear(SomeSource, '123');
```

**read**

Read from store without request.

```js
const data = read(SomeSource, 123); // notice, without `await`
```

**request**

Send a request with given source or stream outside the store.

```js
const data = await request(SomeSource, 123); // without any affect to the store
```

Request stream will return a Promise resolved when the `end` event be triggered.

**bind**

Create a new source which replaced parameters with given params so that when we query again, the params which are replaced should not not be given any more. Like `Function.prototype.bind`.

For exmaple, we have a source:

```js
const some = source((a, b) => request(a, b));
const data = await query(some, 123, 456);
```

We can use `bind` to replace `a` with `123`, and when we query again, `a` should not be given again, just pass `b`:

```js
const some123 = bind(some, 123);
const data = await query(some123, 456);
```

**isTypeOf**

Check whether the given object is type of a usable type.

```js
import { isTypeOf, SOURCE_TYPE, STREAM_TYPE, ACTION_TYPE } from 'fods';

if (isTypeOf(obj, SOURCE_TYPE, STREAM_TYPE)) {
    // ...
}
```

**addListener & removeListener**

Watch store data change.

```js
const listener = (params, data) => {
    const [uid] = params;
    if (uid === 123) {
        // do some thing with data
    }
};

const unlisten = addListener(SomeSource, 'change', listener);

removeListener(SomeSource, 'change', listener);
// or
unlisten();
```

Events:

- Source & Compose: 'change' | 'beforeRenew' | 'afterRenew' | 'beforeClear' | 'afterClear'
- Stream: 'data' | 'end' | 'error' | 'beforeClear' | 'afterClear'

## Quick Use

```js
const queryBook = source((id) => {
    // ...
});
const book = await queryBook(123);
renew(queryBook, 123);
```

```js
const BookSource = source((id) => {
    // ...
});
const book = await BookSource.query(id);
BookSource.renew(id);
```

- source, compose => query { query, request, renew, read, clear }
- stream => subscribe { subscribe, request, renew, read, clear }
- action => take { take, request }

```js
const subscribeSomeStream = stream(({ ondata, onend, onerror }) => {
    // ...
});

const emit = subscribeSomeStream({
    ondata: () => {},
    onend: () => {},
    onerror: () => {},
});

emit('arg');
```
