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
        <button class="btn btn-sm btn-outline" type="button" @click="$emit('before')"><span class="mdi mdi-table-row-plus-before" aria-hidden="true"></span>Add before</button>
        <button class="btn btn-sm btn-outline" type="button" @click="$emit('after')"><span class="mdi mdi-table-row-plus-after" aria-hidden="true"></span>Add after</button>
        <button class="btn btn-sm btn-ghost" type="button" @click="$emit('beginning')"><span class="mdi mdi-arrow-collapse-up" aria-hidden="true"></span>Add at start</button>
        <button class="btn btn-sm btn-ghost" type="button" @click="$emit('end')"><span class="mdi mdi-arrow-collapse-down" aria-hidden="true"></span>Add at end</button>
      </div>
      <button class="btn btn-sm btn-error btn-outline" type="button" :disabled="count <= 1" @click="$emit('remove')"><span class="mdi mdi-delete-outline" aria-hidden="true"></span>Remove selected row</button>
    </div>
  </section>
</template>
