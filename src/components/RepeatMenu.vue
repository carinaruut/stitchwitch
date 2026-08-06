<script setup lang="ts">
import ClickPopover from './ClickPopover.vue'
import RepeatSettings from './RepeatSettings.vue'
import type { RepeatBox, RepeatBoxInput } from '../types/pattern'

defineProps<{
  horizontal: number
  vertical: number
  boxes: RepeatBox[]
  selectedRow: number
  rowCount: number
  selectedColumn: number
  columnCount: number
}>()

defineEmits<{
  horizontal: [value: number]
  vertical: [value: number]
  save: [input: RepeatBoxInput, id: string | null]
  toggle: [id: string, enabled: boolean]
  remove: [id: string]
}>()
</script>

<template>
  <ClickPopover label="Repeat controls" align="right" width="md">
    <template #trigger="{ open, panelId }">
      <button class="btn btn-sm gap-1.5" :class="open ? 'btn-primary' : 'btn-ghost'" type="button" aria-label="Repeat controls" aria-haspopup="true" :aria-controls="panelId" :aria-expanded="open">
        <span class="mdi mdi-repeat text-lg" aria-hidden="true"></span>
        <span class="hidden xl:inline">Repeats</span>
        <span v-if="boxes.length" class="badge badge-sm" :class="open ? 'badge-primary-content' : 'badge-neutral'">{{ boxes.length }}</span>
      </button>
    </template>
    <RepeatSettings
      :horizontal="horizontal"
      :vertical="vertical"
      :boxes="boxes"
      :selected-row="selectedRow"
      :row-count="rowCount"
      :selected-column="selectedColumn"
      :column-count="columnCount"
      @horizontal="$emit('horizontal', $event)"
      @vertical="$emit('vertical', $event)"
      @save="(input, id) => $emit('save', input, id)"
      @toggle="(id, enabled) => $emit('toggle', id, enabled)"
      @remove="$emit('remove', $event)"
    />
  </ClickPopover>
</template>
