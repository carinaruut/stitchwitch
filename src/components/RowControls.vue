<script setup lang="ts">
defineProps<{ selected: number; count: number }>()
defineEmits<{ before: []; after: []; beginning: []; end: []; remove: [] }>()
</script>

<template>
  <section class="card border border-base-300 bg-base-100">
    <div class="card-body gap-3 p-4">
      <div class="flex items-center justify-between">
        <h2 class="card-title text-base">Rows</h2>
        <span class="badge badge-neutral">Row {{ selected + 1 }} of {{ count }}</span>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <button class="btn btn-sm btn-outline" type="button" @click="$emit('before')">Add before</button>
        <button class="btn btn-sm btn-outline" type="button" @click="$emit('after')">Add after</button>
        <button class="btn btn-sm btn-ghost" type="button" @click="$emit('beginning')">Add at start</button>
        <button class="btn btn-sm btn-ghost" type="button" @click="$emit('end')">Add at end</button>
      </div>
      <button class="btn btn-sm btn-error btn-outline" type="button" :disabled="count <= 1" @click="$emit('remove')">Remove selected row</button>
    </div>
  </section>
</template>
