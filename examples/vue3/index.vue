<script setup>
import { useBook } from './hook';

const props = defineProps({
  id: string | number,
});

const [book, update] = useBook(() => props.id);

const handleChange = (e) => {
  const { value } = e.target;
  update({ name: value });
};
</script>

<template>
  <div>Name: <input :value="book.name" @change="handleChange" /></div>
  <div>Price: {{ book.price }}</div>
</template>
