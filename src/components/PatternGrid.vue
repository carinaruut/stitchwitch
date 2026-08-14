<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { DrawingTool, GridSelection, PatternGrid } from '../types/pattern'
import { followsCenterBoundary, isCenterHeader, REPEAT_BOTTOM, REPEAT_COPY, REPEAT_LEFT, REPEAT_RIGHT, REPEAT_TOP } from '../utils/grid'

const props = defineProps<{
  cells: PatternGrid
  cellSourceRows: number[][]
  cellSourceColumns: number[][]
  rowHeaders: number[]
  columnHeaders: number[]
  rowCopies: number[]
  columnCopies: number[]
  repeatFlags: number[][]
  sourceRows: number
  sourceColumns: number
  cellSize: number
  selectedRow: number
  selectedColumn: number
  selectedRows: number[]
  selectedColumns: number[]
  tool: DrawingTool
  selection: GridSelection | null
  placingSelection: boolean
  mirrorHorizontal: boolean
  mirrorVertical: boolean
}>()
const emit = defineEmits<{
  strokeStart: []
  paint: [row: number, column: number]
  strokeEnd: []
  selectRow: [row: number, extend: boolean, toggle: boolean]
  rowAction: [action: 'above' | 'below' | 'multiple' | 'delete' | 'fill' | 'erase', row: number, count?: number]
  selectColumn: [column: number, extend: boolean, toggle: boolean]
  columnAction: [action: 'before' | 'after' | 'multiple' | 'delete' | 'fill' | 'erase', column: number, count?: number]
  selectArea: [top: number, left: number, bottom: number, right: number]
  magicSelect: [row: number, column: number]
  clearSelection: []
  placeSelection: [row: number, column: number]
  moveSelection: [row: number, column: number]
}>()
const viewport = ref<HTMLElement | null>(null)
const drawing = ref(false)
const panning = ref(false)
const selecting = ref(false)
const draggingSelection = ref(false)
const dragPreview = ref<GridSelection | null>(null)
const rowMenu = ref<{ row: number; x: number; y: number } | null>(null)
const columnMenu = ref<{ column: number; x: number; y: number } | null>(null)
const multipleCount = ref(5)
const multipleColumnCount = ref(5)
let panStartX = 0
let panStartY = 0
let scrollStartX = 0
let scrollStartY = 0
let selectionStartRow = 0
let selectionStartColumn = 0
let dragRowOffset = 0
let dragColumnOffset = 0

const visibleSelection = computed(() => dragPreview.value ?? props.selection)
const selectedCellKeys = computed(() => new Set(props.selection?.cells?.map(([row, column]) => `${row}:${column}`) ?? []))
const visibleCellKeys = computed(() => new Set(visibleSelection.value?.cells?.map(([row, column]) => `${row}:${column}`) ?? []))

function containsSelection(row: number, column: number) {
  if (!props.selection || row < props.selection.top || row > props.selection.bottom || column < props.selection.left || column > props.selection.right) return false
  return !props.selection.cells || selectedCellKeys.value.has(`${row}:${column}`)
}

function visibleContains(row: number, column: number) {
  const current = visibleSelection.value
  if (!current || row < current.top || row > current.bottom || column < current.left || column > current.right) return false
  return !current.cells || visibleCellKeys.value.has(`${row}:${column}`)
}

function selectionAt(top: number, left: number): GridSelection {
  const current = props.selection!
  const rowOffset = top - current.top
  const columnOffset = left - current.left
  return {
    top,
    left,
    bottom: top + current.bottom - current.top,
    right: left + current.right - current.left,
    cells: current.cells?.map(([row, column]) => [row + rowOffset, column + columnOffset]),
  }
}

function selectedRowStartsAt(displayRow: number) {
  return props.selectedRows.includes(props.rowHeaders[displayRow])
    && (displayRow === 0 || !props.selectedRows.includes(props.rowHeaders[displayRow - 1]))
}

function selectedRowEndsAt(displayRow: number) {
  return props.selectedRows.includes(props.rowHeaders[displayRow])
    && (displayRow === props.rowHeaders.length - 1 || !props.selectedRows.includes(props.rowHeaders[displayRow + 1]))
}

