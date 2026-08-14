<script setup lang="ts">
import { nextTick, ref } from 'vue'
import type { PatternGrid } from '../types/pattern'
import type { TrackerProgress } from '../types/tracker'
import { REPEAT_BOTTOM, REPEAT_COPY, REPEAT_LEFT, REPEAT_RIGHT, REPEAT_TOP } from '../utils/grid'
import { rowCompletionRange, stitchOrdinal } from '../utils/tracker'

const props = defineProps<{
  cells: PatternGrid
  rowHeaders: number[]
  columnHeaders: number[]
  repeatFlags: number[][]
  cellSize: number
  progress: TrackerProgress
}>()

defineEmits<{
  stitch: [row: number, column: number]
  row: [row: number]
}>()

const viewport = ref<HTMLElement | null>(null)
const activeCell = ref({ row: 0, column: 0 })
const activeRowHeader = ref(0)

function ordinal(row: number, column: number) {
  return stitchOrdinal(row, column, props.cells.length, props.cells[0].length, props.progress)
}

function rowComplete(row: number) {
  return props.progress.completedCount >= rowCompletionRange(row, props.cells.length, props.cells[0].length, props.progress.startRow).through
}

function focusCell(row: number, column: number) {
  const nextRow = Math.max(0, Math.min(props.cells.length - 1, row))
  const nextColumn = Math.max(0, Math.min(props.cells[0].length - 1, column))
  activeCell.value = { row: nextRow, column: nextColumn }
  void nextTick(() => viewport.value?.querySelector<HTMLElement>(`[data-tracker-cell="${nextRow}-${nextColumn}"]`)?.focus())
}

function moveCell(row: number, column: number, event: KeyboardEvent) {
  const moves: Record<string, [number, number]> = {
    ArrowUp: [row - 1, column],
    ArrowDown: [row + 1, column],
    ArrowLeft: [row, column - 1],
    ArrowRight: [row, column + 1],
    Home: [row, 0],
    End: [row, props.cells[0].length - 1],
  }
  const destination = moves[event.key]
  if (!destination) return
  event.preventDefault()
  focusCell(...destination)
}

function focusRowHeader(row: number) {
  const nextRow = Math.max(0, Math.min(props.cells.length - 1, row))
  activeRowHeader.value = nextRow
  void nextTick(() => viewport.value?.querySelector<HTMLElement>(`[data-tracker-row="${nextRow}"]`)?.focus())
}

function moveRowHeader(row: number, event: KeyboardEvent) {
  if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
  event.preventDefault()
  focusRowHeader(row + (event.key === 'ArrowUp' ? -1 : 1))
}
</script>

<template>
  <div ref="viewport" class="h-[calc(100dvh-21rem)] min-h-96 w-full min-w-0 overflow-auto rounded-box border border-base-300/70 bg-base-100 p-3" aria-label="Pattern progress tracker">
    <div
      class="grid w-max border border-base-300/70 bg-base-100"
      :style="{ gridTemplateColumns: `32px repeat(${cells[0].length}, ${cellSize}px)`, gridTemplateRows: `32px repeat(${cells.length}, ${cellSize}px)` }"
      role="grid"
      :aria-rowcount="cells.length + 1"
      :aria-colcount="cells[0].length + 1"
    >
      <div class="contents" role="row" aria-rowindex="1">
        <span class="sticky left-0 top-0 z-20 border-b border-r border-base-300/70 bg-base-100" aria-hidden="true"></span>
        <span
          v-for="column in cells[0].length"
          :key="`column-${column}`"
          class="sticky top-0 z-10 flex items-center justify-center border-b border-base-300/70 bg-base-100 font-mono text-[10px] font-medium tabular-nums text-base-content/60"
          :class="{ 'section-column-end': (columnHeaders[column - 1] + 1) % 5 === 0 && column < cells[0].length }"
          role="columnheader"
          :aria-colindex="column + 1"
        >{{ columnHeaders[column - 1] + 1 }}</span>
      </div>

      <div v-for="(row, rowIndex) in cells" :key="rowIndex" class="contents" role="row" :aria-rowindex="rowIndex + 2">
        <button
          :data-tracker-row="rowIndex"
          class="sticky left-0 z-10 flex items-center justify-center border-0 border-r border-base-300/70 bg-base-100 p-0 font-mono text-[10px] font-medium tabular-nums text-base-content/60 hover:bg-base-200 focus-visible:z-20 focus-visible:outline-2 focus-visible:outline-primary"
          :class="{
            'section-row-end': (rowHeaders[rowIndex] + 1) % 5 === 0 && rowIndex < cells.length - 1,
            'bg-success/15! font-bold text-success!': rowComplete(rowIndex),
          }"
          type="button"
          role="rowheader"
          aria-colindex="1"
          :tabindex="activeRowHeader === rowIndex ? 0 : -1"
          :aria-label="`${rowComplete(rowIndex) ? 'Reopen' : 'Complete through'} row ${rowHeaders[rowIndex] + 1}`"
          @focus="activeRowHeader = rowIndex"
          @click="$emit('row', rowIndex)"
          @keydown="moveRowHeader(rowIndex, $event)"
        >{{ rowHeaders[rowIndex] + 1 }}</button>

        <button
          v-for="(color, columnIndex) in row"
          :key="columnIndex"
          :data-tracker-cell="`${rowIndex}-${columnIndex}`"
          class="pattern-cell tracker-cell relative"
          :class="{
            'tracker-cell-complete': ordinal(rowIndex, columnIndex) < progress.completedCount,
            'tracker-cell-next': ordinal(rowIndex, columnIndex) === progress.completedCount,
            'section-column-end': (columnHeaders[columnIndex] + 1) % 5 === 0 && columnIndex < row.length - 1,
            'section-row-end': (rowHeaders[rowIndex] + 1) % 5 === 0 && rowIndex < cells.length - 1,
            'repeat-copy-cell': (repeatFlags[rowIndex][columnIndex] & REPEAT_COPY) !== 0,
            'repeat-border-left': (repeatFlags[rowIndex][columnIndex] & REPEAT_LEFT) !== 0,
            'repeat-border-right': (repeatFlags[rowIndex][columnIndex] & REPEAT_RIGHT) !== 0,
            'repeat-border-top': (repeatFlags[rowIndex][columnIndex] & REPEAT_TOP) !== 0,
            'repeat-border-bottom': (repeatFlags[rowIndex][columnIndex] & REPEAT_BOTTOM) !== 0,
          }"
          :style="{ backgroundColor: color }"
          type="button"
          role="gridcell"
          :aria-rowindex="rowIndex + 2"
          :aria-colindex="columnIndex + 2"
          :tabindex="activeCell.row === rowIndex && activeCell.column === columnIndex ? 0 : -1"
          :aria-selected="ordinal(rowIndex, columnIndex) < progress.completedCount"
          :aria-label="`Row ${rowHeaders[rowIndex] + 1}, column ${columnHeaders[columnIndex] + 1}, ${ordinal(rowIndex, columnIndex) < progress.completedCount ? 'completed' : ordinal(rowIndex, columnIndex) === progress.completedCount ? 'next stitch' : 'not completed'}`"
          @focus="activeCell = { row: rowIndex, column: columnIndex }"
          @click="$emit('stitch', rowIndex, columnIndex)"
          @keydown="moveCell(rowIndex, columnIndex, $event)"
        ></button>
      </div>
    </div>
  </div>
</template>
