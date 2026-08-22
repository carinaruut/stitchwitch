<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { PatternAnnotation, PatternDisplay, PatternGrid } from '../types/pattern'
import type { TrackerProgress } from '../types/tracker'
import { contrastColor } from '../utils/colors'
import { followsCenterBoundary, isCenterHeader, repeatOutlineColor, REPEAT_COPY } from '../utils/grid'
import { isStitchCompleted, rowCompletionRange, stitchOrdinal } from '../utils/tracker'
import { renderAnnotations } from '../utils/annotations'
import AnnotationLayer from './AnnotationLayer.vue'

const props = defineProps<{
  cells: PatternGrid
  rowHeaders: number[]
  columnHeaders: number[]
  repeatFlags: number[][]
  repeatColorIndices: number[][]
  cellSize: number
  display: PatternDisplay
  progress: TrackerProgress
  autoScroll: boolean
  symbols?: Record<string, string>
  focusedColor?: string | null
  annotations: PatternAnnotation[]
  cellSourceRows: number[][]
  cellSourceColumns: number[][]
  showAnnotations: boolean
}>()

const { t } = useI18n({ useScope: 'global' })

const emit = defineEmits<{
  stitch: [row: number, column: number]
  row: [row: number]
  'fullscreen-change': [active: boolean]
}>()

const fullscreenTarget = ref<HTMLElement | null>(null)
const viewport = ref<HTMLElement | null>(null)
const activeCell = ref({ row: 0, column: 0 })
const activeRowHeader = ref(0)
const isFullscreen = ref(false)
const marking = ref(false)
const markedCells = new Set<string>()
const renderedAnnotations = computed(() => props.showAnnotations ? renderAnnotations(props.annotations, props.cellSourceRows, props.cellSourceColumns) : [])

function handleFullscreenChange() {
  isFullscreen.value = document.fullscreenElement === fullscreenTarget.value
  emit('fullscreen-change', isFullscreen.value)
}

async function enterFullscreen() {
  await fullscreenTarget.value?.requestFullscreen()
}

async function exitFullscreen() {
  if (document.fullscreenElement === fullscreenTarget.value) await document.exitFullscreen()
}

defineExpose({ enterFullscreen, exitFullscreen })

onMounted(() => {
  document.addEventListener('fullscreenchange', handleFullscreenChange)
  window.addEventListener('pointerup', stopMarking)
  window.addEventListener('pointercancel', stopMarking)
})
onBeforeUnmount(() => {
  document.removeEventListener('fullscreenchange', handleFullscreenChange)
  window.removeEventListener('pointerup', stopMarking)
  window.removeEventListener('pointercancel', stopMarking)
})

function ordinal(row: number, column: number) {
  return stitchOrdinal(row, column, props.cells.length, props.cells[0].length, props.progress)
}

function rowComplete(row: number) {
  if (props.progress.completionMode === 'individual') {
    return props.cells[row].every((_, column) => isStitchCompleted(row, column, props.cells.length, props.cells[0].length, props.progress))
  }
  return props.progress.completedCount >= rowCompletionRange(row, props.cells.length, props.cells[0].length, props.progress.startRow).through
}

function cellComplete(row: number, column: number) {
  return isStitchCompleted(row, column, props.cells.length, props.cells[0].length, props.progress)
}

function colorFocused(row: number, column: number) {
  return props.focusedColor != null && props.cells[row]?.[column] === props.focusedColor
}

function nextStitch(row: number, column: number) {
  return props.progress.completionMode === 'sequential' && ordinal(row, column) === props.progress.completedCount
}

function rowDirection(row: number) {
  const logicalRow = props.progress.startRow === 'top' ? row : props.cells.length - row - 1
  if (!props.progress.alternateRows || logicalRow % 2 === 0) return props.progress.firstRowDirection
  return props.progress.firstRowDirection === 'left-to-right' ? 'right-to-left' : 'left-to-right'
}

