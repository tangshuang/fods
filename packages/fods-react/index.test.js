import { act, renderHook } from "@testing-library/react";
import { useSource } from './index.js';
import { source } from 'fods';

describe('Fods React', () => {
  test('basic use', async () => {
    const Book = source((id) => Promise.resolve({ id, name: `Book ${id}` }));

    const { result } = renderHook(() => useSource(Book, [1]));
    const { init } = result.current;
    expect(result.current.data).toBeUndefined();

    await act(async () => {
      await init();
    });

    expect(result.current.data).toEqual({ id: 1, name: 'Book 1' });
  });

  test('with default', async () => {
    const Book = source((id) => Promise.resolve({ id, name: `Book ${id}` }));

    const { result } = renderHook(() => useSource(Book, [1], { default: {} }));
    const { init } = result.current;
    expect(result.current.data).toEqual({});

    await act(async () => {
      await init();
    });

    expect(result.current.data).toEqual({ id: 1, name: 'Book 1' });
  });
});
