<script setup lang="ts">
import { useI18n } from 'vue-i18n'

defineProps<{ cellSize: number; fullHeight: boolean; showSymbols: boolean }>()
defineEmits<{ cellSize: [value: number]; fullHeight: [value: boolean]; showSymbols: [value: boolean] }>()
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
      <label class="mt-2 flex cursor-pointer items-center justify-between gap-4 border-t border-base-300 pt-3">
        <span><strong class="block text-sm font-medium">{{ t('controls.gridSettings.fullHeight') }}</strong><span class="block text-xs text-base-content/60">{{ t('controls.gridSettings.fullHeightDescription') }}</span></span>
        <input class="toggle toggle-primary toggle-sm shrink-0" type="checkbox" :checked="fullHeight" @change="$emit('fullHeight', ($event.target as HTMLInputElement).checked)" />
      </label>
      <label class="mt-2 flex cursor-pointer items-center justify-between gap-4 border-t border-base-300 pt-3">
        <span><strong class="block text-sm font-medium">{{ t('controls.gridSettings.showSymbols') }}</strong><span class="block text-xs text-base-content/60">{{ t('controls.gridSettings.showSymbolsDescription') }}</span></span>
        <input class="toggle toggle-primary toggle-sm shrink-0" type="checkbox" :checked="showSymbols" @change="$emit('showSymbols', ($event.target as HTMLInputElement).checked)" />
      </label>
    </div>
  </section>
</template>
