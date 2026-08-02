<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import type { DrawingTool, PatternGrid } from '../types/pattern'

const props = defineProps<{ cells: PatternGrid; cellSize: number; selectedRow: number; selectedColumn: number; tool: DrawingTool }>()
const emit = defineEmits<{ strokeStart: []; paint: [row: number, column: number]; strokeEnd: [] }>()
const viewport = ref<HTMLElement | null>(null)
const drawing = ref(false)
const panning = ref(false)
let panStartX = 0
let panStartY = 0
let scrollStartX = 0
let scrollStartY = 0

function startPan(event: PointerEvent) {
  if (event.button !== 0 || !viewport.value) return
  event.preventDefault()
  panning.value = true
  panStartX = event.clientX
  panStartY = event.clientY
  scrollStartX = viewport.value.scrollLeft
  scrollStartY = viewport.value.scrollTop
  viewport.value.setPointerCapture(event.pointerId)
}

function start(row: number, column: number, event: PointerEvent) {
  if (event.button !== 0) return
  if (props.tool === 'move') {
    startPan(event)
    return
  }
  event.preventDefault()
  drawing.value = true
  emit('strokeStart')
  emit('paint', row, column)
}

function enter(row: number, column: number, event: PointerEvent) {
  if (drawing.value && event.buttons === 1) emit('paint', row, column)
}

function pan(event: PointerEvent) {
  if (!panning.value || !viewport.value) return
  viewport.value.scrollLeft = scrollStartX - (event.clientX - panStartX)
  viewport.value.scrollTop = scrollStartY - (event.clientY - panStartY)
}

function stop(event?: PointerEvent) {
  if (panning.value) {
    panning.value = false
    if (event && viewport.value?.hasPointerCapture(event.pointerId)) viewport.value.releasePointerCapture(event.pointerId)
  }
  if (drawing.value) {
    drawing.value = false
    emit('strokeEnd')
  }
}

function keyboardPaint(row: number, column: number) {
  if (props.tool === 'move') return
  emit('strokeStart')
  emit('paint', row, column)
  emit('strokeEnd')
}

onMounted(() => window.addEventListener('pointerup', stop))
onBeforeUnmount(() => window.removeEventListener('pointerup', stop))
</script>

<template>
  <div
    ref="viewport"
    class="max-h-[62vh] overflow-auto border border-base-300 bg-base-200/50 p-3"
    :class="tool === 'move' ? (panning ? 'cursor-grabbing touch-none' : 'cursor-grab touch-none') : ''"
    aria-label="Editable pattern grid"
    @pointerdown.self="tool === 'move' && startPan($event)"
    @pointermove="pan"
    @pointerup="stop"
    @pointercancel="stop"
  >
    <div
      class="grid w-max border border-base-300 bg-base-100"
      :style="{ gridTemplateColumns: `28px repeat(${cells[0].length}, ${cellSize}px)`, gridTemplateRows: `28px repeat(${cells.length}, ${cellSize}px)` }"
      role="grid"
      :aria-rowcount="cells.length"
      :aria-colcount="cells[0].length"
      @dragstart.prevent
    >
      <span class="sticky left-0 top-0 z-20 border-b border-r border-base-300 bg-base-200" aria-hidden="true"></span>
      <span
        v-for="column in cells[0].length"
        :key="`column-${column}`"
        class="sticky top-0 z-10 flex items-center justify-center border-b border-base-300 bg-base-200 text-[10px] font-medium"
        :class="{ 'section-column-end': column % 5 === 0 && column < cells[0].length, 'text-primary': selectedColumn === column - 1 }"
        role="columnheader"
        @pointerdown="tool === 'move' && startPan($event)"
      >{{ column }}</span>
      <template v-for="(row, rowIndex) in cells" :key="rowIndex">
        <span
          class="sticky left-0 z-10 flex items-center justify-center border-r border-base-300 bg-base-200 text-[10px] font-medium"
          :class="{ 'section-row-end': (rowIndex + 1) % 5 === 0 && rowIndex < cells.length - 1, 'text-primary': selectedRow === rowIndex }"
          role="rowheader"
          @pointerdown="tool === 'move' && startPan($event)"
        >{{ rowIndex + 1 }}</span>
        <div
          v-for="(color, columnIndex) in row"
          :key="columnIndex"
          class="pattern-cell"
          :class="{
            'outline-2 outline-offset-[-2px] outline-neutral': selectedRow === rowIndex && selectedColumn === columnIndex,
            'section-column-end': (columnIndex + 1) % 5 === 0 && columnIndex < row.length - 1,
            'section-row-end': (rowIndex + 1) % 5 === 0 && rowIndex < cells.length - 1,
          }"
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
