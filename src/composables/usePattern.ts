import { computed, ref, watch } from 'vue'
import type { DrawingTool, PatternProject, RepeatBox, RepeatBoxInput } from '../types/pattern'
import { addColumn, addRow, boxesOverlap, cloneGrid, createGrid, ensureGridSize, removeColumn, removeRow, synchronizeRepeatBox } from '../utils/grid'
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
  repeatBoxes: [],
  cells: createGrid(20, 20, '#ffffff'),
}

export function usePattern() {
  const project = ref<PatternProject>({ ...DEFAULT_PROJECT, repeatBoxes: [], cells: cloneGrid(DEFAULT_PROJECT.cells) })
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
    project.value = { ...next, repeatBoxes: next.repeatBoxes.map((box) => ({ ...box })), cells: cloneGrid(next.cells) }
    selectedRow.value = 0
    selectedColumn.value = 0
    history.reset()
  }

  function createProject(input: Omit<PatternProject, 'format' | 'version' | 'cells' | 'repeatBoxes'>) {
    replaceProject({ ...input, format: 'stitch-pattern', version: 1, repeatBoxes: [], cells: createGrid(input.rows, input.columns, input.backgroundColor) })
  }

  function beginGridChange() {
    history.record({ cells: project.value.cells, repeatBoxes: project.value.repeatBoxes })
  }

  function adjustBoxesForInsert(axis: 'row' | 'column', index: number, count: number, excludedIds: string[] = []) {
    for (const box of project.value.repeatBoxes) {
      if (excludedIds.includes(box.id)) continue
      const start = axis === 'row' ? 'top' : 'left'
      const end = axis === 'row' ? 'bottom' : 'right'
      if (index <= box[start]) {
        box[start] += count
        box[end] += count
      } else if (index < box[end]) {
        box[end] += count
      }
    }
  }

  function adjustBoxesForDelete(axis: 'row' | 'column', index: number, excludedIds: string[] = []) {
    project.value.repeatBoxes = project.value.repeatBoxes.flatMap((box) => {
      if (excludedIds.includes(box.id)) return [box]
      const start = axis === 'row' ? 'top' : 'left'
      const end = axis === 'row' ? 'bottom' : 'right'
      if (index < box[start]) return [{ ...box, [start]: box[start] - 1, [end]: box[end] - 1 }]
      if (index >= box[end]) return [box]
      if (box[end] - box[start] === 1) return []
      return [{ ...box, [end]: box[end] - 1 }]
    })
  }

  function repeatBoxesConflict(candidate: RepeatBox): boolean {
    return project.value.repeatBoxes.some((box) => {
      if (box.id === candidate.id) return false
      if (boxesOverlap(box, candidate)) return true
      if (box.direction === 'across' && candidate.direction === 'across' && box.left < candidate.right && candidate.left < box.right) {
        return box.left !== candidate.left || box.right !== candidate.right || box.sections !== candidate.sections
      }
      if (box.direction === 'down' && candidate.direction === 'down' && box.top < candidate.bottom && candidate.top < box.bottom) {
        return box.top !== candidate.top || box.bottom !== candidate.bottom || box.sections !== candidate.sections
      }
      return false
    })
  }

  function saveRepeatBox(input: RepeatBoxInput, id: string | null): string | null {
    const candidate: RepeatBox = { ...input, id: id ?? crypto.randomUUID() }
    const values = [candidate.top, candidate.bottom, candidate.left, candidate.right, candidate.sections]
    if (!values.every(Number.isInteger) || candidate.top < 0 || candidate.left < 0 || candidate.bottom <= candidate.top || candidate.right <= candidate.left || candidate.sections < 2 || candidate.sections > 20) {
      return 'The repeat box settings are invalid.'
    }
    if (candidate.bottom > 500 || candidate.right > 500) return 'Repeat boxes cannot extend beyond 500 rows or columns.'
    const length = candidate.direction === 'across' ? candidate.right - candidate.left : candidate.bottom - candidate.top
    if (length % candidate.sections !== 0) return 'The repeat length must divide evenly into its sections.'
    if (repeatBoxesConflict(candidate)) return 'Repeat boxes cannot overlap or use incompatible section boundaries.'

    beginGridChange()
    const existingIndex = project.value.repeatBoxes.findIndex((box) => box.id === candidate.id)
    if (existingIndex >= 0) project.value.cells = synchronizeRepeatBox(project.value.cells, project.value.repeatBoxes[existingIndex])
    project.value.cells = ensureGridSize(project.value.cells, candidate.bottom, candidate.right, project.value.backgroundColor)
    if (existingIndex >= 0) project.value.repeatBoxes[existingIndex] = candidate
    else project.value.repeatBoxes.push(candidate)
    project.value.cells = synchronizeRepeatBox(project.value.cells, candidate)
    return null
  }

  function toggleRepeatBox(id: string, enabled: boolean) {
    const box = project.value.repeatBoxes.find((candidate) => candidate.id === id)
    if (!box || box.enabled === enabled) return
    beginGridChange()
    project.value.cells = synchronizeRepeatBox(project.value.cells, box)
    box.enabled = enabled
  }

  function removeRepeatBox(id: string) {
    const box = project.value.repeatBoxes.find((candidate) => candidate.id === id)
    if (!box) return
    beginGridChange()
    project.value.cells = synchronizeRepeatBox(project.value.cells, box)
    project.value.repeatBoxes = project.value.repeatBoxes.filter((candidate) => candidate.id !== id)
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
    insertMultipleRows(index, 1)
  }

  function insertMultipleRows(index: number, count: number) {
    const total = Math.min(50, Math.max(1, Math.floor(count)))
    const target = project.value.repeatBoxes.find((box) => box.direction === 'down' && index > box.top && index < box.bottom)
    beginGridChange()
    let cells = cloneGrid(project.value.cells)

    if (target) {
      const sectionHeight = (target.bottom - target.top) / target.sections
      const sectionOffset = (index - target.top) % sectionHeight
      const aligned = project.value.repeatBoxes.filter((box) => box.direction === 'down' && box.top === target.top && box.bottom === target.bottom && box.sections === target.sections)
      const alignedIds = aligned.map((box) => box.id)
      for (let section = 0; section < target.sections; section += 1) {
        const position = target.top + section * sectionHeight + sectionOffset + section * total
        for (let offset = 0; offset < total; offset += 1) {
          cells = addRow(cells, position + offset, project.value.backgroundColor)
          adjustBoxesForInsert('row', position + offset, 1, alignedIds)
        }
      }
      for (const box of aligned) box.bottom += total * box.sections
      for (const box of aligned) if (box.enabled) cells = synchronizeRepeatBox(cells, box)
      project.value.cells = cells
      selectedRow.value = target.top + sectionOffset
      return
    }

    adjustBoxesForInsert('row', index, total)
    for (let offset = 0; offset < total; offset += 1) {
      cells = addRow(cells, index + offset, project.value.backgroundColor)
    }
    project.value.cells = cells
    selectedRow.value = Math.min(index, cells.length - 1)
  }

  function fillRow(index: number, color: string) {
    beginGridChange()
    project.value.cells[index] = Array<string>(project.value.cells[index].length).fill(color)
    selectedRow.value = index
    chooseColor(color, true)
  }

  function eraseRow(index: number) {
    beginGridChange()
    project.value.cells[index] = Array<string>(project.value.cells[index].length).fill(project.value.backgroundColor)
    selectedRow.value = index
  }

  function deleteSelectedRow() {
    if (project.value.cells.length <= 1) return
    const index = selectedRow.value
    const target = project.value.repeatBoxes.find((box) => box.direction === 'down' && index >= box.top && index < box.bottom)
    beginGridChange()

    if (target && project.value.cells.length > target.sections) {
      const sectionHeight = (target.bottom - target.top) / target.sections
      const sectionOffset = (index - target.top) % sectionHeight
      const aligned = project.value.repeatBoxes.filter((box) => box.direction === 'down' && box.top === target.top && box.bottom === target.bottom && box.sections === target.sections)
      const alignedIds = aligned.map((box) => box.id)
      let cells = cloneGrid(project.value.cells)
      for (let section = target.sections - 1; section >= 0; section -= 1) {
        const position = target.top + section * sectionHeight + sectionOffset
        cells = removeRow(cells, position)
        adjustBoxesForDelete('row', position, alignedIds)
      }
      if (sectionHeight === 1) project.value.repeatBoxes = project.value.repeatBoxes.filter((box) => !alignedIds.includes(box.id))
      else for (const box of aligned) box.bottom -= box.sections
      if (sectionHeight > 1) for (const box of aligned) if (box.enabled) cells = synchronizeRepeatBox(cells, box)
      project.value.cells = cells
      selectedRow.value = Math.min(target.top + Math.min(sectionOffset, sectionHeight - 2), project.value.cells.length - 1)
      return
    }

    adjustBoxesForDelete('row', index)
    project.value.cells = removeRow(project.value.cells, index)
    selectedRow.value = Math.min(selectedRow.value, project.value.cells.length - 1)
  }

  function insertColumn(index: number) {
    insertMultipleColumns(index, 1)
  }

  function insertMultipleColumns(index: number, count: number) {
    const total = Math.min(50, Math.max(1, Math.floor(count)))
    const target = project.value.repeatBoxes.find((box) => box.direction === 'across' && index > box.left && index < box.right)
    beginGridChange()
    let cells = cloneGrid(project.value.cells)

    if (target) {
      const sectionWidth = (target.right - target.left) / target.sections
      const sectionOffset = (index - target.left) % sectionWidth
      const aligned = project.value.repeatBoxes.filter((box) => box.direction === 'across' && box.left === target.left && box.right === target.right && box.sections === target.sections)
      const alignedIds = aligned.map((box) => box.id)
      for (let section = 0; section < target.sections; section += 1) {
        const position = target.left + section * sectionWidth + sectionOffset + section * total
        for (let offset = 0; offset < total; offset += 1) {
          cells = addColumn(cells, position + offset, project.value.backgroundColor)
          adjustBoxesForInsert('column', position + offset, 1, alignedIds)
        }
      }
      for (const box of aligned) box.right += total * box.sections
      for (const box of aligned) if (box.enabled) cells = synchronizeRepeatBox(cells, box)
      project.value.cells = cells
      selectedColumn.value = target.left + sectionOffset
      return
    }

    adjustBoxesForInsert('column', index, total)
    for (let offset = 0; offset < total; offset += 1) {
      cells = addColumn(cells, index + offset, project.value.backgroundColor)
    }
    project.value.cells = cells
    selectedColumn.value = Math.min(index, cells[0].length - 1)
  }

  function fillColumn(index: number, color: string) {
    beginGridChange()
    for (const row of project.value.cells) row[index] = color
    selectedColumn.value = index
    chooseColor(color, true)
  }

  function eraseColumn(index: number) {
    beginGridChange()
    for (const row of project.value.cells) row[index] = project.value.backgroundColor
    selectedColumn.value = index
  }

  function deleteSelectedColumn() {
    if (project.value.cells[0].length <= 1) return
    const index = selectedColumn.value
    const target = project.value.repeatBoxes.find((box) => box.direction === 'across' && index >= box.left && index < box.right)
    beginGridChange()

    if (target && project.value.cells[0].length > target.sections) {
      const sectionWidth = (target.right - target.left) / target.sections
      const sectionOffset = (index - target.left) % sectionWidth
      const aligned = project.value.repeatBoxes.filter((box) => box.direction === 'across' && box.left === target.left && box.right === target.right && box.sections === target.sections)
      const alignedIds = aligned.map((box) => box.id)
      let cells = cloneGrid(project.value.cells)
      for (let section = target.sections - 1; section >= 0; section -= 1) {
        const position = target.left + section * sectionWidth + sectionOffset
        cells = removeColumn(cells, position)
        adjustBoxesForDelete('column', position, alignedIds)
      }
      if (sectionWidth === 1) project.value.repeatBoxes = project.value.repeatBoxes.filter((box) => !alignedIds.includes(box.id))
      else for (const box of aligned) box.right -= box.sections
      if (sectionWidth > 1) for (const box of aligned) if (box.enabled) cells = synchronizeRepeatBox(cells, box)
      project.value.cells = cells
      selectedColumn.value = Math.min(target.left + Math.min(sectionOffset, sectionWidth - 2), project.value.cells[0].length - 1)
      return
    }

    adjustBoxesForDelete('column', index)
    project.value.cells = removeColumn(project.value.cells, index)
    selectedColumn.value = Math.min(selectedColumn.value, project.value.cells[0].length - 1)
  }

  function clearGrid() {
    mutateGrid(createGrid(project.value.cells.length, project.value.cells[0].length, project.value.backgroundColor))
  }

  function undo() {
    const snapshot = history.undo({ cells: project.value.cells, repeatBoxes: project.value.repeatBoxes })
    if (snapshot) {
      project.value.cells = snapshot.cells
      project.value.repeatBoxes = snapshot.repeatBoxes
    }
    selectedRow.value = Math.min(selectedRow.value, project.value.cells.length - 1)
    selectedColumn.value = Math.min(selectedColumn.value, project.value.cells[0].length - 1)
  }

  function redo() {
    const snapshot = history.redo({ cells: project.value.cells, repeatBoxes: project.value.repeatBoxes })
    if (snapshot) {
      project.value.cells = snapshot.cells
      project.value.repeatBoxes = snapshot.repeatBoxes
    }
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
    insertMultipleRows,
    fillRow,
    eraseRow,
    deleteSelectedRow,
    insertColumn,
    insertMultipleColumns,
    fillColumn,
    eraseColumn,
    deleteSelectedColumn,
    clearGrid,
    saveRepeatBox,
    toggleRepeatBox,
    removeRepeatBox,
    undo,
    redo,
  }
}