function selectedColumnStartsAt(displayColumn: number) {
  return props.selectedColumns.includes(props.columnHeaders[displayColumn])
    && (displayColumn === 0 || !props.selectedColumns.includes(props.columnHeaders[displayColumn - 1]))
}

function selectedColumnEndsAt(displayColumn: number) {
  return props.selectedColumns.includes(props.columnHeaders[displayColumn])
    && (displayColumn === props.columnHeaders.length - 1 || !props.selectedColumns.includes(props.columnHeaders[displayColumn + 1]))
}

function verticalMirrorLeft(column: number) {
  return props.mirrorVertical && props.sourceColumns % 2 === 1 && column === Math.floor(props.sourceColumns / 2)
}

function verticalMirrorRight(column: number) {
  if (!props.mirrorVertical) return false
  const center = Math.floor(props.sourceColumns / 2)
  return column === (props.sourceColumns % 2 === 0 ? center - 1 : center)
}

function horizontalMirrorTop(row: number) {
  return props.mirrorHorizontal && props.sourceRows % 2 === 1 && row === Math.floor(props.sourceRows / 2)
}

function horizontalMirrorBottom(row: number) {
  if (!props.mirrorHorizontal) return false
  const center = Math.floor(props.sourceRows / 2)
  return row === (props.sourceRows % 2 === 0 ? center - 1 : center)
}

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

function start(row: number, column: number, displayRow: number, displayColumn: number, event: PointerEvent) {
  if (event.button !== 0) return
  if (props.tool === 'move') {
    startPan(event)
    return
  }
  if (props.tool === 'wand') {
    event.preventDefault()
    emit('magicSelect', row, column)
    return
  }
  if (props.tool === 'select') {
    event.preventDefault()
    const actualRow = props.rowHeaders[displayRow]
    const actualColumn = props.columnHeaders[displayColumn]
    if (props.placingSelection) {
      emit('placeSelection', actualRow, actualColumn)
      return
    }
    if (containsSelection(actualRow, actualColumn)) {
      draggingSelection.value = true
      dragRowOffset = actualRow - props.selection!.top
      dragColumnOffset = actualColumn - props.selection!.left
      dragPreview.value = { ...props.selection! }
      return
    }
    if (props.selection) {
      emit('clearSelection')
      return
    }
    selecting.value = true
    selectionStartRow = actualRow
    selectionStartColumn = actualColumn
    emit('selectArea', actualRow, actualColumn, actualRow, actualColumn)
    return
  }
  if (props.tool === 'fill') {
    event.preventDefault()
    emit('strokeStart')
    emit('paint', row, column)
    emit('strokeEnd')
    return
  }
  event.preventDefault()
  drawing.value = true
  emit('strokeStart')
  emit('paint', row, column)
}

function enter(row: number, column: number, displayRow: number, displayColumn: number, event: PointerEvent) {
  if (draggingSelection.value && event.buttons === 1 && props.selection) {
    const top = Math.max(0, props.rowHeaders[displayRow] - dragRowOffset)
    const left = Math.max(0, props.columnHeaders[displayColumn] - dragColumnOffset)
    dragPreview.value = selectionAt(top, left)
    return
  }
  if (selecting.value && event.buttons === 1) {
    emit('selectArea', selectionStartRow, selectionStartColumn, props.rowHeaders[displayRow], props.columnHeaders[displayColumn])
    return
  }
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
  if (draggingSelection.value && dragPreview.value) {
    if (!props.selection || dragPreview.value.top !== props.selection.top || dragPreview.value.left !== props.selection.left) {
      emit('moveSelection', dragPreview.value.top, dragPreview.value.left)
    }
  }
  draggingSelection.value = false
  dragPreview.value = null
  selecting.value = false
}

