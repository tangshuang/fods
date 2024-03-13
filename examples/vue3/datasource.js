import { ref, watch } from 'vue';
import { source, action } from 'fods';

export const queryBook = source(async (id) => {
  // ...
});

export const updateBook = action(async (id, data) => {
  // ...
  // refresh book data
  await queryBook.renew(id);
});
