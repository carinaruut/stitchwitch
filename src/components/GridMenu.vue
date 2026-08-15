<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import ClickPopover from './ClickPopover.vue'
import GridSettings from './GridSettings.vue'

defineProps<{ cellSize: number }>()
defineEmits<{ cellSize: [value: number] }>()
const { t } = useI18n({ useScope: 'global' })
</script>

<template>
  <ClickPopover :label="t('controls.gridSettings.controls')" align="right">
    <template #trigger="{ open, panelId }">
      <button class="btn btn-sm gap-1.5" :class="open ? 'btn-primary' : 'btn-ghost'" type="button" :aria-label="t('controls.gridSettings.controls')" aria-haspopup="true" :aria-controls="panelId" :aria-expanded="open">
        <span class="mdi mdi-grid text-lg" aria-hidden="true"></span>
        <span class="hidden xl:inline">{{ t('controls.gridSettings.menuTitle') }}</span>
        <span class="badge badge-sm hidden sm:inline-flex" :class="open ? 'badge-primary-content' : 'badge-ghost'">{{ cellSize }}</span>
      </button>
    </template>
    <GridSettings :cell-size="cellSize" @cell-size="$emit('cellSize', $event)" />
  </ClickPopover>
</template>
