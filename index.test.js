import { source, compose } from './index.js';

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
        console.log(ids);
        count ++;
        setTimeout(() => r(ids.map(id => ({ id, name: `book${id}` }))), 0);
      }),
      (ret, id) => ret.find(item => item.id === id),
    );

    const books1 = await queryBooks(['sea', 'cast']);
    const books2 = await queryBooks(['holl']);

    expect(books1).toEqual([{ id: 'sea', name: 'booksea' }, { id: 'cast', name: 'bookcast' }]);
    expect(books2).toEqual([{ id: 'holl', name: 'bookholl' }]);

    expect(count).toBe(1);
  });
});