function scrollAfterStitch(row: number, column: number) {
  const container = viewport.value
  const cell = container?.querySelector<HTMLElement>(`[data-tracker-cell="${row}-${column}"]`)
  if (!container || !cell) return

  const viewportRect = container.getBoundingClientRect()
  const cellRect = cell.getBoundingClientRect()
  const gridHeaderSize = 32
  const visibleLeft = viewportRect.left + gridHeaderSize
  const pageScrollsVertically = !isFullscreen.value && container.scrollHeight <= container.clientHeight + 1
  const visibleTop = pageScrollsVertically ? Math.max(viewportRect.top + gridHeaderSize, 0) : viewportRect.top + gridHeaderSize
  const visibleBottom = pageScrollsVertically ? Math.min(viewportRect.bottom, window.innerHeight) : viewportRect.bottom
  const horizontalMidpoint = (visibleLeft + viewportRect.right) / 2
  const verticalMidpoint = (visibleTop + visibleBottom) / 2
  const cellCenterX = (cellRect.left + cellRect.right) / 2
  const cellCenterY = (cellRect.top + cellRect.bottom) / 2
  const keepVisible = props.cellSize * 5
  const direction = rowDirection(row)
  let left = 0
  let top = 0

  if (direction === 'left-to-right' && cellCenterX > horizontalMidpoint) left = cellRect.left - visibleLeft - keepVisible
  if (direction === 'right-to-left' && cellCenterX < horizontalMidpoint) left = cellRect.right - viewportRect.right + keepVisible
  if (props.progress.startRow === 'top' && cellCenterY > verticalMidpoint) top = cellRect.top - visibleTop - keepVisible
  if (props.progress.startRow === 'bottom' && cellCenterY < verticalMidpoint) top = cellRect.bottom - visibleBottom + keepVisible

  if (pageScrollsVertically && top) {
    const boundaryRow = props.progress.startRow === 'top' ? props.cells.length - 1 : 0
    const boundaryCell = container.querySelector<HTMLElement>(`[data-tracker-cell="${boundaryRow}-0"]`)
    const boundaryRect = boundaryCell?.getBoundingClientRect()
    if (boundaryRect) {
      if (props.progress.startRow === 'top') top = Math.min(top, Math.max(0, boundaryRect.bottom - window.innerHeight))
      else {
        const gridTop = container.querySelector<HTMLElement>('[role="grid"]')?.getBoundingClientRect().top ?? boundaryRect.top - gridHeaderSize
        top = Math.max(top, Math.min(0, gridTop))
      }
    }
  } else if (top) {
    if (props.progress.startRow === 'top') {
      const remainingScroll = container.scrollHeight - container.clientHeight - container.scrollTop
      top = Math.min(top, Math.max(0, remainingScroll))
    } else {
      top = Math.max(top, -container.scrollTop)
    }
  }

  if (pageScrollsVertically) {
    if (left) container.scrollBy({ left, behavior: 'smooth' })
    if (top) window.scrollBy({ top, behavior: 'smooth' })
  } else if (left || top) {
    container.scrollBy({ left, top, behavior: 'smooth' })
  }
}

function selectStitch(row: number, column: number) {
  const movesProgressForward = props.progress.completionMode === 'sequential' && ordinal(row, column) >= props.progress.completedCount
  emit('stitch', row, column)
  if (props.autoScroll && movesProgressForward) void nextTick(() => scrollAfterStitch(row, column))
}

function markStitch(row: number, column: number) {
  const cell = `${row}-${column}`
  if (markedCells.has(cell)) return
  markedCells.add(cell)
  selectStitch(row, column)
}

function startMarking(row: number, column: number, event: PointerEvent) {
  if (event.button !== 0) return
  event.preventDefault()
  marking.value = true
  markedCells.clear()
  markStitch(row, column)
}

function continueMarking(row: number, column: number, event: PointerEvent) {
  if (marking.value && event.buttons === 1) markStitch(row, column)
}

function stopMarking() {
  marking.value = false
  markedCells.clear()
}

