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