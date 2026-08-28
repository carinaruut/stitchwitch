import { onBeforeUnmount, onMounted, ref } from 'vue'
import type { DrawingTool } from '../../../types/pattern'

export type SelectionAction = 'move' | 'copy' | 'paste' | 'flip-horizontal' | 'flip-vertical' | 'rotate-clockwise' | 'rotate-counterclockwise' | 'fill' | 'erase'
export type RowAction = 'above' | 'below' | 'multiple' | 'delete' | 'fill' | 'erase'
export type ColumnAction = 'before' | 'after' | 'multiple' | 'delete' | 'fill' | 'erase'

interface PositionedMenu {
  x: number
  y: number
}

export interface GridContextMenuInputs {
  tool: () => DrawingTool
  selectedRows: () => number[]
  selectedColumns: () => number[]
  containsSelection: (row: number, column: number) => boolean
  onSelectRow: (row: number, extend: boolean, toggle: boolean) => void
  onSelectColumn: (column: number, extend: boolean, toggle: boolean) => void
  onRowAction: (action: RowAction, row: number, count?: number) => void
  onColumnAction: (action: ColumnAction, column: number, count?: number) => void
  onSelectionAction: (action: SelectionAction) => void
}

export function useGridContextMenus(inputs: GridContextMenuInputs) {
  const rowMenu = ref<(PositionedMenu & { row: number }) | null>(null)
  const columnMenu = ref<(PositionedMenu & { column: number }) | null>(null)
  const selectionMenu = ref<PositionedMenu | null>(null)
  const multipleCount = ref(5)
  const multipleColumnCount = ref(5)

  function closeMenus() {
    rowMenu.value = null
    columnMenu.value = null
    selectionMenu.value = null
  }

  function openRowMenu(row: number, event: MouseEvent | KeyboardEvent) {
    if (inputs.tool() === 'move') return
    event.preventDefault()
    event.stopPropagation()
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
    const x = event instanceof MouseEvent ? event.clientX : rect.right
    const y = event instanceof MouseEvent ? event.clientY : rect.top
    const selectedRows = inputs.selectedRows()
    const toggle = event instanceof MouseEvent && event.type === 'click' && !event.shiftKey && selectedRows.length === 1 && selectedRows[0] === row
    inputs.onSelectRow(row, event.shiftKey, toggle)
    columnMenu.value = null
    selectionMenu.value = null
    if (event.shiftKey) {
      rowMenu.value = null
      return
    }
    rowMenu.value = {
      row,
      x: Math.max(8, Math.min(x, window.innerWidth - 240)),
      y: Math.max(8, Math.min(y, window.innerHeight - 390)),
    }
  }

  function openColumnMenu(column: number, event: MouseEvent | KeyboardEvent) {
    if (inputs.tool() === 'move') return
    event.preventDefault()
    event.stopPropagation()
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
    const x = event instanceof MouseEvent ? event.clientX : rect.left
    const y = event instanceof MouseEvent ? event.clientY : rect.bottom
    const selectedColumns = inputs.selectedColumns()
    const toggle = event instanceof MouseEvent && event.type === 'click' && !event.shiftKey && selectedColumns.length === 1 && selectedColumns[0] === column
    inputs.onSelectColumn(column, event.shiftKey, toggle)
    rowMenu.value = null
    selectionMenu.value = null
    if (event.shiftKey) {
      columnMenu.value = null
      return
    }
    columnMenu.value = {
      column,
      x: Math.max(8, Math.min(x, window.innerWidth - 240)),
      y: Math.max(8, Math.min(y, window.innerHeight - 390)),
    }
  }

  function openSelectionMenu(row: number, column: number, event: MouseEvent) {
    if (!inputs.containsSelection(row, column)) return
    event.preventDefault()
    event.stopPropagation()
    rowMenu.value = null
    columnMenu.value = null
    selectionMenu.value = {
      x: Math.max(8, Math.min(event.clientX, window.innerWidth - 224)),
      y: Math.max(8, Math.min(event.clientY, window.innerHeight - 368)),
    }
  }

  function runRowAction(action: RowAction) {
    if (!rowMenu.value) return
    inputs.onRowAction(action, rowMenu.value.row, action === 'multiple' ? multipleCount.value : undefined)
    rowMenu.value = null
  }

  function runColumnAction(action: ColumnAction) {
    if (!columnMenu.value) return
    inputs.onColumnAction(action, columnMenu.value.column, action === 'multiple' ? multipleColumnCount.value : undefined)
    columnMenu.value = null
  }

  function runSelectionAction(action: SelectionAction) {
    inputs.onSelectionAction(action)
    selectionMenu.value = null
  }

  function handleEscape(event: KeyboardEvent) {
    if (event.key === 'Escape') closeMenus()
  }

  onMounted(() => {
    window.addEventListener('click', closeMenus)
    window.addEventListener('keydown', handleEscape)
  })
  onBeforeUnmount(() => {
    window.removeEventListener('click', closeMenus)
    window.removeEventListener('keydown', handleEscape)
  })

  return {
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
  }
}