function selectStitchFromClick(row: number, column: number, event: MouseEvent) {
  if (event.detail === 0) selectStitch(row, column)
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
  <div
    ref="fullscreenTarget"
    class="tracker-fullscreen relative w-full min-w-0 bg-base-100"
  >
    <div
      ref="viewport"
      class="tracker-viewport w-full min-w-0 overflow-x-auto rounded-box border border-base-300/70 bg-base-100 p-3"
      :aria-label="t('tracker.grid.label')"
    >
      <div
        class="relative grid w-max border border-base-300/70 bg-base-100"
        :style="{ gridTemplateColumns: `32px repeat(${cells[0].length}, ${cellSize}px)`, gridTemplateRows: `32px repeat(${cells.length}, ${cellSize}px)` }"
        role="grid"
        :aria-rowcount="cells.length + 1"
        :aria-colcount="cells[0].length + 1"
      >
        <div
          class="contents"
          role="row"
          aria-rowindex="1"
        >
          <span
            class="sticky left-0 top-0 z-20 border-b border-r border-base-300/70 bg-base-100"
            aria-hidden="true"
          />
          <span
            v-for="column in cells[0].length"
            :key="`column-${column}`"
            class="sticky top-0 z-10 flex items-center justify-center border-b border-base-300/70 bg-base-100 font-mono text-[10px] font-medium tabular-nums text-base-content/60"
            :class="{ 'section-column-end': (columnHeaders[column - 1] + 1) % 5 === 0 && column < cells[0].length, 'center-axis-label': isCenterHeader(column - 1, cells[0].length), 'center-column-marker': followsCenterBoundary(column - 1, cells[0].length) }"
            role="columnheader"
            :aria-colindex="column + 1"
          >{{ columnHeaders[column - 1] + 1 }}</span>
        </div>

        <div
          v-for="(row, rowIndex) in cells"
          :key="rowIndex"
          class="contents"
          role="row"
          :aria-rowindex="rowIndex + 2"
        >
          <button
            :data-tracker-row="rowIndex"
            class="sticky left-0 z-10 flex items-center justify-center border-0 border-r border-base-300/70 bg-base-100 p-0 font-mono text-[10px] font-medium tabular-nums text-base-content/60 hover:bg-base-200 focus-visible:z-20 focus-visible:outline-2 focus-visible:outline-primary"
            :class="{
              'section-row-end': (rowHeaders[rowIndex] + 1) % 5 === 0 && rowIndex < cells.length - 1,
              'bg-success/15! font-bold text-success!': rowComplete(rowIndex),
              'center-axis-label': isCenterHeader(rowIndex, cells.length),
              'center-row-marker': followsCenterBoundary(rowIndex, cells.length),
            }"
            type="button"
            role="rowheader"
            aria-colindex="1"
            :tabindex="activeRowHeader === rowIndex ? 0 : -1"
            :aria-label="rowComplete(rowIndex) ? t('tracker.grid.reopenRow', { row: rowHeaders[rowIndex] + 1 }) : t(progress.completionMode === 'individual' ? 'tracker.grid.completeRow' : 'tracker.grid.completeThroughRow', { row: rowHeaders[rowIndex] + 1 })"
            @focus="activeRowHeader = rowIndex"
            @click="$emit('row', rowIndex)"
            @keydown="moveRowHeader(rowIndex, $event)"
          >
            {{ rowHeaders[rowIndex] + 1 }}
          </button>

          <button
            v-for="(color, columnIndex) in row"
            :key="columnIndex"
            :data-tracker-cell="`${rowIndex}-${columnIndex}`"
            class="pattern-cell tracker-cell relative"
            :class="{
              'bg-transparent': display !== 'canvas',
              'tracker-cell-complete': cellComplete(rowIndex, columnIndex),
              'tracker-cell-next': nextStitch(rowIndex, columnIndex),
              'tracker-color-focused': colorFocused(rowIndex, columnIndex),
              'tracker-color-focus-top': colorFocused(rowIndex, columnIndex) && !colorFocused(rowIndex - 1, columnIndex),
              'tracker-color-focus-bottom': colorFocused(rowIndex, columnIndex) && !colorFocused(rowIndex + 1, columnIndex),
              'tracker-color-focus-left': colorFocused(rowIndex, columnIndex) && !colorFocused(rowIndex, columnIndex - 1),
              'tracker-color-focus-right': colorFocused(rowIndex, columnIndex) && !colorFocused(rowIndex, columnIndex + 1),
              'section-column-end': (columnHeaders[columnIndex] + 1) % 5 === 0 && columnIndex < row.length - 1,
              'section-row-end': (rowHeaders[rowIndex] + 1) % 5 === 0 && rowIndex < cells.length - 1,
              'repeat-copy-cell': (repeatFlags[rowIndex][columnIndex] & REPEAT_COPY) !== 0,
            }"
            :style="{ backgroundColor: display === 'canvas' ? color : undefined, '--repeat-color': repeatOutlineColor(repeatColorIndices[rowIndex][columnIndex]) }"
            type="button"
            role="gridcell"
            :aria-rowindex="rowIndex + 2"
            :aria-colindex="columnIndex + 2"
            :tabindex="activeCell.row === rowIndex && activeCell.column === columnIndex ? 0 : -1"
            :aria-selected="cellComplete(rowIndex, columnIndex)"
            :aria-label="t('tracker.grid.cell', { row: rowHeaders[rowIndex] + 1, column: columnHeaders[columnIndex] + 1, status: cellComplete(rowIndex, columnIndex) ? t('tracker.grid.completed') : nextStitch(rowIndex, columnIndex) ? t('tracker.grid.nextStitch') : t('tracker.grid.notCompleted') })"
            @focus="activeCell = { row: rowIndex, column: columnIndex }"
            @pointerdown="startMarking(rowIndex, columnIndex, $event)"
            @pointerenter="continueMarking(rowIndex, columnIndex, $event)"
            @pointercancel="stopMarking"
            @click="selectStitchFromClick(rowIndex, columnIndex, $event)"
            @keydown="moveCell(rowIndex, columnIndex, $event)"
          >
            <span
              v-if="display !== 'canvas'"
              class="tracker-stitch"
              :class="`tracker-stitch-${display}`"
              :style="{ '--stitch-color': color }"
              aria-hidden="true"
            />
            <span
              v-if="symbols?.[color]"
              class="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center font-bold leading-none"
              :style="{ color: contrastColor(color), fontSize: `${Math.max(8, Math.min(16, cellSize * 0.45))}px` }"
              aria-hidden="true"
            >{{ symbols[color] }}</span>
          </button>
        </div>
        <AnnotationLayer
          v-if="showAnnotations"
          :annotations="renderedAnnotations"
          :rows="cells.length"
          :columns="cells[0].length"
          :header-size="32"
        />
      </div>
    </div>
    <button
      v-if="isFullscreen"
      class="btn btn-neutral btn-square btn-sm absolute right-4 top-4 z-30 shadow-lg"
      type="button"
      :aria-label="t('tracker.controls.exitFullscreen')"
      :title="t('tracker.controls.exitFullscreen')"
      @click="exitFullscreen"
    >
      <span
        class="mdi mdi-fullscreen-exit text-xl"
        aria-hidden="true"
      />
    </button>
  </div>
