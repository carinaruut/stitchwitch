import { computed, onBeforeUnmount, onMounted, ref, type Ref } from 'vue'
import type { DrawingTool, GridSelection } from '../../../types/pattern'

export interface GridPointerInteractionInputs {
  viewport: Ref<HTMLElement | null>
  tool: () => DrawingTool
  selection: () => GridSelection | null
  placingSelection: () => boolean
  rowHeaders: () => number[]
  columnHeaders: () => number[]
  cellSourceRows: () => number[][]
  cellSourceColumns: () => number[][]
  sourceColumns: () => number
  onStrokeStart: () => void
  onPaint: (row: number, column: number) => void
  onStrokeEnd: () => void
  onSelectArea: (top: number, left: number, bottom: number, right: number) => void
  onMagicSelect: (row: number, column: number, extend: boolean) => void
  onClearSelection: () => void
  onPlaceSelection: (row: number, column: number) => void
  onMoveSelection: (row: number, column: number) => void
  onCreateAnnotation: (type: 'text' | 'marker' | 'arrow', row: number, column: number, endRow: number, endColumn: number) => void
}

export function useGridPointerInteractions(inputs: GridPointerInteractionInputs) {
  const drawing = ref(false)
  const panning = ref(false)
  const selecting = ref(false)
  const draggingSelection = ref(false)
  const dragPreview = ref<GridSelection | null>(null)
  let panStartX = 0
  let panStartY = 0
  let scrollStartX = 0
  let scrollStartY = 0
  let selectionStartRow = 0
  let selectionStartColumn = 0
  let dragRowOffset = 0
  let dragColumnOffset = 0
  let arrowStart: { row: number; column: number } | null = null
  let arrowEnd: { row: number; column: number } | null = null

  const visibleSelection = computed(() => dragPreview.value ?? inputs.selection())
  const selectedCellKeys = computed(() => new Set(inputs.selection()?.cells?.map(([row, column]) => `${row}:${column}`) ?? []))
  const visibleCellKeys = computed(() => new Set(visibleSelection.value?.cells?.map(([row, column]) => `${row}:${column}`) ?? []))

  function containsSelection(row: number, column: number) {
    const selection = inputs.selection()
    if (!selection || row < selection.top || row > selection.bottom || column < selection.left || column > selection.right) return false
    return !selection.cells || selectedCellKeys.value.has(`${row}:${column}`)
  }

  function visibleContains(row: number, column: number) {
    const selection = visibleSelection.value
    if (!selection || row < selection.top || row > selection.bottom || column < selection.left || column > selection.right) return false
    return !selection.cells || visibleCellKeys.value.has(`${row}:${column}`)
  }

  function selectionAt(top: number, left: number): GridSelection {
    const selection = inputs.selection()!
    const rowOffset = top - selection.top
    const columnOffset = left - selection.left
    return {
      top,
      left,
      bottom: top + selection.bottom - selection.top,
      right: left + selection.right - selection.left,
      cells: selection.cells?.map(([row, column]) => [row + rowOffset, column + columnOffset]),
    }
  }

  function startPan(event: PointerEvent) {
    if (event.button !== 0 || !inputs.viewport.value) return
    event.preventDefault()
    panning.value = true
    panStartX = event.clientX
    panStartY = event.clientY
    scrollStartX = inputs.viewport.value.scrollLeft
    scrollStartY = inputs.viewport.value.scrollTop
    inputs.viewport.value.setPointerCapture(event.pointerId)
  }

  function startViewportAction(event: PointerEvent) {
    if (inputs.tool() === 'move') startPan(event)
    else if (inputs.tool() === 'select' && inputs.selection()) inputs.onClearSelection()
  }

  function start(row: number, column: number, displayRow: number, displayColumn: number, event: PointerEvent) {
    if (event.button !== 0) return
    const tool = inputs.tool()
    if (tool === 'move') {
      startPan(event)
      return
    }
    if (tool === 'wand') {
      event.preventDefault()
      inputs.onMagicSelect(row, column, event.shiftKey)
      return
    }
    if (tool === 'text' || tool === 'marker') {
      event.preventDefault()
      inputs.onCreateAnnotation(tool, row, column, row, column)
      return
    }
    if (tool === 'arrow') {
      event.preventDefault()
      arrowStart = { row, column }
      arrowEnd = { row, column }
      return
    }
    if (tool === 'select') {
      event.preventDefault()
      const actualRow = inputs.rowHeaders()[displayRow]
      const actualColumn = inputs.columnHeaders()[displayColumn]
      if (inputs.placingSelection()) {
        inputs.onPlaceSelection(actualRow, actualColumn)
        return
      }
      if (containsSelection(actualRow, actualColumn)) {
        const selection = inputs.selection()!
        draggingSelection.value = true
        dragRowOffset = actualRow - selection.top
        dragColumnOffset = actualColumn - selection.left
        dragPreview.value = { ...selection }
        return
      }
      if (inputs.selection()) {
        inputs.onClearSelection()
        return
      }
      selecting.value = true
      selectionStartRow = actualRow
      selectionStartColumn = actualColumn
      inputs.onSelectArea(actualRow, actualColumn, actualRow, actualColumn)
      return
    }
    if (tool === 'fill') {
      event.preventDefault()
      inputs.onStrokeStart()
      inputs.onPaint(row, column)
      inputs.onStrokeEnd()
      return
    }
    event.preventDefault()
    drawing.value = true
    inputs.onStrokeStart()
    inputs.onPaint(row, column)
  }

  function enter(row: number, column: number, displayRow: number, displayColumn: number, event: PointerEvent) {
    if (arrowStart && event.buttons === 1) {
      arrowEnd = { row, column }
      return
    }
    const selection = inputs.selection()
    if (draggingSelection.value && event.buttons === 1 && selection) {
      const top = Math.max(0, inputs.rowHeaders()[displayRow] - dragRowOffset)
      const left = Math.max(0, inputs.columnHeaders()[displayColumn] - dragColumnOffset)
      dragPreview.value = selectionAt(top, left)
      return
    }
    if (selecting.value && event.buttons === 1) {
      inputs.onSelectArea(selectionStartRow, selectionStartColumn, inputs.rowHeaders()[displayRow], inputs.columnHeaders()[displayColumn])
      return
    }
    if (drawing.value && event.buttons === 1) inputs.onPaint(row, column)
  }

  function pan(event: PointerEvent) {
    if (!panning.value || !inputs.viewport.value) return
    inputs.viewport.value.scrollLeft = scrollStartX - (event.clientX - panStartX)
    inputs.viewport.value.scrollTop = scrollStartY - (event.clientY - panStartY)
  }

  function stop(event?: PointerEvent) {
    if (panning.value) {
      panning.value = false
      if (event && inputs.viewport.value?.hasPointerCapture(event.pointerId)) inputs.viewport.value.releasePointerCapture(event.pointerId)
    }
    if (drawing.value) {
      drawing.value = false
      inputs.onStrokeEnd()
    }
    if (draggingSelection.value && dragPreview.value) {
      const selection = inputs.selection()
      if (!selection || dragPreview.value.top !== selection.top || dragPreview.value.left !== selection.left) {
        inputs.onMoveSelection(dragPreview.value.top, dragPreview.value.left)
      }
    }
    draggingSelection.value = false
    dragPreview.value = null
    selecting.value = false
    if (arrowStart && arrowEnd) {
      const { row } = arrowEnd
      let { column } = arrowEnd
      if (row === arrowStart.row && column === arrowStart.column) column = Math.min(inputs.sourceColumns() - 1, column + 1)
      if (row === arrowStart.row && column === arrowStart.column) column = Math.max(0, column - 1)
      inputs.onCreateAnnotation('arrow', arrowStart.row, arrowStart.column, row, column)
    }
    arrowStart = null
    arrowEnd = null
  }

  function keyboardPaint(row: number, column: number) {
    const tool = inputs.tool()
    if (tool === 'move') return
    if (tool === 'text' || tool === 'marker' || tool === 'arrow') {
      const endColumn = tool === 'arrow' ? Math.min(inputs.sourceColumns() - 1, column + 1) : column
      inputs.onCreateAnnotation(tool, row, column, row, endColumn === column && tool === 'arrow' ? Math.max(0, column - 1) : endColumn)
      return
    }
    inputs.onStrokeStart()
    inputs.onPaint(row, column)
    inputs.onStrokeEnd()
  }

  function keyboardSelect(displayRow: number, displayColumn: number, event: KeyboardEvent) {
    if (inputs.tool() === 'wand') {
      inputs.onMagicSelect(inputs.cellSourceRows()[displayRow][displayColumn], inputs.cellSourceColumns()[displayRow][displayColumn], event.shiftKey)
      return
    }
    const row = inputs.rowHeaders()[displayRow]
    const column = inputs.columnHeaders()[displayColumn]
    if (inputs.placingSelection()) inputs.onPlaceSelection(row, column)
    else inputs.onSelectArea(row, column, row, column)
  }

  onMounted(() => window.addEventListener('pointerup', stop))
  onBeforeUnmount(() => window.removeEventListener('pointerup', stop))

  return { containsSelection, enter, keyboardPaint, keyboardSelect, pan, panning, start, startPan, startViewportAction, stop, visibleContains }
}
