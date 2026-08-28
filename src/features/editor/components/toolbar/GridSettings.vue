<script setup lang="ts">
import { useI18n } from 'vue-i18n'

defineProps<{ cellSize: number; fullHeight: boolean; showSymbols: boolean }>()
defineEmits<{ cellSize: [value: number]; fullHeight: [value: boolean]; showSymbols: [value: boolean] }>()
const { t } = useI18n({ useScope: 'global' })
</script>

<template>
  <section class="card border border-base-300 bg-base-100">
    <div class="card-body app-settings-panel">
      <div class="flex items-center justify-between">
        <h2 class="card-title text-base">
          {{ t('controls.gridSettings.title') }}
        </h2>
        <span class="badge badge-outline">{{ t('controls.gridSettings.pixels', { size: cellSize }) }}</span>
      </div>
      <label class="app-field">
        <span class="app-field-label">{{ t('controls.gridSettings.visibleCellSize') }}</span>
        <input
          class="range range-primary range-sm"
          type="range"
          min="8"
          max="64"
          step="1"
          :value="cellSize"
          @input="$emit('cellSize', Number(($event.target as HTMLInputElement).value))"
        >
      </label>
      <label class="app-settings-section app-toggle-row">
        <span class="app-toggle-copy"><strong class="app-toggle-title">{{ t('controls.gridSettings.fullHeight') }}</strong><span class="app-toggle-description">{{ t('controls.gridSettings.fullHeightDescription') }}</span></span>
        <input
          class="toggle toggle-primary toggle-sm"
          type="checkbox"
          :checked="fullHeight"
          @change="$emit('fullHeight', ($event.target as HTMLInputElement).checked)"
        >
      </label>
      <label class="app-settings-section app-toggle-row">
        <span class="app-toggle-copy"><strong class="app-toggle-title">{{ t('controls.gridSettings.showSymbols') }}</strong><span class="app-toggle-description">{{ t('controls.gridSettings.showSymbolsDescription') }}</span></span>
        <input
          class="toggle toggle-primary toggle-sm"
          type="checkbox"
          :checked="showSymbols"
          @change="$emit('showSymbols', ($event.target as HTMLInputElement).checked)"
        >
      </label>
    </div>
  </section>
</template>
