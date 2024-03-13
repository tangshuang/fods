import { ref, watch, onMounted, onUnmounted } from 'vue';
import { addListener, removeListener } from 'fods';
import { queryBook, updateBook } from './datasource';

export function useBook(getter) {
  const book = ref();
  const id = ref();

  // init, or outside id changed
  watch(getter, async () => {
    id.value = getter();
    book.value = await queryBook(id.value);
  }, { immediate: true });

  // update book data
  const update = async (data) => {
    await updateBook(id.value, data);
    book.value = queryBook.read(id.value);
  };


  /**
   * listen to data source change,
   * book data may be changed over other hooks or components
   */

  const onChange = (params) => {
    const [bid] = params;
    if (bid === id.value) {
      book.value = queryBook.read(id.value);
    }
  };

  onMounted(() => {
    addListener(queryBook, 'change', onChange);
  });

  onUnmounted(() => {
    removeListener(queryBook, 'change', onChange);
  });

  return [book, update]
}
