<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { DrawingTool, GridSelection, PatternAnnotation, PatternGrid } from '../../../../types/pattern'
import { contrastColor } from '../../../../utils/colors'
import { followsCenterBoundary, isCenterHeader, repeatOutlineColor, REPEAT_BOTTOM, REPEAT_COPY, REPEAT_LEFT, REPEAT_RIGHT, REPEAT_TOP } from '../../../../utils/grid'
import { renderAnnotations } from '../../../../utils/annotations'
import AnnotationLayer from '../../../annotations/components/AnnotationLayer.vue'
import AnnotationComments from '../../../annotations/components/AnnotationComments.vue'
import { useGridContextMenus, type SelectionAction } from '../../composables/useGridContextMenus'
import { useGridPointerInteractions } from '../../composables/useGridPointerInteractions'
import AxisContextMenu from './AxisContextMenu.vue'
import SelectionContextMenu from './SelectionContextMenu.vue'

const props = defineProps<{
  cells: PatternGrid
  cellSourceRows: number[][]
  cellSourceColumns: number[][]
  rowHeaders: number[]
  columnHeaders: number[]
  rowCopies: number[]
  columnCopies: number[]
  repeatFlags: number[][]
  repeatColorIndices: number[][]
  sourceRows: number
  sourceColumns: number
  cellSize: number
  fullHeight: boolean
  selectedRow: number
  selectedColumn: number
  selectedRows: number[]
  selectedColumns: number[]
  tool: DrawingTool
  selection: GridSelection | null
  placingSelection: boolean
  canPaste: boolean
  mirrorHorizontal: boolean
  mirrorVertical: boolean
  symbols?: Record<string, string>
  annotations: PatternAnnotation[]
  selectedAnnotationId: string | null
  selectedCommentId: string | null
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
  magicSelect: [row: number, column: number, extend: boolean]
  selectionAction: [action: SelectionAction]
  clearSelection: []
  placeSelection: [row: number, column: number]
  moveSelection: [row: number, column: number]
  createAnnotation: [type: 'text' | 'marker' | 'arrow', row: number, column: number, endRow: number, endColumn: number]
  selectAnnotation: [id: string]
  updateAnnotation: [id: string, text: string]
  removeAnnotation: [id: string]
  moveAnnotation: [id: string, rowDelta: number, columnDelta: number]
  moveAnnotationEndpoint: [id: string, rowDelta: number, columnDelta: number]
}>()
const { t } = useI18n({ useScope: 'global' })
const viewport = ref<HTMLElement | null>(null)
const renderedAnnotations = computed(() => renderAnnotations(props.annotations, props.cellSourceRows, props.cellSourceColumns))
const renderedNonTextAnnotations = computed(() => renderedAnnotations.value.filter((annotation) => annotation.type !== 'text'))

const {
  containsSelection,
  enter,
  keyboardPaint,
  keyboardSelect,
  pan,
  panning,
  start,
  startPan,
  startViewportAction,
  stop,
  visibleContains,
} = useGridPointerInteractions({
  viewport,
  tool: () => props.tool,
  selection: () => props.selection,
  placingSelection: () => props.placingSelection,
  rowHeaders: () => props.rowHeaders,
  columnHeaders: () => props.columnHeaders,
  cellSourceRows: () => props.cellSourceRows,
  cellSourceColumns: () => props.cellSourceColumns,
  sourceColumns: () => props.sourceColumns,
  onStrokeStart: () => emit('strokeStart'),
  onPaint: (row, column) => emit('paint', row, column),
  onStrokeEnd: () => emit('strokeEnd'),
  onSelectArea: (top, left, bottom, right) => emit('selectArea', top, left, bottom, right),
  onMagicSelect: (row, column, extend) => emit('magicSelect', row, column, extend),
  onClearSelection: () => emit('clearSelection'),
  onPlaceSelection: (row, column) => emit('placeSelection', row, column),
  onMoveSelection: (row, column) => emit('moveSelection', row, column),
  onCreateAnnotation: (type, row, column, endRow, endColumn) => emit('createAnnotation', type, row, column, endRow, endColumn),
})

