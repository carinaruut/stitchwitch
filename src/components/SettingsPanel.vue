<script setup lang="ts">
import ColorPicker from './ColorPicker.vue'
import GridSettings from './GridSettings.vue'
import RepeatSettings from './RepeatSettings.vue'
import RowControls from './RowControls.vue'
import ColumnControls from './ColumnControls.vue'
import type { RepeatBox, RepeatBoxInput } from '../types/pattern'

defineProps<{
  color: string
  recentColors: string[]
  cellSize: number
  horizontal: number
  vertical: number
  repeatBoxes: RepeatBox[]
  selectedRow: number
  rowCount: number
  selectedColumn: number
  columnCount: number
}>()

defineEmits<{
  color: [color: string]
  eyedropper: []
  cellSize: [value: number]
  horizontal: [value: number]
  vertical: [value: number]
  repeatSave: [input: RepeatBoxInput, id: string | null]
  repeatToggle: [id: string, enabled: boolean]
  repeatRemove: [id: string]
  rowBefore: []
  rowAfter: []
  rowBeginning: []
  rowEnd: []
  rowRemove: []
  columnBefore: []
  columnAfter: []
  columnBeginning: []
  columnEnd: []
  columnRemove: []
}>()
</script>

<template>
  <div class="space-y-3">
    <ColorPicker :color="color" :recent-colors="recentColors" @select="$emit('color', $event)" @eyedropper="$emit('eyedropper')" />
    <GridSettings :cell-size="cellSize" @cell-size="$emit('cellSize', $event)" />
    <RepeatSettings
      :horizontal="horizontal"
      :vertical="vertical"
      :boxes="repeatBoxes"
      :selected-row="selectedRow"
      :row-count="rowCount"
      :selected-column="selectedColumn"
      :column-count="columnCount"
      @horizontal="$emit('horizontal', $event)"
      @vertical="$emit('vertical', $event)"
      @save="(input, id) => $emit('repeatSave', input, id)"
      @toggle="(id, enabled) => $emit('repeatToggle', id, enabled)"
      @remove="$emit('repeatRemove', $event)"
    />
    <RowControls
      :selected="selectedRow"
      :count="rowCount"
      @before="$emit('rowBefore')"
      @after="$emit('rowAfter')"
      @beginning="$emit('rowBeginning')"
      @end="$emit('rowEnd')"
      @remove="$emit('rowRemove')"
    />
    <ColumnControls
      :selected="selectedColumn"
      :count="columnCount"
      @before="$emit('columnBefore')"
      @after="$emit('columnAfter')"
      @beginning="$emit('columnBeginning')"
      @end="$emit('columnEnd')"
      @remove="$emit('columnRemove')"
    />
    <div class="collapse-arrow collapse border border-base-300 bg-base-100">
      <input type="checkbox" />
      <div class="collapse-title text-sm font-medium">About local storage</div>
      <div class="collapse-content text-sm text-base-content/70">
        <p>Your current pattern, theme, and recent colors are saved in this browser. Browser data can still be deleted, so download project files for a durable backup.</p>
      </div>
    </div>
  </div>
</template>
