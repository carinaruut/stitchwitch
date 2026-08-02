<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import type { DrawingTool, PatternGrid } from '../types/pattern'

const props = defineProps<{ cells: PatternGrid; cellSize: number; selectedRow: number; selectedColumn: number; tool: DrawingTool }>()
const emit = defineEmits<{
  strokeStart: []
  paint: [row: number, column: number]
  strokeEnd: []
  selectRow: [row: number]
  rowAction: [action: 'above' | 'below' | 'multiple' | 'delete' | 'fill' | 'erase', row: number, count?: number]
  selectColumn: [column: number]
  columnAction: [action: 'before' | 'after' | 'multiple' | 'delete' | 'fill' | 'erase', column: number, count?: number]
}>()
const viewport = ref<HTMLElement | null>(null)
const drawing = ref(false)
const panning = ref(false)
const rowMenu = ref<{ row: number; x: number; y: number } | null>(null)
const columnMenu = ref<{ column: number; x: number; y: number } | null>(null)
const multipleCount = ref(5)
const multipleColumnCount = ref(5)
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

function openRowMenu(row: number, event: MouseEvent | KeyboardEvent) {
  if (props.tool === 'move') return
  event.preventDefault()
  event.stopPropagation()
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const x = event instanceof MouseEvent ? event.clientX : rect.right
  const y = event instanceof MouseEvent ? event.clientY : rect.top
  emit('selectRow', row)
  columnMenu.value = null
  rowMenu.value = {
    row,
    x: Math.max(8, Math.min(x, window.innerWidth - 240)),
    y: Math.max(8, Math.min(y, window.innerHeight - 390)),
  }
}

function openColumnMenu(column: number, event: MouseEvent | KeyboardEvent) {
  if (props.tool === 'move') return
  event.preventDefault()
  event.stopPropagation()
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const x = event instanceof MouseEvent ? event.clientX : rect.left
  const y = event instanceof MouseEvent ? event.clientY : rect.bottom
  emit('selectColumn', column)
  rowMenu.value = null
  columnMenu.value = {
    column,
    x: Math.max(8, Math.min(x, window.innerWidth - 240)),
    y: Math.max(8, Math.min(y, window.innerHeight - 390)),
  }
}

function runRowAction(action: 'above' | 'below' | 'multiple' | 'delete' | 'fill' | 'erase') {
  if (!rowMenu.value) return
  emit('rowAction', action, rowMenu.value.row, action === 'multiple' ? multipleCount.value : undefined)
  rowMenu.value = null
}

function runColumnAction(action: 'before' | 'after' | 'multiple' | 'delete' | 'fill' | 'erase') {
  if (!columnMenu.value) return
  emit('columnAction', action, columnMenu.value.column, action === 'multiple' ? multipleColumnCount.value : undefined)
  columnMenu.value = null
}

function closeRowMenu() {
  rowMenu.value = null
  columnMenu.value = null
}

function handleEscape(event: KeyboardEvent) {
  if (event.key === 'Escape') closeRowMenu()
}

function keyboardPaint(row: number, column: number) {
  if (props.tool === 'move') return
  emit('strokeStart')
  emit('paint', row, column)
  emit('strokeEnd')
}