const {
  columnMenu,
  multipleColumnCount,
  multipleCount,
  openColumnMenu,
  openRowMenu,
  openSelectionMenu,
  rowMenu,
  runColumnAction,
  runRowAction,
  runSelectionAction,
  selectionMenu,
} = useGridContextMenus({
  tool: () => props.tool,
  selectedRows: () => props.selectedRows,
  selectedColumns: () => props.selectedColumns,
  containsSelection,
  onSelectRow: (row, extend, toggle) => emit('selectRow', row, extend, toggle),
  onSelectColumn: (column, extend, toggle) => emit('selectColumn', column, extend, toggle),
  onRowAction: (action, row, count) => emit('rowAction', action, row, count),
  onColumnAction: (action, column, count) => emit('columnAction', action, column, count),
  onSelectionAction: action => emit('selectionAction', action),
})

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
</script>

<template>
  <div
    ref="viewport"
    class="w-full min-w-0 border border-base-300/70 bg-base-100 p-3"
    :class="[fullHeight ? 'h-auto min-h-0 overflow-x-auto overflow-y-hidden' : 'h-[calc(100dvh-16rem)] min-h-80 overflow-auto', tool === 'move' ? (panning ? 'cursor-grabbing touch-none' : 'cursor-grab touch-none') : tool === 'select' ? (placingSelection ? 'cursor-copy' : 'cursor-crosshair') : tool === 'wand' ? 'cursor-crosshair' : '']"
    :aria-label="t('controls.patternGrid.label')"
    @pointerdown.self="startViewportAction"
    @pointermove="pan"
    @pointerup="stop"
    @pointercancel="stop"
  >
    <div
      class="relative grid w-max border border-base-300/70 bg-base-100"
      :style="{ gridTemplateColumns: `28px repeat(${cells[0].length}, ${cellSize}px)`, gridTemplateRows: `28px repeat(${cells.length}, ${cellSize}px)` }"
      role="grid"
      :aria-rowcount="cells.length"
      :aria-colcount="cells[0].length"
      @dragstart.prevent
    >
      <span
        class="sticky left-0 top-0 z-20 border-b border-r border-base-300/70 bg-base-100"
        aria-hidden="true"
      />
      <span
        v-for="column in cells[0].length"
        :key="`column-${column}`"
        class="sticky top-0 z-10 flex select-none items-center justify-center border-b border-base-300/70 bg-base-100 font-mono text-[10px] font-medium tabular-nums text-base-content/55 hover:bg-base-200"
        :class="{ 'section-column-end': (columnHeaders[column - 1] + 1) % 5 === 0 && column < cells[0].length, 'bg-secondary/20! font-bold text-secondary!': tool !== 'move' && selectedColumns.includes(columnHeaders[column - 1]), 'bg-secondary/10!': columnCopies[column - 1] > 0, 'center-axis-label': isCenterHeader(column - 1, cells[0].length), 'center-column-marker': followsCenterBoundary(column - 1, cells[0].length) }"
        role="columnheader"
        tabindex="0"
        :aria-selected="tool !== 'move' && selectedColumns.includes(columnHeaders[column - 1])"
        :aria-label="t(columnCopies[column - 1] > 0 ? 'controls.patternGrid.repeatedColumnHeader' : 'controls.patternGrid.columnHeader', { number: columnHeaders[column - 1] + 1 })"
        @pointerdown="tool === 'move' && startPan($event)"
        @click="openColumnMenu(columnHeaders[column - 1], $event)"
        @contextmenu="openColumnMenu(columnHeaders[column - 1], $event)"
        @keydown.enter.prevent="openColumnMenu(columnHeaders[column - 1], $event)"
        @keydown.space.prevent="openColumnMenu(columnHeaders[column - 1], $event)"
      >{{ columnHeaders[column - 1] + 1 }}</span>
      <template
        v-for="(row, rowIndex) in cells"
        :key="rowIndex"
      >
        <span
          class="sticky left-0 z-10 flex select-none items-center justify-center border-r border-base-300/70 bg-base-100 font-mono text-[10px] font-medium tabular-nums text-base-content/55 hover:bg-base-200"
          :class="{ 'section-row-end': (rowHeaders[rowIndex] + 1) % 5 === 0 && rowIndex < cells.length - 1, 'bg-secondary/20! font-bold text-secondary!': tool !== 'move' && selectedRows.includes(rowHeaders[rowIndex]), 'bg-secondary/10!': rowCopies[rowIndex] > 0, 'center-axis-label': isCenterHeader(rowIndex, cells.length), 'center-row-marker': followsCenterBoundary(rowIndex, cells.length) }"
          role="rowheader"
          tabindex="0"
          :aria-selected="tool !== 'move' && selectedRows.includes(rowHeaders[rowIndex])"
          :aria-label="t(rowCopies[rowIndex] > 0 ? 'controls.patternGrid.repeatedRowHeader' : 'controls.patternGrid.rowHeader', { number: rowHeaders[rowIndex] + 1 })"
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
            'outline-2 -outline-offset-2 outline-neutral': tool !== 'select' && tool !== 'wand' && tool !== 'move' && selectedRows.length > 0 && selectedColumns.length > 0 && selectedRow === cellSourceRows[rowIndex][columnIndex] && selectedColumn === cellSourceColumns[rowIndex][columnIndex],
            'selection-border-top': visibleContains(rowHeaders[rowIndex], columnHeaders[columnIndex]) && !visibleContains(rowHeaders[rowIndex] - 1, columnHeaders[columnIndex]),
            'selection-border-bottom': visibleContains(rowHeaders[rowIndex], columnHeaders[columnIndex]) && !visibleContains(rowHeaders[rowIndex] + 1, columnHeaders[columnIndex]),
            'selection-border-left': visibleContains(rowHeaders[rowIndex], columnHeaders[columnIndex]) && !visibleContains(rowHeaders[rowIndex], columnHeaders[columnIndex] - 1),
            'selection-border-right': visibleContains(rowHeaders[rowIndex], columnHeaders[columnIndex]) && !visibleContains(rowHeaders[rowIndex], columnHeaders[columnIndex] + 1),
            'selection-shade': visibleContains(rowHeaders[rowIndex], columnHeaders[columnIndex]),
            'cursor-move': tool === 'select' && !placingSelection && containsSelection(rowHeaders[rowIndex], columnHeaders[columnIndex]),
            'mirror-axis-left': verticalMirrorLeft(columnHeaders[columnIndex]),
            'mirror-axis-right': verticalMirrorRight(columnHeaders[columnIndex]),
            'mirror-axis-top': horizontalMirrorTop(rowHeaders[rowIndex]),
            'mirror-axis-bottom': horizontalMirrorBottom(rowHeaders[rowIndex]),
            'section-column-end': (columnHeaders[columnIndex] + 1) % 5 === 0 && columnIndex < row.length - 1,
            'section-row-end': (rowHeaders[rowIndex] + 1) % 5 === 0 && rowIndex < cells.length - 1,
            'row-selection-top': tool !== 'move' && selectedRowStartsAt(rowIndex),
            'row-selection-bottom': tool !== 'move' && selectedRowEndsAt(rowIndex),
            'column-selection-left': tool !== 'move' && selectedColumnStartsAt(columnIndex),
            'column-selection-right': tool !== 'move' && selectedColumnEndsAt(columnIndex),
            'repeat-copy-cell': (repeatFlags[rowIndex][columnIndex] & REPEAT_COPY) !== 0,
            'repeat-border-left': (repeatFlags[rowIndex][columnIndex] & REPEAT_LEFT) !== 0,
            'repeat-border-right': (repeatFlags[rowIndex][columnIndex] & REPEAT_RIGHT) !== 0,
            'repeat-border-top': (repeatFlags[rowIndex][columnIndex] & REPEAT_TOP) !== 0,
            'repeat-border-bottom': (repeatFlags[rowIndex][columnIndex] & REPEAT_BOTTOM) !== 0,
          }"
          :style="{ backgroundColor: color, '--repeat-color': repeatOutlineColor(repeatColorIndices[rowIndex][columnIndex]) }"
          role="gridcell"
          tabindex="0"
          :aria-label="t((repeatFlags[rowIndex][columnIndex] & REPEAT_COPY) !== 0 || rowCopies[rowIndex] > 0 || columnCopies[columnIndex] > 0 ? 'controls.patternGrid.repeatedCell' : 'controls.patternGrid.cell', { row: rowHeaders[rowIndex] + 1, column: columnHeaders[columnIndex] + 1, color })"
          @pointerdown="start(cellSourceRows[rowIndex][columnIndex], cellSourceColumns[rowIndex][columnIndex], rowIndex, columnIndex, $event)"
          @pointerenter="enter(cellSourceRows[rowIndex][columnIndex], cellSourceColumns[rowIndex][columnIndex], rowIndex, columnIndex, $event)"
          @contextmenu="openSelectionMenu(rowHeaders[rowIndex], columnHeaders[columnIndex], $event)"
          @keydown.enter.prevent="tool === 'select' || tool === 'wand' ? keyboardSelect(rowIndex, columnIndex, $event) : keyboardPaint(cellSourceRows[rowIndex][columnIndex], cellSourceColumns[rowIndex][columnIndex])"
          @keydown.space.prevent="tool === 'select' || tool === 'wand' ? keyboardSelect(rowIndex, columnIndex, $event) : keyboardPaint(cellSourceRows[rowIndex][columnIndex], cellSourceColumns[rowIndex][columnIndex])"
        >
          <span
            v-if="symbols?.[color]"
            class="pointer-events-none absolute inset-0 flex items-center justify-center font-bold leading-none"
            :style="{ color: contrastColor(color), fontSize: `${Math.max(7, Math.min(14, cellSize * 0.5))}px` }"
            aria-hidden="true"
          >{{ symbols[color] }}</span>
        </div>
      </template>
      <AnnotationLayer
        :annotations="renderedNonTextAnnotations"
        :rows="cells.length"
        :columns="cells[0].length"
        :selected-id="selectedAnnotationId"
        editable
        @select="$emit('selectAnnotation', $event)"
        @move="(id, rowDelta, columnDelta) => $emit('moveAnnotation', id, rowDelta, columnDelta)"
        @move-endpoint="(id, rowDelta, columnDelta) => $emit('moveAnnotationEndpoint', id, rowDelta, columnDelta)"
      />
      <AnnotationComments
        :annotations="annotations"
        :rendered-annotations="renderedAnnotations"
        :row-headers="rowHeaders"
        :column-headers="columnHeaders"
        :cell-size="cellSize"
        :selected-id="selectedCommentId"
        :header-size="28"
        @select="$emit('selectAnnotation', $event)"
        @add="(row, column) => $emit('createAnnotation', 'text', row, column, row, column)"
        @update="(id, text) => $emit('updateAnnotation', id, text)"
        @remove="$emit('removeAnnotation', $event)"
      />
    </div>
  </div>

  <SelectionContextMenu
    v-if="selectionMenu"
    :x="selectionMenu.x"
    :y="selectionMenu.y"
    :can-paste="canPaste"
    @action="runSelectionAction"
  />
  <AxisContextMenu
    v-if="rowMenu"
    v-model:multiple-count="multipleCount"
    axis="row"
    :index="rowMenu.row"
    :x="rowMenu.x"
    :y="rowMenu.y"
    :selected-count="selectedRows.length"
    :source-count="sourceRows"
    @row-action="runRowAction"
  />
  <AxisContextMenu
    v-if="columnMenu"
    v-model:multiple-count="multipleColumnCount"
    axis="column"
    :index="columnMenu.column"
    :x="columnMenu.x"
    :y="columnMenu.y"
    :selected-count="selectedColumns.length"
    :source-count="sourceColumns"
    @column-action="runColumnAction"
  />
</template>
