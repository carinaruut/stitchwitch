<script setup lang="ts">
defineProps<{ horizontal: number; vertical: number }>()
defineEmits<{ horizontal: [value: number]; vertical: [value: number] }>()
</script>

<template>
  <section class="card border border-base-300 bg-base-100">
    <div class="card-body gap-3 p-4">
      <h2 class="card-title text-base">Repeat settings</h2>
      <div class="grid grid-cols-2 gap-3">
        <label class="form-control">
          <span class="label-text mb-1">Across</span>
          <input class="input input-bordered input-sm" type="number" min="1" max="20" :value="horizontal" @change="$emit('horizontal', Math.min(20, Math.max(1, Number(($event.target as HTMLInputElement).value) || 1)))" />
        </label>
        <label class="form-control">
          <span class="label-text mb-1">Down</span>
          <input class="input input-bordered input-sm" type="number" min="1" max="20" :value="vertical" @change="$emit('vertical', Math.min(20, Math.max(1, Number(($event.target as HTMLInputElement).value) || 1)))" />
        </label>
      </div>
    </div>
  </section>
</template>
