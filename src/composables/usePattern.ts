import { computed, ref, watch } from 'vue'
import type { DrawingTool, PatternProject } from '../types/pattern'
import { addColumn, addRow, cloneGrid, createGrid, removeColumn, removeRow } from '../utils/grid'
import { normalizeColor } from '../utils/colors'
import { useHistory } from './useHistory'

const DEFAULT_PROJECT: PatternProject = {
  format: 'stitch-pattern',
  version: 1,
  name: 'My pattern',
  rows: 20,
  columns: 20,
  cellSize: 24,
  backgroundColor: '#ffffff',
  horizontalRepeats: 1,
  verticalRepeats: 1,
  cells: createGrid(20, 20, '#ffffff'),
}

export function usePattern() {
  const project = ref<PatternProject>({ ...DEFAULT_PROJECT, cells: cloneGrid(DEFAULT_PROJECT.cells) })
  const tool = ref<DrawingTool>('pencil')
  const selectedRow = ref(0)
  const selectedColumn = ref(0)
  const savedColor = normalizeColor(localStorage.getItem('stitch-selected-color') ?? '')
  const selectedColor = ref(savedColor ?? '#7c3aed')
  const savedRecent = localStorage.getItem('stitch-recent-colors')
  let parsedRecent: unknown = []
  try {
    parsedRecent = savedRecent ? JSON.parse(savedRecent) : []
  } catch {
    parsedRecent = []
  }
  const recentColors = ref<string[]>(
    Array.isArray(parsedRecent)
      ? parsedRecent.map((color) => normalizeColor(String(color))).filter((color): color is string => color !== null).slice(0, 20)
      : [],
  )
  const history = useHistory()

  watch(
    () => project.value.cells,
    (cells) => {
      project.value.rows = cells.length
      project.value.columns = cells[0].length
    },
    { immediate: true },
  )

  function persistColors() {
    localStorage.setItem('stitch-selected-color', selectedColor.value)
    localStorage.setItem('stitch-recent-colors', JSON.stringify(recentColors.value))
  }

  function chooseColor(value: string, recent = false): boolean {
    const color = normalizeColor(value)
    if (!color) return false
    selectedColor.value = color
    if (recent) recentColors.value = [color, ...recentColors.value.filter((item) => item !== color)].slice(0, 20)
    persistColors()
    return true
  }

  function replaceProject(next: PatternProject) {
    project.value = { ...next, cells: cloneGrid(next.cells) }
    selectedRow.value = 0
    selectedColumn.value = 0
    history.reset()
  }

  function createProject(input: Omit<PatternProject, 'format' | 'version' | 'cells'>) {
    replaceProject({ ...input, format: 'stitch-pattern', version: 1, cells: createGrid(input.rows, input.columns, input.backgroundColor) })
  }

  function beginGridChange() {
    history.record(project.value.cells)
  }

  function paintCell(row: number, column: number) {
    selectedRow.value = row
    selectedColumn.value = column
    if (tool.value === 'eyedropper') {
      chooseColor(project.value.cells[row][column], true)
      tool.value = 'pencil'
      return
    }
    const color = tool.value === 'eraser' ? project.value.backgroundColor : selectedColor.value
    if (project.value.cells[row][column] !== color) project.value.cells[row][column] = color
  }

  function commitColor() {
    if (tool.value === 'pencil') chooseColor(selectedColor.value, true)
  }

  function mutateGrid(next: string[][]) {
    beginGridChange()
    project.value.cells = next
  }

  function insertRow(index: number) {
    mutateGrid(addRow(project.value.cells, index, project.value.backgroundColor))
    selectedRow.value = Math.min(index, project.value.cells.length - 1)
  }

  function deleteSelectedRow() {
    if (project.value.cells.length <= 1) return
    mutateGrid(removeRow(project.value.cells, selectedRow.value))
    selectedRow.value = Math.min(selectedRow.value, project.value.cells.length - 1)
  }

  function insertColumn(index: number) {
    mutateGrid(addColumn(project.value.cells, index, project.value.backgroundColor))
    selectedColumn.value = Math.min(index, project.value.cells[0].length - 1)
  }

  function deleteSelectedColumn() {
    if (project.value.cells[0].length <= 1) return
    mutateGrid(removeColumn(project.value.cells, selectedColumn.value))
    selectedColumn.value = Math.min(selectedColumn.value, project.value.cells[0].length - 1)
  }

  function clearGrid() {
    mutateGrid(createGrid(project.value.cells.length, project.value.cells[0].length, project.value.backgroundColor))
  }

  function undo() {
    const cells = history.undo(project.value.cells)
    if (cells) project.value.cells = cells
    selectedRow.value = Math.min(selectedRow.value, project.value.cells.length - 1)
    selectedColumn.value = Math.min(selectedColumn.value, project.value.cells[0].length - 1)
  }

  function redo() {
    const cells = history.redo(project.value.cells)
    if (cells) project.value.cells = cells
    selectedRow.value = Math.min(selectedRow.value, project.value.cells.length - 1)
    selectedColumn.value = Math.min(selectedColumn.value, project.value.cells[0].length - 1)
  }

  return {
    project,
    tool,
    selectedRow,
    selectedColumn,
    selectedColor,
    recentColors,
    rowCount: computed(() => project.value.cells.length),
    columnCount: computed(() => project.value.cells[0].length),
    hasColoredCells: computed(() => project.value.cells.some((row) => row.some((color) => color !== project.value.backgroundColor))),
    ...history,
    chooseColor,
    replaceProject,
    createProject,
    beginGridChange,
    paintCell,
    commitColor,
    insertRow,
    deleteSelectedRow,
    insertColumn,
    deleteSelectedColumn,
    clearGrid,
    undo,
    redo,
  }
}