function openRowMenu(row: number, event: MouseEvent | KeyboardEvent) {
  if (props.tool === 'move') return
  event.preventDefault()
  event.stopPropagation()
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const x = event instanceof MouseEvent ? event.clientX : rect.right
  const y = event instanceof MouseEvent ? event.clientY : rect.top
  const toggle = event instanceof MouseEvent && event.type === 'click' && !event.shiftKey && props.selectedRows.length === 1 && props.selectedRows[0] === row
  emit('selectRow', row, event.shiftKey, toggle)
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
  const toggle = event instanceof MouseEvent && event.type === 'click' && !event.shiftKey && props.selectedColumns.length === 1 && props.selectedColumns[0] === column
  emit('selectColumn', column, event.shiftKey, toggle)
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

function keyboardSelect(displayRow: number, displayColumn: number) {
  if (props.tool === 'wand') {
    emit('magicSelect', props.cellSourceRows[displayRow][displayColumn], props.cellSourceColumns[displayRow][displayColumn])
    return
  }
  const row = props.rowHeaders[displayRow]
  const column = props.columnHeaders[displayColumn]
  if (props.placingSelection) emit('placeSelection', row, column)
  else emit('selectArea', row, column, row, column)
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
    class="h-[calc(100dvh-16rem)] min-h-80 w-full min-w-0 overflow-auto border border-base-300/70 bg-base-100 p-3"
    :class="tool === 'move' ? (panning ? 'cursor-grabbing touch-none' : 'cursor-grab touch-none') : tool === 'select' ? (placingSelection ? 'cursor-copy' : 'cursor-crosshair') : tool === 'wand' ? 'cursor-crosshair' : ''"
    aria-label="Editable pattern grid"
    @pointerdown.self="tool === 'move' && startPan($event)"
    @pointermove="pan"
    @pointerup="stop"
    @pointercancel="stop"
  >
    <div
      class="grid w-max border border-base-300/70 bg-base-100"
      :style="{ gridTemplateColumns: `28px repeat(${cells[0].length}, ${cellSize}px)`, gridTemplateRows: `28px repeat(${cells.length}, ${cellSize}px)` }"
      role="grid"
      :aria-rowcount="cells.length"
      :aria-colcount="cells[0].length"
      @dragstart.prevent
    >
      <span class="sticky left-0 top-0 z-20 border-b border-r border-base-300/70 bg-base-100" aria-hidden="true"></span>
      <span
        v-for="column in cells[0].length"
        :key="`column-${column}`"
        class="sticky top-0 z-10 flex items-center justify-center border-b border-base-300/70 bg-base-100 font-mono text-[10px] font-medium tabular-nums text-base-content/55 hover:bg-base-200"
        :class="{ 'section-column-end': (columnHeaders[column - 1] + 1) % 5 === 0 && column < cells[0].length, 'bg-primary/10! font-bold text-primary!': selectedColumns.includes(columnHeaders[column - 1]), 'bg-secondary/10!': columnCopies[column - 1] > 0, 'center-axis-label': isCenterHeader(column - 1, cells[0].length), 'center-column-marker': followsCenterBoundary(column - 1, cells[0].length) }"
        role="columnheader"
        tabindex="0"
        :aria-selected="selectedColumns.includes(columnHeaders[column - 1])"
        :aria-label="`Column ${columnHeaders[column - 1] + 1}${columnCopies[column - 1] > 0 ? ', repeated copy' : ''}. Open column actions. Shift-click to select a range.`"
        @pointerdown="tool === 'move' && startPan($event)"
        @click="openColumnMenu(columnHeaders[column - 1], $event)"
        @contextmenu="openColumnMenu(columnHeaders[column - 1], $event)"
        @keydown.enter.prevent="openColumnMenu(columnHeaders[column - 1], $event)"
        @keydown.space.prevent="openColumnMenu(columnHeaders[column - 1], $event)"
      >{{ columnHeaders[column - 1] + 1 }}</span>
      <template v-for="(row, rowIndex) in cells" :key="rowIndex">
        <span
          class="sticky left-0 z-10 flex items-center justify-center border-r border-base-300/70 bg-base-100 font-mono text-[10px] font-medium tabular-nums text-base-content/55 hover:bg-base-200"
          :class="{ 'section-row-end': (rowHeaders[rowIndex] + 1) % 5 === 0 && rowIndex < cells.length - 1, 'bg-primary/10! font-bold text-primary!': selectedRows.includes(rowHeaders[rowIndex]), 'bg-secondary/10!': rowCopies[rowIndex] > 0, 'center-axis-label': isCenterHeader(rowIndex, cells.length), 'center-row-marker': followsCenterBoundary(rowIndex, cells.length) }"
          role="rowheader"
          tabindex="0"
          :aria-selected="selectedRows.includes(rowHeaders[rowIndex])"
          :aria-label="`Row ${rowHeaders[rowIndex] + 1}${rowCopies[rowIndex] > 0 ? ', repeated copy' : ''}. Open row actions. Shift-click to select a range.`"
          @pointerdown="tool === 'move' && startPan($event)"
          @click="openRowMenu(rowHeaders[rowIndex], $event)"
          @contextmenu="openRowMenu(rowHeaders[rowIndex], $event)"
          @keydown.enter.prevent="openRowMenu(rowHeaders[rowIndex], $event)"
          @keydown.space.prevent="openRowMenu(rowHeaders[rowIndex], $event)"
        >{{ rowHeaders[rowIndex] + 1 }}</span>
        <div
          v-for="(color, columnIndex) in row"
          :key="columnIndex"
          class="pattern-cell"
          :class="{
            'outline-2 outline-offset-[-2px] outline-neutral': tool !== 'select' && tool !== 'wand' && selectedRows.length > 0 && selectedColumns.length > 0 && selectedRow === cellSourceRows[rowIndex][columnIndex] && selectedColumn === cellSourceColumns[rowIndex][columnIndex],
            'selection-border-top': visibleContains(rowHeaders[rowIndex], columnHeaders[columnIndex]) && !visibleContains(rowHeaders[rowIndex] - 1, columnHeaders[columnIndex]),
            'selection-border-bottom': visibleContains(rowHeaders[rowIndex], columnHeaders[columnIndex]) && !visibleContains(rowHeaders[rowIndex] + 1, columnHeaders[columnIndex]),
            'selection-border-left': visibleContains(rowHeaders[rowIndex], columnHeaders[columnIndex]) && !visibleContains(rowHeaders[rowIndex], columnHeaders[columnIndex] - 1),
            'selection-border-right': visibleContains(rowHeaders[rowIndex], columnHeaders[columnIndex]) && !visibleContains(rowHeaders[rowIndex], columnHeaders[columnIndex] + 1),
            'cursor-move': tool === 'select' && !placingSelection && containsSelection(rowHeaders[rowIndex], columnHeaders[columnIndex]),
            'mirror-axis-left': verticalMirrorLeft(columnHeaders[columnIndex]),
            'mirror-axis-right': verticalMirrorRight(columnHeaders[columnIndex]),
            'mirror-axis-top': horizontalMirrorTop(rowHeaders[rowIndex]),
            'mirror-axis-bottom': horizontalMirrorBottom(rowHeaders[rowIndex]),
            'section-column-end': (columnHeaders[columnIndex] + 1) % 5 === 0 && columnIndex < row.length - 1,
            'section-row-end': (rowHeaders[rowIndex] + 1) % 5 === 0 && rowIndex < cells.length - 1,
            'row-selection-top': selectedRowStartsAt(rowIndex),
            'row-selection-bottom': selectedRowEndsAt(rowIndex),
            'column-selection-left': selectedColumnStartsAt(columnIndex),
            'column-selection-right': selectedColumnEndsAt(columnIndex),
            'repeat-copy-cell': (repeatFlags[rowIndex][columnIndex] & REPEAT_COPY) !== 0,
            'repeat-border-left': (repeatFlags[rowIndex][columnIndex] & REPEAT_LEFT) !== 0,
            'repeat-border-right': (repeatFlags[rowIndex][columnIndex] & REPEAT_RIGHT) !== 0,
            'repeat-border-top': (repeatFlags[rowIndex][columnIndex] & REPEAT_TOP) !== 0,
            'repeat-border-bottom': (repeatFlags[rowIndex][columnIndex] & REPEAT_BOTTOM) !== 0,
          }"
          :style="{ backgroundColor: color }"
          role="gridcell"
          tabindex="0"
          :aria-label="`Row ${rowHeaders[rowIndex] + 1}, column ${columnHeaders[columnIndex] + 1}, color ${color}${(repeatFlags[rowIndex][columnIndex] & REPEAT_COPY) !== 0 || rowCopies[rowIndex] > 0 || columnCopies[columnIndex] > 0 ? ', repeated copy' : ''}`"
          @pointerdown="start(cellSourceRows[rowIndex][columnIndex], cellSourceColumns[rowIndex][columnIndex], rowIndex, columnIndex, $event)"
          @pointerenter="enter(cellSourceRows[rowIndex][columnIndex], cellSourceColumns[rowIndex][columnIndex], rowIndex, columnIndex, $event)"
          @keydown.enter.prevent="tool === 'select' || tool === 'wand' ? keyboardSelect(rowIndex, columnIndex) : keyboardPaint(cellSourceRows[rowIndex][columnIndex], cellSourceColumns[rowIndex][columnIndex])"
          @keydown.space.prevent="tool === 'select' || tool === 'wand' ? keyboardSelect(rowIndex, columnIndex) : keyboardPaint(cellSourceRows[rowIndex][columnIndex], cellSourceColumns[rowIndex][columnIndex])"
        ></div>
      </template>
    </div>
  </div>

  <div
    v-if="rowMenu"
    class="fixed z-[80] w-56 rounded-box border border-base-300 bg-base-100 p-2"
    :style="{ left: `${rowMenu.x}px`, top: `${rowMenu.y}px` }"
    role="menu"
    :aria-label="`Actions for ${selectedRows.length === 1 ? `row ${rowMenu.row + 1}` : `${selectedRows.length} selected rows`}`"
    @click.stop
  >
    <p class="px-3 py-2 text-xs font-semibold text-base-content/60">{{ selectedRows.length === 1 ? `ROW ${rowMenu.row + 1}` : `${selectedRows.length} ROWS SELECTED` }}</p>
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
      <li><button type="button" role="menuitem" @click="runRowAction('fill')"><span class="mdi mdi-format-color-fill" aria-hidden="true"></span>Fill selected {{ selectedRows.length === 1 ? 'row' : 'rows' }}</button></li>
      <li><button type="button" role="menuitem" @click="runRowAction('erase')"><span class="mdi mdi-eraser" aria-hidden="true"></span>Erase selected {{ selectedRows.length === 1 ? 'row' : 'rows' }}</button></li>
      <li><button class="text-error" type="button" role="menuitem" :disabled="sourceRows <= 1" @click="runRowAction('delete')"><span class="mdi mdi-delete-outline" aria-hidden="true"></span>Delete selected {{ selectedRows.length === 1 ? 'row' : 'rows' }}</button></li>
    </ul>
  </div>

  <div
    v-if="columnMenu"
    class="fixed z-[80] w-56 rounded-box border border-base-300 bg-base-100 p-2"
    :style="{ left: `${columnMenu.x}px`, top: `${columnMenu.y}px` }"
    role="menu"
    :aria-label="`Actions for ${selectedColumns.length === 1 ? `column ${columnMenu.column + 1}` : `${selectedColumns.length} selected columns`}`"
    @click.stop
  >
    <p class="px-3 py-2 text-xs font-semibold text-base-content/60">{{ selectedColumns.length === 1 ? `COLUMN ${columnMenu.column + 1}` : `${selectedColumns.length} COLUMNS SELECTED` }}</p>
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
      <li><button type="button" role="menuitem" @click="runColumnAction('fill')"><span class="mdi mdi-format-color-fill" aria-hidden="true"></span>Fill selected {{ selectedColumns.length === 1 ? 'column' : 'columns' }}</button></li>
      <li><button type="button" role="menuitem" @click="runColumnAction('erase')"><span class="mdi mdi-eraser" aria-hidden="true"></span>Erase selected {{ selectedColumns.length === 1 ? 'column' : 'columns' }}</button></li>
      <li><button class="text-error" type="button" role="menuitem" :disabled="sourceColumns <= 1" @click="runColumnAction('delete')"><span class="mdi mdi-delete-outline" aria-hidden="true"></span>Delete selected {{ selectedColumns.length === 1 ? 'column' : 'columns' }}</button></li>
    </ul>
  </div>
</template>
