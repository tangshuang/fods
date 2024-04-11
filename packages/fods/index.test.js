import { source, compose, stream, action, addListener } from './index.js';

describe('FODS', () => {
  test('source basic use', async () => {
    let count = 0;
    const queryBook = source((id) => new Promise(r => (count ++, setTimeout(() => r({ id, name: `book${id}` }), 16))));
    const book = await queryBook('cast');
    expect(book.id).toBe('cast');
    expect(book.name).toBe('bookcast');
    expect(count).toBe(1);

    await queryBook('cast');
    expect(count).toBe(1); // request not be called

    await queryBook.renew('cast');
    expect(count).toBe(2);
  });

  test('compose basic use', async () => {
    let count = 0;

    const queryBooks = compose(
      async (ids) => new Promise((r) => {
        count ++;
        setTimeout(() => r(ids.map(id => ({ id, name: `book${id}` }))), 0);
      }),
      (ret, id) => ret.find(item => item.id === id),
    );

    // when two request send at the same time (in 64ms), they will share one queue, so the following count is 1
    const [books1, books2] = await Promise.all([
      queryBooks(['sea', 'cast']),
      queryBooks(['holl']),
    ]);

    expect(books1).toEqual([{ id: 'sea', name: 'booksea' }, { id: 'cast', name: 'bookcast' }]);
    expect(books2).toEqual([{ id: 'holl', name: 'bookholl' }]);

    expect(count).toBe(1);

    // notice, the params are not the same as upper
    await queryBooks.renew(['holl', 'cast']);
    expect(count).toBe(2);
  });

  test('compose more same params', async () => {
    let count = 0;

    const queryBooks = compose(
      async (ids, ...others) => new Promise((r) => {
        count ++;
        setTimeout(() => r(ids.map(id => ({ id, name: `book${id} ${others.join(',')}` }))), 0);
      }),
      (ret, id) => ret.find(item => item.id === id),
    );

    // when two request send at the same time (in 64ms), they will share one queue, so the following count is 1
    const [books1, books2] = await Promise.all([
      queryBooks(['sea', 'cast'], 'test'),
      queryBooks(['holl'], 'test'),
    ]);

    expect(count).toBe(1);

    expect(books1).toEqual([{ id: 'sea', name: 'booksea test' }, { id: 'cast', name: 'bookcast test' }]);
    expect(books2).toEqual([{ id: 'holl', name: 'bookholl test' }]);


    // notice, the params are not the same as upper
    await queryBooks.renew(['holl', 'cast'], 'test');
    expect(count).toBe(2);
  });

  test('compose more different params', async () => {
    let count = 0;

    const queryBooks = compose(
      async (ids, ...others) => new Promise((r) => {
        count ++;
        setTimeout(() => r(ids.map(id => ({ id, name: `book${id} ${others.join(',')}` }))), 0);
      }),
      (ret, id) => ret.find(item => item.id === id),
    );

    // when two request send at the same time (in 64ms), they will share one queue, so the following count is 1
    const [books1, books2] = await Promise.all([
      queryBooks(['sea', 'cast'], 'test1'),
      queryBooks(['holl'], 'test2'),
    ]);

    expect(count).toBe(2);

    expect(books1).toEqual([{ id: 'sea', name: 'booksea test1' }, { id: 'cast', name: 'bookcast test1' }]);
    expect(books2).toEqual([{ id: 'holl', name: 'bookholl test2' }]);

    // notice, holl + test1 will create a new cache, however, only one request will be create
    const [book3, book4] = await queryBooks.renew(['holl', 'cast'], 'test1');

    expect(count).toBe(3);

    expect(book3).toEqual({ id: 'holl', name: 'bookholl test1' });
    expect(book4).toEqual(books1[1]);
  });

  test('stream basic use', (done) => {
    let invoked = 0;
    const booksStream = stream(({ ondata, onend, onerror }) => (type) => {
      invoked ++;
      setTimeout(() => ondata({ id: 1, type }), 0);
      setTimeout(() => ondata({ id: 2, type }), 1);
      setTimeout(() => ondata({ id: 3, type }), 2);
      setTimeout(() => onend(), 4);
    });

    let count = 0;
    let chunks;
    const emit = booksStream.subscribe({
      ondata: () => count ++,
      onend: items => chunks = items,
    });

    emit('hist');

    setTimeout(() => {
      expect(chunks).toEqual([{ id: 1, type: 'hist' }, { id: 2, type: 'hist' }, { id: 3, type: 'hist' }]);
      expect(invoked).toBe(1);
      expect(count).toBe(3);

      emit('hist');

      setTimeout(() => {
        expect(chunks).toEqual([{ id: 1, type: 'hist' }, { id: 2, type: 'hist' }, { id: 3, type: 'hist' }]);
        expect(invoked).toBe(1); // not changed
        expect(count).toBe(6);

        done();
      }, 1);
    }, 5);
  });

  test('action basic', async () => {
    let count = 0;
    const updateBook = action((id, data) => (count ++, setTimeout(() => {}, 4)));

    // give same params twice
    await Promise.all([
      updateBook(1, 'a'),
      updateBook(1, 'a'),
    ]);

    expect(count).toBe(1);
  });

  test('bugfix: renew trigger beforeRenew', async () => {
    let count = 0;
    const queryBook = source((id) => new Promise(r => (count ++, setTimeout(() => r({ id, name: `book${id}` }), 16))));

    await queryBook('cast');
    expect(count).toBe(1);

    await queryBook('cast');
    expect(count).toBe(1); // request not be called


    addListener(queryBook, 'beforeRenew', () => {
      count ++;
    });

    await queryBook.renew('cast');
    expect(count).toBe(3); // renew + 1, beforeRenew + 1
  });

  // test('bugfix: init error empty', async () => {
  //   let count = 0;
  //   const queryBook = source(() => new Promise((resolve, reject) => {
  //     setTimeout(() => {
  //       if (count === 0) {
  //         reject('error');
  //       }
  //       else {
  //         resolve('ok');
  //       }
  //       count ++;
  //     }, 16);
  //   }));

  //   await expect(() => queryBook()).rejects.toThrow('error');
  //   expect(count).toBe(1);

  //   let data;
  //   data = await queryBook();
  //   expect(count).toBe(2);
  //   expect(data).toBe('ok');

  //   data = await queryBook();
  //   expect(count).toBe(2); // not called
  //   expect(data).toBe('ok');
  // });
});