onMounted(() => {
  window.addEventListener('pointerup', stop)
  window.addEventListener('click', closeRowMenu)
  window.addEventListener('keydown', handleEscape)
})
onBeforeUnmount(() => {
  window.removeEventListener('pointerup', stop)
  window.removeEventListener('click', closeRowMenu)
  window.removeEventListener('keydown', handleEscape)
})
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
        tabindex="0"
        :aria-label="`Column ${column}. Open column actions.`"
        @pointerdown="tool === 'move' && startPan($event)"
        @click="openColumnMenu(column - 1, $event)"
        @contextmenu="openColumnMenu(column - 1, $event)"
        @keydown.enter.prevent="openColumnMenu(column - 1, $event)"
        @keydown.space.prevent="openColumnMenu(column - 1, $event)"
      >{{ column }}</span>
      <template v-for="(row, rowIndex) in cells" :key="rowIndex">
        <span
          class="sticky left-0 z-10 flex items-center justify-center border-r border-base-300 bg-base-200 text-[10px] font-medium"
          :class="{ 'section-row-end': (rowIndex + 1) % 5 === 0 && rowIndex < cells.length - 1, 'text-primary': selectedRow === rowIndex }"
          role="rowheader"
          tabindex="0"
          :aria-label="`Row ${rowIndex + 1}. Open row actions.`"
          @pointerdown="tool === 'move' && startPan($event)"
          @click="openRowMenu(rowIndex, $event)"
          @contextmenu="openRowMenu(rowIndex, $event)"
          @keydown.enter.prevent="openRowMenu(rowIndex, $event)"
          @keydown.space.prevent="openRowMenu(rowIndex, $event)"
        >{{ rowIndex + 1 }}</span>
        <div
          v-for="(color, columnIndex) in row"
          :key="columnIndex"
          class="pattern-cell"
          :class="{
            'outline-2 outline-offset-[-2px] outline-neutral': selectedRow === rowIndex && selectedColumn === columnIndex,
            'section-column-end': (columnIndex + 1) % 5 === 0 && columnIndex < row.length - 1,
            'section-row-end': (rowIndex + 1) % 5 === 0 && rowIndex < cells.length - 1,
            'row-action-selected': rowMenu?.row === rowIndex,
            'column-action-selected': columnMenu?.column === columnIndex,
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

  <div
    v-if="rowMenu"
    class="fixed z-[80] w-56 rounded-box border border-base-300 bg-base-100 p-2"
    :style="{ left: `${rowMenu.x}px`, top: `${rowMenu.y}px` }"
    role="menu"
    :aria-label="`Actions for row ${rowMenu.row + 1}`"
    @click.stop
  >
    <p class="px-3 py-2 text-xs font-semibold text-base-content/60">ROW {{ rowMenu.row + 1 }}</p>
    <ul class="menu menu-sm w-full p-0">
      <li><button type="button" role="menuitem" @click="runRowAction('above')"><span class="mdi mdi-arrow-up" aria-hidden="true"></span>Add row above</button></li>
      <li><button type="button" role="menuitem" @click="runRowAction('below')"><span class="mdi mdi-arrow-down" aria-hidden="true"></span>Add row below</button></li>
    </ul>
    <div class="my-1 flex items-center gap-2 border-y border-base-300 px-3 py-2">
      <label class="text-xs" for="multiple-rows">Add rows</label>
      <input id="multiple-rows" v-model.number="multipleCount" class="input input-bordered input-xs min-w-0 flex-1" type="number" min="1" max="50" />
      <button class="btn btn-primary btn-xs btn-square" type="button" aria-label="Add multiple rows below" @click="runRowAction('multiple')"><span class="mdi mdi-plus" aria-hidden="true"></span></button>
    </div>
    <ul class="menu menu-sm w-full p-0">
      <li><button type="button" role="menuitem" @click="runRowAction('fill')"><span class="mdi mdi-format-color-fill" aria-hidden="true"></span>Fill with selected color</button></li>
      <li><button type="button" role="menuitem" @click="runRowAction('erase')"><span class="mdi mdi-eraser" aria-hidden="true"></span>Erase row</button></li>
      <li><button class="text-error" type="button" role="menuitem" :disabled="cells.length <= 1" @click="runRowAction('delete')"><span class="mdi mdi-delete-outline" aria-hidden="true"></span>Delete row</button></li>
    </ul>
  </div>

  <div
    v-if="columnMenu"
    class="fixed z-[80] w-56 rounded-box border border-base-300 bg-base-100 p-2"
    :style="{ left: `${columnMenu.x}px`, top: `${columnMenu.y}px` }"
    role="menu"
    :aria-label="`Actions for column ${columnMenu.column + 1}`"
    @click.stop
  >
    <p class="px-3 py-2 text-xs font-semibold text-base-content/60">COLUMN {{ columnMenu.column + 1 }}</p>
    <ul class="menu menu-sm w-full p-0">
      <li><button type="button" role="menuitem" @click="runColumnAction('before')"><span class="mdi mdi-arrow-left" aria-hidden="true"></span>Add column before</button></li>
      <li><button type="button" role="menuitem" @click="runColumnAction('after')"><span class="mdi mdi-arrow-right" aria-hidden="true"></span>Add column after</button></li>
    </ul>
    <div class="my-1 flex items-center gap-2 border-y border-base-300 px-3 py-2">
      <label class="text-xs" for="multiple-columns">Add columns</label>
      <input id="multiple-columns" v-model.number="multipleColumnCount" class="input input-bordered input-xs min-w-0 flex-1" type="number" min="1" max="50" />
      <button class="btn btn-primary btn-xs btn-square" type="button" aria-label="Add multiple columns after" @click="runColumnAction('multiple')"><span class="mdi mdi-plus" aria-hidden="true"></span></button>
    </div>
    <ul class="menu menu-sm w-full p-0">
      <li><button type="button" role="menuitem" @click="runColumnAction('fill')"><span class="mdi mdi-format-color-fill" aria-hidden="true"></span>Fill with selected color</button></li>
      <li><button type="button" role="menuitem" @click="runColumnAction('erase')"><span class="mdi mdi-eraser" aria-hidden="true"></span>Erase column</button></li>
      <li><button class="text-error" type="button" role="menuitem" :disabled="cells[0].length <= 1" @click="runColumnAction('delete')"><span class="mdi mdi-delete-outline" aria-hidden="true"></span>Delete column</button></li>
    </ul>
  </div>
</template>
