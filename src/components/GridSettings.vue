<script setup lang="ts">
defineProps<{ cellSize: number }>()
defineEmits<{ cellSize: [value: number] }>()
</script>

<template>
  <section class="card border border-base-300 bg-base-100">
    <div class="card-body gap-2 p-4">
      <div class="flex items-center justify-between">
        <h2 class="card-title text-base">Grid settings</h2>
        <span class="badge badge-outline">{{ cellSize }} px</span>
      </div>
      <label class="form-control">
        <span class="label-text mb-1">Visible cell size</span>
        <input class="range range-primary range-sm" type="range" min="8" max="64" step="1" :value="cellSize" @input="$emit('cellSize', Number(($event.target as HTMLInputElement).value))" />
      </label>
    </div>
  </section>
</template>
