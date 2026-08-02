<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import type { PatternGrid } from '../types/pattern'

defineProps<{ cells: PatternGrid; cellSize: number; selectedRow: number; selectedColumn: number }>()
const emit = defineEmits<{ strokeStart: []; paint: [row: number, column: number]; strokeEnd: [] }>()
const drawing = ref(false)

function start(row: number, column: number, event: PointerEvent) {
  if (event.button !== 0) return
  event.preventDefault()
  drawing.value = true
  emit('strokeStart')
  emit('paint', row, column)
}

function enter(row: number, column: number, event: PointerEvent) {
  if (drawing.value && event.buttons === 1) emit('paint', row, column)
}

function stop() {
  if (!drawing.value) return
  drawing.value = false
  emit('strokeEnd')
}

function keyboardPaint(row: number, column: number) {
  emit('strokeStart')
  emit('paint', row, column)
  emit('strokeEnd')
}

onMounted(() => window.addEventListener('pointerup', stop))
onBeforeUnmount(() => window.removeEventListener('pointerup', stop))
</script>

<template>
  <div class="max-h-[62vh] overflow-auto border border-base-300 bg-base-100 p-2" aria-label="Editable pattern grid">
    <div
      class="grid w-max"
      :style="{ gridTemplateColumns: `repeat(${cells[0].length}, ${cellSize}px)`, gridAutoRows: `${cellSize}px` }"
      role="grid"
      :aria-rowcount="cells.length"
      :aria-colcount="cells[0].length"
      @dragstart.prevent
    >
      <template v-for="(row, rowIndex) in cells" :key="rowIndex">
        <div
          v-for="(color, columnIndex) in row"
          :key="columnIndex"
          class="pattern-cell"
          :class="{ 'outline-2 outline-offset-[-2px] outline-neutral': selectedRow === rowIndex && selectedColumn === columnIndex }"
          :style="{ backgroundColor: color }"
          role="gridcell"
          tabindex="0"
          :aria-label="`Row ${rowIndex + 1}, column ${columnIndex + 1}, color ${color}`"
          @pointerdown="start(rowIndex, columnIndex, $event)"
          @pointerenter="enter(rowIndex, columnIndex, $event)"
          @keydown.enter.prevent="keyboardPaint(rowIndex, columnIndex)"
          @keydown.space.prevent="keyboardPaint(rowIndex, columnIndex)"
        ></div>
      </template>
    </div>
  </div>
</template>
