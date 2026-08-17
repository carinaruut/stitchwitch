<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import ClickPopover from './ClickPopover.vue'
import GridSettings from './GridSettings.vue'

defineProps<{ cellSize: number; fullHeight: boolean; showSymbols: boolean }>()
defineEmits<{ cellSize: [value: number]; fullHeight: [value: boolean]; showSymbols: [value: boolean] }>()
const { t } = useI18n({ useScope: 'global' })
</script>

<template>
  <ClickPopover :label="t('controls.gridSettings.settings')" align="right">
    <template #trigger="{ open, panelId }">
      <button class="btn btn-sm" :class="open ? 'btn-primary' : 'btn-ghost'" type="button" :aria-label="t('controls.gridSettings.settings')" :title="t('controls.gridSettings.settings')" aria-haspopup="true" :aria-controls="panelId" :aria-expanded="open">
        <span class="mdi mdi-cog-outline text-xl" aria-hidden="true"></span>
      </button>
    </template>
    <GridSettings :cell-size="cellSize" :full-height="fullHeight" :show-symbols="showSymbols" @cell-size="$emit('cellSize', $event)" @full-height="$emit('fullHeight', $event)" @show-symbols="$emit('showSymbols', $event)" />
  </ClickPopover>
</template>