</template>

<style scoped>
.tracker-stitch {
  background: var(--stitch-color);
  inset: 1px;
  pointer-events: none;
  position: absolute;
}

.tracker-fullscreen:fullscreen .tracker-viewport {
  border: 0;
  border-radius: 0;
  height: 100dvh;
  min-height: 0;
  overflow-y: auto;
}

.tracker-stitch-knit {
  inset: -2px 0;
  mask: url('/assets/stitch_1.webp') center / 100% 100% no-repeat;
  -webkit-mask: url('/assets/stitch_1.webp') center / 100% 100% no-repeat;
}

.tracker-stitch-cross-stitch {
  mask: url('/assets/stitch_2.webp') center / 100% 100% no-repeat;
  -webkit-mask: url('/assets/stitch_2.webp') center / 100% 100% no-repeat;
}

.tracker-stitch-single-crochet {
  inset: 0;
  mask: url('/assets/stitch_3.webp') center / 100% 100% no-repeat;
  -webkit-mask: url('/assets/stitch_3.webp') center / 100% 100% no-repeat;
}

.tracker-stitch::after {
  content: '';
  inset: 0;
  mix-blend-mode: multiply;
  position: absolute;
}

.tracker-color-focused {
  z-index: 2;
}

.tracker-color-focused::before {
  background: color-mix(in oklab, var(--color-secondary) 25%, transparent);
  content: '';
  inset: 0;
  pointer-events: none;
  position: absolute;
  z-index: 2;
}

.tracker-color-focus-top {
  border-top: 3px solid var(--color-secondary) !important;
}

.tracker-color-focus-bottom {
  border-bottom: 3px solid var(--color-secondary) !important;
}

.tracker-color-focus-left {
  border-left: 3px solid var(--color-secondary) !important;
}

.tracker-color-focus-right {
  border-right: 3px solid var(--color-secondary) !important;
}

.tracker-stitch-knit::after {
  background: url('/assets/stitch_1.webp') center / 100% 100% no-repeat;
}

.tracker-stitch-cross-stitch::after {
  background: url('/assets/stitch_2.webp') center / 100% 100% no-repeat;
}

.tracker-stitch-single-crochet::after {
  background: url('/assets/stitch_3.webp') center / 100% 100% no-repeat;
}
</style>
