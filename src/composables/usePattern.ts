import { computed, ref, watch } from 'vue'
import type { DrawingTool, GridSelection, NewPatternProject, PatternGrid, PatternProject, RepeatBox, RepeatBoxInput } from '../types/pattern'
import { addColumn, addRow, boxesOverlap, cloneGrid, createGrid, ensureGridSize, removeColumn, removeRow, renderGrid, sourceCellFor, synchronizeRepeatBox } from '../utils/grid'
import { normalizeColor } from '../utils/colors'
import { parseAxisSelection } from '../utils/axisSelection'
import { asPatternProject } from '../utils/validation'
import { useHistory } from './useHistory'

const AUTOSAVE_KEY = 'stitch-project-autosave'

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
  previewStitch: 'knit',
  recentColors: [],
  repeatBoxes: [],
  cells: createGrid(20, 20, '#ffffff'),
}

export function usePattern() {
  let initialProject = DEFAULT_PROJECT
  let recovered = false
  try {
    const savedProject = localStorage.getItem(AUTOSAVE_KEY)
    if (savedProject) {
      initialProject = asPatternProject(JSON.parse(savedProject))
      recovered = true
    }
  } catch {
    try {
      localStorage.removeItem(AUTOSAVE_KEY)
    } catch {
      // Storage can be unavailable in restricted browser contexts.
    }
  }

  const project = ref<PatternProject>({
    ...initialProject,
    recentColors: [...initialProject.recentColors],
    repeatBoxes: initialProject.repeatBoxes.map((box) => ({ ...box })),
    cells: cloneGrid(initialProject.cells),
  })
  const tool = ref<DrawingTool>('pencil')
  const selectedRow = ref(0)
  const selectedColumn = ref(0)
  const selectedRows = ref<number[]>([0])
  const selectedColumns = ref<number[]>([0])
  const selection = ref<GridSelection | null>(null)
  const clipboard = ref<PatternGrid | null>(null)
  const mirrorHorizontal = ref(false)
  const mirrorVertical = ref(false)
  const savedColor = normalizeColor(localStorage.getItem('stitch-selected-color') ?? '')
  const selectedColor = ref(savedColor ?? '#7c3aed')
  const savedRecent = localStorage.getItem('stitch-recent-colors')
  let parsedRecent: unknown = []
  try {
    parsedRecent = savedRecent ? JSON.parse(savedRecent) : []
  } catch {
    parsedRecent = []
  }
  const browserRecentColors = Array.isArray(parsedRecent)
      ? parsedRecent.map((color) => normalizeColor(String(color))).filter((color): color is string => color !== null).slice(0, 20)
      : []
  const recentColors = ref<string[]>(initialProject.recentColors.length > 0 ? [...initialProject.recentColors] : browserRecentColors)
  project.value.recentColors = [...recentColors.value]
  const history = useHistory()
  const restoredAutosave = ref(recovered)
  const autosaveStatus = ref<'saving' | 'saved' | 'error'>('saving')
  const lastSavedAt = ref<number | null>(recovered ? Date.now() : null)
  let autosaveTimer: ReturnType<typeof setTimeout> | null = null
  let rowSelectionAnchor = 0
  let columnSelectionAnchor = 0

  function selectRow(index: number, extend = false, exclusive = false) {
    const row = Math.max(0, Math.min(Math.floor(index), project.value.cells.length - 1))
    if (!extend) rowSelectionAnchor = row
    selectedRow.value = row
    const start = extend ? Math.min(rowSelectionAnchor, row) : row
    const end = extend ? Math.max(rowSelectionAnchor, row) : row
    selectedRows.value = Array.from({ length: end - start + 1 }, (_, offset) => start + offset)
    if (exclusive) selectedColumns.value = []
  }

  function selectColumn(index: number, extend = false, exclusive = false) {
    const column = Math.max(0, Math.min(Math.floor(index), project.value.cells[0].length - 1))
    if (!extend) columnSelectionAnchor = column
    selectedColumn.value = column
    const start = extend ? Math.min(columnSelectionAnchor, column) : column
    const end = extend ? Math.max(columnSelectionAnchor, column) : column
    selectedColumns.value = Array.from({ length: end - start + 1 }, (_, offset) => start + offset)
    if (exclusive) selectedRows.value = []
  }

  function selectRows(value: string): boolean {
    const rows = parseAxisSelection(value, project.value.cells.length)
    if (!rows) return false
    selectedRows.value = rows
    selectedRow.value = rows[0]
    rowSelectionAnchor = rows[0]
    selectedColumns.value = []
    return true
  }

  function selectColumns(value: string): boolean {
    const columns = parseAxisSelection(value, project.value.cells[0].length)
    if (!columns) return false
    selectedColumns.value = columns
    selectedColumn.value = columns[0]
    columnSelectionAnchor = columns[0]
    selectedRows.value = []
    return true
  }

  function clearRowSelection() {
    selectedRows.value = []
  }

  function clearColumnSelection() {
    selectedColumns.value = []
  }

  watch(
    () => project.value.cells,
    (cells) => {
      project.value.rows = cells.length
      project.value.columns = cells[0].length
    },
    { immediate: true },
  )

  function flushAutosave() {
    if (autosaveTimer) clearTimeout(autosaveTimer)
    autosaveTimer = null
    try {
      const snapshot = {
        ...project.value,
        rows: project.value.cells.length,
        columns: project.value.cells[0].length,
      }
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(snapshot))
      autosaveStatus.value = 'saved'
      lastSavedAt.value = Date.now()
    } catch {
      autosaveStatus.value = 'error'
    }
  }

  function scheduleAutosave() {
    autosaveStatus.value = 'saving'
    if (autosaveTimer) clearTimeout(autosaveTimer)
    autosaveTimer = setTimeout(flushAutosave, 300)
  }

  watch(project, scheduleAutosave, { deep: true })
  scheduleAutosave()

  function persistColors() {
    project.value.recentColors = [...recentColors.value]
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
    project.value = { ...next, recentColors: [...next.recentColors], repeatBoxes: next.repeatBoxes.map((box) => ({ ...box })), cells: cloneGrid(next.cells) }
    recentColors.value = [...next.recentColors]
    persistColors()
    selectRow(0)
    selectColumn(0)
    selection.value = null
    clipboard.value = null
    history.reset()
  }

  function createProject(input: NewPatternProject) {
    replaceProject({ ...input, format: 'stitch-pattern', version: 1, previewStitch: 'knit', recentColors: [...recentColors.value], repeatBoxes: [], cells: createGrid(input.rows, input.columns, input.backgroundColor) })
  }

  function beginGridChange() {
    history.record({ cells: project.value.cells, repeatBoxes: project.value.repeatBoxes })
  }

  function setSelection(top: number, left: number, bottom: number, right: number) {
    selection.value = {
      top: Math.max(0, Math.min(top, bottom)),
      left: Math.max(0, Math.min(left, right)),
      bottom: Math.min(project.value.cells.length - 1, Math.max(top, bottom)),
      right: Math.min(project.value.cells[0].length - 1, Math.max(left, right)),
    }
    selectRow(selection.value.top)
    selectColumn(selection.value.left)
  }

  function copySelection(): boolean {
    if (!selection.value) return false
    const rendered = renderGrid(project.value.cells, 1, 1, project.value.repeatBoxes).cells
    clipboard.value = rendered
      .slice(selection.value.top, selection.value.bottom + 1)
      .map((row) => row.slice(selection.value!.left, selection.value!.right + 1))
    return true
  }

  function synchronizeEnabledBoxes(cells: PatternGrid): PatternGrid {
    let next = cells
    for (const box of project.value.repeatBoxes) if (box.enabled) next = synchronizeRepeatBox(next, box)
    return next
  }

  function writeClipboard(cells: PatternGrid, data: PatternGrid, row: number, column: number): PatternGrid {
    let next = ensureGridSize(cells, row + data.length, column + data[0].length, project.value.backgroundColor)
    next = cloneGrid(next)
    for (let rowOffset = 0; rowOffset < data.length; rowOffset += 1) {
      for (let columnOffset = 0; columnOffset < data[rowOffset].length; columnOffset += 1) {
        const [sourceRow, sourceColumn] = sourceCellFor(project.value.repeatBoxes, row + rowOffset, column + columnOffset)
        next[sourceRow][sourceColumn] = data[rowOffset][columnOffset]
      }
    }
    return synchronizeEnabledBoxes(next)
  }

  function pasteSelection(): boolean {
    if (!selection.value || !clipboard.value) return false
    const row = selection.value.top
    const column = selection.value.left
    if (row + clipboard.value.length > 500 || column + clipboard.value[0].length > 500) return false
    beginGridChange()
    project.value.cells = writeClipboard(project.value.cells, clipboard.value, row, column)
    setSelection(row, column, row + clipboard.value.length - 1, column + clipboard.value[0].length - 1)
    return true
  }

  function moveSelectionTo(row: number, column: number): boolean {
    if (!selection.value) return false
    const source = { ...selection.value }
    const rendered = renderGrid(project.value.cells, 1, 1, project.value.repeatBoxes).cells
    const data = rendered.slice(source.top, source.bottom + 1).map((cells) => cells.slice(source.left, source.right + 1))
    if (row + data.length > 500 || column + data[0].length > 500) return false
    beginGridChange()
    let next = cloneGrid(project.value.cells)
    for (let sourceRow = source.top; sourceRow <= source.bottom; sourceRow += 1) {
      for (let sourceColumn = source.left; sourceColumn <= source.right; sourceColumn += 1) {
        const [mappedRow, mappedColumn] = sourceCellFor(project.value.repeatBoxes, sourceRow, sourceColumn)
        next[mappedRow][mappedColumn] = project.value.backgroundColor
      }
    }
    project.value.cells = writeClipboard(next, data, row, column)
    setSelection(row, column, row + data.length - 1, column + data[0].length - 1)
    return true
  }

  function mirrorSelection(direction: 'horizontal' | 'vertical'): boolean {
    if (!selection.value) return false
    const source = selection.value
    const rendered = renderGrid(project.value.cells, 1, 1, project.value.repeatBoxes).cells
    let data = rendered.slice(source.top, source.bottom + 1).map((cells) => cells.slice(source.left, source.right + 1))
    data = direction === 'horizontal' ? data.map((row) => [...row].reverse()) : [...data].reverse()
    beginGridChange()
    project.value.cells = writeClipboard(project.value.cells, data, source.top, source.left)
    return true
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
    return project.value.repeatBoxes.some((box) => box.id !== candidate.id && boxesOverlap(box, candidate))
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
    if (repeatBoxesConflict(candidate)) return 'Repeat boxes cannot overlap.'

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
    selectRow(row)
    selectColumn(column)
    if (tool.value === 'eyedropper') {
      chooseColor(project.value.cells[row][column], true)
      tool.value = 'pencil'
      return
    }
    if (tool.value === 'fill') {
      const rows = project.value.cells.length
      const columns = project.value.cells[0].length
      const targets: Array<[number, number]> = [[row, column]]
      if (mirrorVertical.value) targets.push([row, columns - 1 - column])
      if (mirrorHorizontal.value) targets.push([rows - 1 - row, column])
      if (mirrorVertical.value && mirrorHorizontal.value) targets.push([rows - 1 - row, columns - 1 - column])
      for (const [targetRow, targetColumn] of targets) {
        const [sourceRow, sourceColumn] = sourceCellFor(project.value.repeatBoxes, targetRow, targetColumn)
        floodFill(sourceRow, sourceColumn, selectedColor.value)
      }
      return
    }
    const color = tool.value === 'eraser' ? project.value.backgroundColor : selectedColor.value
    const rows = project.value.cells.length
    const columns = project.value.cells[0].length
    const targets: Array<[number, number]> = [[row, column]]
    if (mirrorVertical.value) targets.push([row, columns - 1 - column])
    if (mirrorHorizontal.value) targets.push([rows - 1 - row, column])
    if (mirrorVertical.value && mirrorHorizontal.value) targets.push([rows - 1 - row, columns - 1 - column])
    for (const [targetRow, targetColumn] of targets) {
      const [sourceRow, sourceColumn] = sourceCellFor(project.value.repeatBoxes, targetRow, targetColumn)
      if (project.value.cells[sourceRow][sourceColumn] !== color) project.value.cells[sourceRow][sourceColumn] = color
    }
  }

  function commitColor() {
    if (tool.value === 'pencil' || tool.value === 'fill') chooseColor(selectedColor.value, true)
  }

  function floodFill(startRow: number, startColumn: number, replacement: string) {
    const withinSelection = (row: number, column: number) => selection.value !== null
      && row >= selection.value.top
      && row <= selection.value.bottom
      && column >= selection.value.left
      && column <= selection.value.right
    const startInsideSelection = withinSelection(startRow, startColumn)
    const allowed = (row: number, column: number) => !selection.value || withinSelection(row, column) === startInsideSelection
    const target = project.value.cells[startRow][startColumn]
    if (target === replacement) return
    const pending: Array<[number, number]> = [[startRow, startColumn]]
    project.value.cells[startRow][startColumn] = replacement

    while (pending.length > 0) {
      const [row, column] = pending.pop()!
      const neighbors: Array<[number, number]> = [[row - 1, column], [row + 1, column], [row, column - 1], [row, column + 1]]
      for (const [nextRow, nextColumn] of neighbors) {
        if (nextRow < 0 || nextRow >= project.value.cells.length || nextColumn < 0 || nextColumn >= project.value.cells[0].length) continue
        if (!allowed(nextRow, nextColumn)) continue
        if (project.value.cells[nextRow][nextColumn] !== target) continue
        project.value.cells[nextRow][nextColumn] = replacement
        pending.push([nextRow, nextColumn])
      }
    }
  }

  function mutateGrid(next: string[][]) {
    beginGridChange()
    project.value.cells = next
  }

  function insertRow(index: number) {
    insertMultipleRows(index, 1)
  }

  function insertMultipleRows(index: number, count: number) {
    selection.value = null
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
      selectRow(target.top + sectionOffset)
      return
    }

    adjustBoxesForInsert('row', index, total)
    for (let offset = 0; offset < total; offset += 1) {
      cells = addRow(cells, index + offset, project.value.backgroundColor)
    }
    project.value.cells = cells
    selectRow(Math.min(index, cells.length - 1))
  }

  function fillRows(indices: number[], color: string, rememberColor = true) {
    const rows = [...new Set(indices)].filter((index) => index >= 0 && index < project.value.cells.length)
    if (rows.length === 0) return
    beginGridChange()
    let cells = cloneGrid(project.value.cells)
    for (const row of rows) {
      for (let column = 0; column < cells[row].length; column += 1) {
        const [sourceRow, sourceColumn] = sourceCellFor(project.value.repeatBoxes, row, column)
        cells[sourceRow][sourceColumn] = color
      }
    }
    project.value.cells = synchronizeEnabledBoxes(cells)
    if (rememberColor) chooseColor(color, true)
  }

  function fillSelectedRows(color: string) {
    fillRows(selectedRows.value, color)
  }

  function fillRow(index: number, color: string) {
    selectRow(index)
    fillRows([index], color)
  }

  function eraseSelectedRows() {
    fillRows(selectedRows.value, project.value.backgroundColor, false)
  }

  function eraseRow(index: number) {
    selectRow(index)
    fillRows([index], project.value.backgroundColor, false)
  }

  function deleteRowAt(index: number) {
    const target = project.value.repeatBoxes.find((box) => box.direction === 'down' && index >= box.top && index < box.bottom)

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
      return
    }

    adjustBoxesForDelete('row', index)
    project.value.cells = removeRow(project.value.cells, index)
  }

  function deleteSelectedRows() {
    if (project.value.cells.length <= 1) return
    selection.value = null
    const operations = new Map<string, number>()
    for (const index of selectedRows.value) {
      const target = project.value.repeatBoxes.find((box) => box.direction === 'down' && index >= box.top && index < box.bottom)
      if (!target) operations.set(`row:${index}`, index)
      else {
        const sectionHeight = (target.bottom - target.top) / target.sections
        const offset = (index - target.top) % sectionHeight
        operations.set(`repeat:${target.top}:${target.bottom}:${target.sections}:${offset}`, target.top + offset)
      }
    }
    beginGridChange()
    const indices = [...operations.values()].sort((a, b) => b - a)
    for (const index of indices) {
      if (project.value.cells.length <= 1) break
      deleteRowAt(Math.min(index, project.value.cells.length - 1))
    }
    selectRow(Math.min(indices.at(-1) ?? selectedRow.value, project.value.cells.length - 1))
  }

  function deleteSelectedRow() {
    selectRow(selectedRow.value, false, true)
    deleteSelectedRows()
  }

  function insertColumn(index: number) {
    insertMultipleColumns(index, 1)
  }

  function insertMultipleColumns(index: number, count: number) {
    selection.value = null
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
      selectColumn(target.left + sectionOffset)
      return
    }

    adjustBoxesForInsert('column', index, total)
    for (let offset = 0; offset < total; offset += 1) {
      cells = addColumn(cells, index + offset, project.value.backgroundColor)
    }
    project.value.cells = cells
    selectColumn(Math.min(index, cells[0].length - 1))
  }

  function fillColumns(indices: number[], color: string, rememberColor = true) {
    const columns = [...new Set(indices)].filter((index) => index >= 0 && index < project.value.cells[0].length)
    if (columns.length === 0) return
    beginGridChange()
    let cells = cloneGrid(project.value.cells)
    for (let row = 0; row < cells.length; row += 1) {
      for (const column of columns) {
        const [sourceRow, sourceColumn] = sourceCellFor(project.value.repeatBoxes, row, column)
        cells[sourceRow][sourceColumn] = color
      }
    }
    project.value.cells = synchronizeEnabledBoxes(cells)
    if (rememberColor) chooseColor(color, true)
  }

  function fillSelectedColumns(color: string) {
    fillColumns(selectedColumns.value, color)
  }

  function fillColumn(index: number, color: string) {
    selectColumn(index)
    fillColumns([index], color)
  }

  function eraseSelectedColumns() {
    fillColumns(selectedColumns.value, project.value.backgroundColor, false)
  }

  function eraseColumn(index: number) {
    selectColumn(index)
    fillColumns([index], project.value.backgroundColor, false)
  }

  function deleteColumnAt(index: number) {
    const target = project.value.repeatBoxes.find((box) => box.direction === 'across' && index >= box.left && index < box.right)

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
      return
    }

    adjustBoxesForDelete('column', index)
    project.value.cells = removeColumn(project.value.cells, index)
  }

  function deleteSelectedColumns() {
    if (project.value.cells[0].length <= 1) return
    selection.value = null
    const operations = new Map<string, number>()
    for (const index of selectedColumns.value) {
      const target = project.value.repeatBoxes.find((box) => box.direction === 'across' && index >= box.left && index < box.right)
      if (!target) operations.set(`column:${index}`, index)
      else {
        const sectionWidth = (target.right - target.left) / target.sections
        const offset = (index - target.left) % sectionWidth
        operations.set(`repeat:${target.left}:${target.right}:${target.sections}:${offset}`, target.left + offset)
      }
    }
    beginGridChange()
    const indices = [...operations.values()].sort((a, b) => b - a)
    for (const index of indices) {
      if (project.value.cells[0].length <= 1) break
      deleteColumnAt(Math.min(index, project.value.cells[0].length - 1))
    }
    selectColumn(Math.min(indices.at(-1) ?? selectedColumn.value, project.value.cells[0].length - 1))
  }

  function deleteSelectedColumn() {
    selectColumn(selectedColumn.value, false, true)
    deleteSelectedColumns()
  }

  function clearGrid() {
    selection.value = null
    mutateGrid(createGrid(project.value.cells.length, project.value.cells[0].length, project.value.backgroundColor))
  }

  function undo() {
    const snapshot = history.undo({ cells: project.value.cells, repeatBoxes: project.value.repeatBoxes })
    if (snapshot) {
      project.value.cells = snapshot.cells
      project.value.repeatBoxes = snapshot.repeatBoxes
    }
    selectRow(Math.min(selectedRow.value, project.value.cells.length - 1))
    selectColumn(Math.min(selectedColumn.value, project.value.cells[0].length - 1))
  }

  function redo() {
    const snapshot = history.redo({ cells: project.value.cells, repeatBoxes: project.value.repeatBoxes })
    if (snapshot) {
      project.value.cells = snapshot.cells
      project.value.repeatBoxes = snapshot.repeatBoxes
    }
    selectRow(Math.min(selectedRow.value, project.value.cells.length - 1))
    selectColumn(Math.min(selectedColumn.value, project.value.cells[0].length - 1))
  }

  return {
    project,
    tool,
    selectedRow,
    selectedColumn,
    selectedRows,
    selectedColumns,
    selection,
    mirrorHorizontal,
    mirrorVertical,
    selectedColor,
    recentColors,
    restoredAutosave,
    autosaveStatus,
    lastSavedAt,
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
    fillSelectedRows,
    eraseRow,
    eraseSelectedRows,
    deleteSelectedRow,
    deleteSelectedRows,
    insertColumn,
    insertMultipleColumns,
    fillColumn,
    fillSelectedColumns,
    eraseColumn,
    eraseSelectedColumns,
    deleteSelectedColumn,
    deleteSelectedColumns,
    clearGrid,
    flushAutosave,
    setSelection,
    selectRow,
    selectColumn,
    selectRows,
    selectColumns,
    clearRowSelection,
    clearColumnSelection,
    clearSelection: () => { selection.value = null },
    copySelection,
    pasteSelection,
    moveSelectionTo,
    mirrorSelection,
    hasSelection: computed(() => selection.value !== null),
    hasClipboard: computed(() => clipboard.value !== null),
    saveRepeatBox,
    toggleRepeatBox,
    removeRepeatBox,
    undo,
    redo,
  }
}
