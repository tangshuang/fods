# FODS (Frontend Operational Data Store)

Make frontend data request more controllable.

## Install

```
npm i fods
```

## Usage

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

## Idea

1. same source with same params should return same output until the source is renewed
2. same request should not be send again when the request is runing
3. multiple relative data should have their lifecycle management

> A store is a place to put data in local, when we invoke `query` `emit` or `submit`, we find some thing in local store and reuse them, so that we can reduce the real request count, and share data amoung requests.

## API

**source & query**

Define a SOURCE_TYPE by `source` and consume it by `query`.

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

Define a COMPOSE_TYPE by `compose` and consume it by `query`.

```js
import { compose, query } from 'fods';

const MyList = compose(
    (ids) => {
        // return result list array
    },
    // find value in result list to record cache
    (res, id) => {
        return res.find(item => item.id === id);
    },
);

const lite = await query(MyList, 1, 2);
const all = await query(MyList, 1, 2, 3, 4);
// here, we query 1, 2 twice, however, in fact same id will be query only once inside fods

renew(MyList, 2, 3);
```

Notice, params of compose should be same data type.

**action & submit**

Define a ACTION_TYPE by `action` and consume it by `submit`.

```js
import { action, submit } from 'fods';

const AddUserBook = action(async (book) => {
    // send save book request

    // after we add a new book, we should renew the UserBookList in store
    await renew(UserBookList);
});
```

**stream & emit**

```js
import { stream, emit } from 'fods';

const UserBookRepo = stream((dispatch, defineStop) => (uid) => {
    const stream = requestUserBooksStream(uid);
    stream.on('data', dispatch);
    defineStop(() => stream.stop());
});

const subscribe = emit(UserBookRepo, '123');
subscribe((chunk, chunks) => {
    // render with chunk or chunks
});
```

**renew**

Clear store and request again.

```js
const newData = await renew(SomeSource, '123');
const newSubscribe = await renew(SomeStream, '123');
```

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
const listener = (params, newData) => {
    const [uid] = params;
    if (uid === 123) {
        // do some thing with newData
    }
};

const unlisten = addListener(SomeSource, listener);

removeListener(SomeSource, listener);
// or
unlisten();
```

## Quick Use

```js
const queryBook = source((id) => {
    // ...
});
const book = await queryBook(123);
renew(queryBook, 123);
```

`source` and `compose` are supported.
