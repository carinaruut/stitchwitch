<script setup lang="ts">
import { useI18n } from 'vue-i18n'

defineProps<{ cellSize: number }>()
defineEmits<{ cellSize: [value: number] }>()
const { t } = useI18n({ useScope: 'global' })
</script>

<template>
  <section class="card border border-base-300 bg-base-100">
    <div class="card-body gap-2 p-4">
      <div class="flex items-center justify-between">
        <h2 class="card-title text-base">{{ t('controls.gridSettings.title') }}</h2>
        <span class="badge badge-outline">{{ t('controls.gridSettings.pixels', { size: cellSize }) }}</span>
      </div>
      <label class="form-control">
        <span class="label-text mb-1">{{ t('controls.gridSettings.visibleCellSize') }}</span>
        <input class="range range-primary range-sm" type="range" min="8" max="64" step="1" :value="cellSize" @input="$emit('cellSize', Number(($event.target as HTMLInputElement).value))" />
      </label>
    </div>
  </section>
</template>
