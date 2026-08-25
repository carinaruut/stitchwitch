import { computed, ref, watch } from 'vue'
import { MAX_ANNOTATIONS, MAX_PROJECT_SWATCHES, MAX_REPEAT_COUNT, type AnnotationType, type DrawingTool, type GridSelection, type NewPatternProject, type PaletteEntry, type PatternAnnotation, type PatternGrid, type PatternProject, type RepeatBox, type RepeatBoxInput } from '../types/pattern'
import { addColumn, addRow, boxesOverlap, cloneGrid, createGrid, ensureGridSize, removeColumn, removeRow, renderGrid, sourceCellFor, synchronizeRepeatBox } from '../utils/grid'
import { normalizeColor } from '../utils/colors'
import { parseAxisSelection } from '../utils/axisSelection'
import { asPatternProject } from '../utils/validation'
import { translateError } from '../utils/localizedErrors'
import { paletteEntries as completePaletteEntries, reorderPaletteEntries } from '../utils/palette'
import { useHistory } from './useHistory'

const AUTOSAVE_KEY = 'stitch-project-autosave'

interface SelectionClipboard {
  cells: PatternGrid
  mask: boolean[][] | null
}

const DEFAULT_PROJECT: PatternProject = {
  format: 'stitch-pattern',
  version: 1,
  name: translateError('defaults.projectName'),
  rows: 20,
  columns: 20,
  cellSize: 24,
  backgroundColor: '#ffffff',
  horizontalRepeats: 1,
  verticalRepeats: 1,
  previewStitch: 'knit',
  recentColors: [],
  swatches: [],
  palette: [],
    repeatBoxes: [],
    annotations: [],
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
    swatches: [...initialProject.swatches],
    palette: initialProject.palette.map((entry) => ({ ...entry })),
    repeatBoxes: initialProject.repeatBoxes.map((box) => ({ ...box })),
    annotations: initialProject.annotations.map((annotation) => ({ ...annotation })),
    cells: cloneGrid(initialProject.cells),
  })
  const tool = ref<DrawingTool>('pencil')
  const selectedRow = ref(0)
  const selectedColumn = ref(0)
  const selectedRows = ref<number[]>([0])
  const selectedColumns = ref<number[]>([0])
  const selection = ref<GridSelection | null>(null)
  const selectedAnnotationId = ref<string | null>(null)
  const clipboard = ref<SelectionClipboard | null>(null)
  const mirrorHorizontal = ref(false)
  const mirrorVertical = ref(false)
  const savedColor = normalizeColor(localStorage.getItem('stitch-selected-color') ?? '')
  const selectedColor = ref(savedColor ?? '#7c3aed')
  const savedRecent = localStorage.getItem('stitch-recent-colors')
  let parsedRecent: unknown
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

  function addSwatch(value = selectedColor.value) {
    const color = normalizeColor(value)
    if (!color || project.value.swatches.includes(color) || project.value.swatches.length >= MAX_PROJECT_SWATCHES) return
    project.value.swatches.push(color)
  }

  function removeSwatch(color: string) {
    project.value.swatches = project.value.swatches.filter((swatch) => swatch !== color)
  }

  function replaceProject(next: PatternProject) {
    project.value = { ...next, recentColors: [...next.recentColors], swatches: [...next.swatches], palette: next.palette.map((entry) => ({ ...entry })), repeatBoxes: next.repeatBoxes.map((box) => ({ ...box })), annotations: next.annotations.map((annotation) => ({ ...annotation })), cells: cloneGrid(next.cells) }
    recentColors.value = [...next.recentColors]
    persistColors()
    selectRow(0)
    selectColumn(0)
    selection.value = null
    selectedAnnotationId.value = null
    clipboard.value = null
    history.reset()
  }

  function createProject(input: NewPatternProject) {
    replaceProject({ ...input, format: 'stitch-pattern', version: 1, previewStitch: 'knit', recentColors: [...recentColors.value], swatches: [], palette: [], repeatBoxes: [], annotations: [], cells: createGrid(input.rows, input.columns, input.backgroundColor) })
  }

  function beginGridChange() {
    history.record({
      cells: project.value.cells,
      repeatBoxes: project.value.repeatBoxes,
      annotations: project.value.annotations,
      palette: project.value.palette,
      backgroundColor: project.value.backgroundColor,
      swatches: project.value.swatches,
      recentColors: recentColors.value,
    })
  }

  function updatePaletteEntry(colorValue: string, updates: Partial<Pick<PaletteEntry, 'name' | 'brand' | 'code' | 'notes'>>) {
    const color = normalizeColor(colorValue)
    if (!color) return
    const entries = completePaletteEntries(project.value)
    const index = entries.findIndex((entry) => entry.color === color)
    if (index < 0) return
    beginGridChange()
    entries[index] = { ...entries[index], ...updates }
    project.value.palette = entries
  }

  function movePaletteEntry(colorValue: string, direction: -1 | 1) {
    const color = normalizeColor(colorValue)
    if (!color) return
    const entries = completePaletteEntries(project.value)
    const index = entries.findIndex((entry) => entry.color === color)
    const destination = index + direction
    if (index < 0 || destination < 0 || destination >= entries.length) return
    beginGridChange()
    const current = entries[index]
    entries[index] = entries[destination]
    entries[destination] = current
    project.value.palette = entries
  }

  function reorderPaletteEntry(sourceValue: string, targetValue: string, after: boolean) {
    const source = normalizeColor(sourceValue)
    const target = normalizeColor(targetValue)
    if (!source || !target || source === target) return
    const entries = completePaletteEntries(project.value)
    const reordered = reorderPaletteEntries(entries, source, target, after)
    if (!reordered) return
    beginGridChange()
    project.value.palette = reordered
  }

  function switchPaletteColor(sourceValue: string, targetValue: string): boolean {
    const source = normalizeColor(sourceValue)
    const target = normalizeColor(targetValue)
    if (!source || !target || source === target) return false
    const entries = completePaletteEntries(project.value)
    const sourceEntry = entries.find((entry) => entry.color === source)
    const targetEntry = entries.find((entry) => entry.color === target)
    if (!sourceEntry) return false
    beginGridChange()
    if (targetEntry) {
      const conflictingMetadata = [
        targetEntry.name && sourceEntry.name && targetEntry.name !== sourceEntry.name ? sourceEntry.name : '',
        targetEntry.brand && sourceEntry.brand && targetEntry.brand !== sourceEntry.brand ? sourceEntry.brand : '',
        targetEntry.code && sourceEntry.code && targetEntry.code !== sourceEntry.code ? sourceEntry.code : '',
      ].filter(Boolean)
      const sourceDetails = conflictingMetadata.length > 0 ? [source.toUpperCase(), ...conflictingMetadata].join(' · ') : ''
      const notes = [targetEntry.notes.trim(), sourceEntry.notes.trim(), sourceDetails].filter(Boolean)
      const merged: PaletteEntry = {
        color: target,
        symbol: targetEntry.symbol,
        name: targetEntry.name || sourceEntry.name,
        brand: targetEntry.brand || sourceEntry.brand,
        code: targetEntry.code || sourceEntry.code,
        notes: [...new Set(notes)].join('\n'),
      }
      project.value.palette = entries.filter((entry) => entry.color !== source).map((entry) => entry.color === target ? merged : entry)
    } else {
      project.value.palette = entries.map((entry) => entry.color === source ? { ...entry, color: target } : entry)
    }
    project.value.cells = synchronizeEnabledBoxes(project.value.cells.map((row) => row.map((color) => color === source ? target : color)))
    if (project.value.backgroundColor === source) project.value.backgroundColor = target
    project.value.swatches = [...new Set(project.value.swatches.map((color) => color === source ? target : color))]
    recentColors.value = [...new Set(recentColors.value.map((color) => color === source ? target : color))]
    if (selectedColor.value === source) selectedColor.value = target
    persistColors()
    return true
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

  function setHeaderSelection(axis: 'row' | 'column'): boolean {
    const indices = axis === 'row' ? selectedRows.value : selectedColumns.value
    if (indices.length < 2) {
      selection.value = null
      return false
    }
    selection.value = axis === 'row'
      ? { top: Math.min(...indices), left: 0, bottom: Math.max(...indices), right: project.value.cells[0].length - 1 }
      : { top: 0, left: Math.min(...indices), bottom: project.value.cells.length - 1, right: Math.max(...indices) }
    return true
  }

  function selectionCoordinates(candidate: GridSelection): Array<[number, number]> {
    if (candidate.cells) return candidate.cells
    const coordinates: Array<[number, number]> = []
    for (let row = candidate.top; row <= candidate.bottom; row += 1) {
      for (let column = candidate.left; column <= candidate.right; column += 1) coordinates.push([row, column])
    }
    return coordinates
  }

  function selectionClipboard(candidate: GridSelection): SelectionClipboard {
    const rendered = renderGrid(project.value.cells, 1, 1, project.value.repeatBoxes).cells
    const selectedCells = candidate.cells ? new Set(candidate.cells.map(([row, column]) => `${row}:${column}`)) : null
    const cells = rendered
      .slice(candidate.top, candidate.bottom + 1)
      .map((row) => row.slice(candidate.left, candidate.right + 1))
    const mask = selectedCells
      ? cells.map((row, rowOffset) => row.map((_, columnOffset) => selectedCells.has(`${candidate.top + rowOffset}:${candidate.left + columnOffset}`)))
      : null
    return { cells, mask }
  }

  function setClipboardSelection(row: number, column: number, copied: SelectionClipboard) {
    const bottom = row + copied.cells.length - 1
    const right = column + copied.cells[0].length - 1
    const cells = copied.mask
      ? copied.mask.flatMap((maskRow, rowOffset) => maskRow.flatMap((selected, columnOffset) => selected ? [[row + rowOffset, column + columnOffset] as [number, number]] : []))
      : undefined
    selection.value = { top: row, left: column, bottom, right, cells }
    selectRow(row)
    selectColumn(column)
  }

  function setMagicSelection(row: number, column: number, extend = false) {
    if (row < 0 || row >= project.value.cells.length || column < 0 || column >= project.value.cells[0].length) return
    const color = project.value.cells[row][column]
    const cells: Array<[number, number]> = []
    const pending: Array<[number, number]> = [[row, column]]
    const visited = new Set([`${row}:${column}`])
    let top = row
    let left = column
    let bottom = row
    let right = column

    while (pending.length > 0) {
      const [currentRow, currentColumn] = pending.pop()!
      cells.push([currentRow, currentColumn])
      top = Math.min(top, currentRow)
      left = Math.min(left, currentColumn)
      bottom = Math.max(bottom, currentRow)
      right = Math.max(right, currentColumn)
      const neighbors: Array<[number, number]> = [[currentRow - 1, currentColumn], [currentRow + 1, currentColumn], [currentRow, currentColumn - 1], [currentRow, currentColumn + 1]]
      for (const [nextRow, nextColumn] of neighbors) {
        const key = `${nextRow}:${nextColumn}`
        if (nextRow < 0 || nextRow >= project.value.cells.length || nextColumn < 0 || nextColumn >= project.value.cells[0].length || visited.has(key)) continue
        if (project.value.cells[nextRow][nextColumn] !== color) continue
        visited.add(key)
        pending.push([nextRow, nextColumn])
      }
    }

    if (extend && selection.value) {
      const combined = new Map<string, [number, number]>()
      for (const [selectedRow, selectedColumn] of selectionCoordinates(selection.value)) {
        combined.set(`${selectedRow}:${selectedColumn}`, [selectedRow, selectedColumn])
      }
      for (const [selectedRow, selectedColumn] of cells) {
        combined.set(`${selectedRow}:${selectedColumn}`, [selectedRow, selectedColumn])
      }
      cells.splice(0, cells.length, ...combined.values())
      top = Math.min(top, selection.value.top)
      left = Math.min(left, selection.value.left)
      bottom = Math.max(bottom, selection.value.bottom)
      right = Math.max(right, selection.value.right)
    }

    selection.value = { top, left, bottom, right, cells }
    selectRow(row)
    selectColumn(column)
  }

  function fillSelection(color: string, rememberColor = true): boolean {
    if (!selection.value) return false
    const normalized = normalizeColor(color)
    if (!normalized) return false
    beginGridChange()
    const cells = cloneGrid(project.value.cells)
    for (const [row, column] of selectionCoordinates(selection.value)) {
      const [sourceRow, sourceColumn] = sourceCellFor(project.value.repeatBoxes, row, column)
      cells[sourceRow][sourceColumn] = normalized
    }
    project.value.cells = synchronizeEnabledBoxes(cells)
    if (rememberColor) chooseColor(normalized, true)
    return true
  }

  function eraseSelection(): boolean {
    return fillSelection(project.value.backgroundColor, false)
  }

  function copySelection(): boolean {
    if (!selection.value) return false
    clipboard.value = selectionClipboard(selection.value)
    return true
  }

  function synchronizeEnabledBoxes(cells: PatternGrid): PatternGrid {
    let next = cells
    for (const box of project.value.repeatBoxes) if (box.enabled) next = synchronizeRepeatBox(next, box)
    return next
  }

  function writeClipboard(cells: PatternGrid, data: PatternGrid, row: number, column: number, mask: boolean[][] | null = null): PatternGrid {
    let next = ensureGridSize(cells, row + data.length, column + data[0].length, project.value.backgroundColor)
    next = cloneGrid(next)
    for (let rowOffset = 0; rowOffset < data.length; rowOffset += 1) {
      for (let columnOffset = 0; columnOffset < data[rowOffset].length; columnOffset += 1) {
        if (mask && !mask[rowOffset][columnOffset]) continue
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
    if (row + clipboard.value.cells.length > 500 || column + clipboard.value.cells[0].length > 500) return false
    beginGridChange()
    project.value.cells = writeClipboard(project.value.cells, clipboard.value.cells, row, column, clipboard.value.mask)
    setClipboardSelection(row, column, clipboard.value)
    return true
  }

  function moveSelectionTo(row: number, column: number): boolean {
    if (!selection.value) return false
    const source = { ...selection.value }
    const copied = selectionClipboard(source)
    if (row + copied.cells.length > 500 || column + copied.cells[0].length > 500) return false
    beginGridChange()
    const next = cloneGrid(project.value.cells)
    for (const [sourceRow, sourceColumn] of selectionCoordinates(source)) {
      const [mappedRow, mappedColumn] = sourceCellFor(project.value.repeatBoxes, sourceRow, sourceColumn)
      next[mappedRow][mappedColumn] = project.value.backgroundColor
    }
    project.value.cells = writeClipboard(next, copied.cells, row, column, copied.mask)
    setClipboardSelection(row, column, copied)
    return true
  }

  function mirrorSelection(direction: 'horizontal' | 'vertical'): boolean {
    if (!selection.value) return false
    const source = selection.value
    const copied = selectionClipboard(source)
    copied.cells = direction === 'horizontal' ? copied.cells.map((row) => [...row].reverse()) : [...copied.cells].reverse()
    if (copied.mask) copied.mask = direction === 'horizontal' ? copied.mask.map((row) => [...row].reverse()) : [...copied.mask].reverse()
    beginGridChange()
    const next = cloneGrid(project.value.cells)
    if (source.cells) {
      for (const [sourceRow, sourceColumn] of source.cells) {
        const [mappedRow, mappedColumn] = sourceCellFor(project.value.repeatBoxes, sourceRow, sourceColumn)
        next[mappedRow][mappedColumn] = project.value.backgroundColor
      }
    }
    project.value.cells = writeClipboard(next, copied.cells, source.top, source.left, copied.mask)
    setClipboardSelection(source.top, source.left, copied)
    return true
  }

  function rotateSelection(direction: 'clockwise' | 'counterclockwise'): boolean {
    if (!selection.value) return false
    const source = { ...selection.value }
    const copied = selectionClipboard(source)
    const rotate = <T>(grid: T[][]): T[][] => Array.from({ length: grid[0].length }, (_, row) => (
      Array.from({ length: grid.length }, (_, column) => direction === 'clockwise'
        ? grid[grid.length - column - 1][row]
        : grid[column][grid[0].length - row - 1])
    ))
    copied.cells = rotate(copied.cells)
    if (copied.mask) copied.mask = rotate(copied.mask)
    if (source.top + copied.cells.length > 500 || source.left + copied.cells[0].length > 500) return false

    beginGridChange()
    const next = cloneGrid(project.value.cells)
    for (const [sourceRow, sourceColumn] of selectionCoordinates(source)) {
      const [mappedRow, mappedColumn] = sourceCellFor(project.value.repeatBoxes, sourceRow, sourceColumn)
      next[mappedRow][mappedColumn] = project.value.backgroundColor
    }
    project.value.cells = writeClipboard(next, copied.cells, source.top, source.left, copied.mask)
    setClipboardSelection(source.top, source.left, copied)
    return true
  }

  function adjustBoxesForInsert(axis: 'row' | 'column', index: number, count: number, excludedIds: string[] = []) {
    adjustAnnotationsForInsert(axis, index, count)
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
    adjustAnnotationsForDelete(axis, index)
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

  function adjustAnnotationsForInsert(axis: 'row' | 'column', index: number, count: number) {
    const coordinate = axis === 'row' ? 'row' : 'column'
    const endCoordinate = axis === 'row' ? 'endRow' : 'endColumn'
    for (const annotation of project.value.annotations) {
      if (annotation[coordinate] >= index) annotation[coordinate] += count
      if (annotation.type === 'arrow' && annotation[endCoordinate] >= index) annotation[endCoordinate] += count
    }
  }

  function adjustAnnotationsForDelete(axis: 'row' | 'column', index: number) {
    const coordinate = axis === 'row' ? 'row' : 'column'
    const endCoordinate = axis === 'row' ? 'endRow' : 'endColumn'
    const finalCoordinate = (axis === 'row' ? project.value.cells.length : project.value.cells[0].length) - 2
    for (const annotation of project.value.annotations) {
      if (annotation[coordinate] > index) annotation[coordinate] -= 1
      else if (annotation[coordinate] === index) annotation[coordinate] = Math.min(index, finalCoordinate)
      if (annotation.type === 'arrow' && annotation[endCoordinate] > index) annotation[endCoordinate] -= 1
      else if (annotation.type === 'arrow' && annotation[endCoordinate] === index) annotation[endCoordinate] = Math.min(index, finalCoordinate)
    }
  }

  function addAnnotation(type: AnnotationType, row: number, column: number, endRow = row, endColumn = column, text = translateError('defaults.annotationText')) {
    if (project.value.annotations.length >= MAX_ANNOTATIONS) return null
    const boundedRow = Math.max(0, Math.min(project.value.cells.length - 1, row))
    const boundedColumn = Math.max(0, Math.min(project.value.cells[0].length - 1, column))
    const base = { id: crypto.randomUUID(), row: boundedRow, column: boundedColumn, color: selectedColor.value }
    const annotation: PatternAnnotation = type === 'text'
      ? { ...base, type, text }
      : type === 'arrow'
        ? { ...base, type, endRow: Math.max(0, Math.min(project.value.cells.length - 1, endRow)), endColumn: Math.max(0, Math.min(project.value.cells[0].length - 1, endColumn)) }
        : { ...base, type }
    beginGridChange()
    project.value.annotations.push(annotation)
    selectedAnnotationId.value = annotation.id
    return annotation.id
  }

  function updateAnnotation(id: string, updates: { text?: string; color?: string; row?: number; column?: number; endRow?: number; endColumn?: number }) {
    const annotation = project.value.annotations.find((candidate) => candidate.id === id)
    if (!annotation) return false
    const color = updates.color === undefined ? undefined : normalizeColor(updates.color)
    if (updates.color !== undefined && !color) return false
    const rows = project.value.cells.length
    const columns = project.value.cells[0].length
    const next = {
      ...annotation,
      ...(updates.text !== undefined && annotation.type === 'text' ? { text: updates.text.trim().slice(0, 500) || annotation.text } : {}),
      ...(color ? { color } : {}),
      ...(updates.row !== undefined ? { row: Math.max(0, Math.min(rows - 1, Math.round(updates.row))) } : {}),
      ...(updates.column !== undefined ? { column: Math.max(0, Math.min(columns - 1, Math.round(updates.column))) } : {}),
      ...(updates.endRow !== undefined && annotation.type === 'arrow' ? { endRow: Math.max(0, Math.min(rows - 1, Math.round(updates.endRow))) } : {}),
      ...(updates.endColumn !== undefined && annotation.type === 'arrow' ? { endColumn: Math.max(0, Math.min(columns - 1, Math.round(updates.endColumn))) } : {}),
    } as PatternAnnotation
    if (JSON.stringify(annotation) === JSON.stringify(next)) return false
    beginGridChange()
    Object.assign(annotation, next)
    return true
  }

  function moveAnnotation(id: string, rowDelta: number, columnDelta: number) {
    const annotation = project.value.annotations.find((candidate) => candidate.id === id)
    if (!annotation || (!rowDelta && !columnDelta)) return false
    return updateAnnotation(id, {
      row: annotation.row + rowDelta,
      column: annotation.column + columnDelta,
      ...(annotation.type === 'arrow' ? { endRow: annotation.endRow + rowDelta, endColumn: annotation.endColumn + columnDelta } : {}),
    })
  }

  function removeAnnotation(id: string) {
    if (!project.value.annotations.some((annotation) => annotation.id === id)) return false
    beginGridChange()
    project.value.annotations = project.value.annotations.filter((annotation) => annotation.id !== id)
    if (selectedAnnotationId.value === id) selectedAnnotationId.value = null
    return true
  }

  function repeatBoxesConflict(candidate: RepeatBox): boolean {
    return project.value.repeatBoxes.some((box) => box.id !== candidate.id && boxesOverlap(box, candidate))
  }

  function saveRepeatBox(input: RepeatBoxInput, id: string | null): string | null {
    const candidate: RepeatBox = { ...input, id: id ?? crypto.randomUUID() }
    const values = [candidate.top, candidate.bottom, candidate.left, candidate.right, candidate.sections]
    if (!values.every(Number.isInteger) || candidate.top < 0 || candidate.left < 0 || candidate.bottom <= candidate.top || candidate.right <= candidate.left || candidate.sections < 2 || candidate.sections > MAX_REPEAT_COUNT) {
      return translateError('repeatSave.settings')
    }
    if (candidate.bottom > 500 || candidate.right > 500) return translateError('repeatSave.bounds')
    const length = candidate.direction === 'across' ? candidate.right - candidate.left : candidate.bottom - candidate.top
    if (length % candidate.sections !== 0) return translateError('repeatSave.sections')
    if (repeatBoxesConflict(candidate)) return translateError('repeatSave.overlap')

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

  function mirroredPaintTargets(row: number, column: number): Array<[number, number]> {
    const rows = project.value.cells.length
    const columns = project.value.cells[0].length
    const box = project.value.repeatBoxes.find((candidate) => candidate.enabled
      && row >= candidate.top && row < candidate.bottom
      && column >= candidate.left && column < candidate.right)
    let origins: Array<[number, number]> = [[row, column]]

    if (box?.direction === 'across') {
      const sectionWidth = (box.right - box.left) / box.sections
      origins = Array.from({ length: box.sections }, (_, copy) => [row, column + copy * sectionWidth])
    } else if (box?.direction === 'down') {
      const sectionHeight = (box.bottom - box.top) / box.sections
      origins = Array.from({ length: box.sections }, (_, copy) => [row + copy * sectionHeight, column])
    }

    const targets: Array<[number, number]> = [[row, column]]
    for (const [originRow, originColumn] of origins) {
      if (mirrorVertical.value) targets.push([originRow, columns - 1 - originColumn])
      if (mirrorHorizontal.value) targets.push([rows - 1 - originRow, originColumn])
      if (mirrorVertical.value && mirrorHorizontal.value) targets.push([rows - 1 - originRow, columns - 1 - originColumn])
    }
    const seen = new Set<string>()
    return targets.filter(([targetRow, targetColumn]) => {
      const key = `${targetRow}:${targetColumn}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
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
      for (const [targetRow, targetColumn] of mirroredPaintTargets(row, column)) {
        const [sourceRow, sourceColumn] = sourceCellFor(project.value.repeatBoxes, targetRow, targetColumn)
        floodFill(sourceRow, sourceColumn, selectedColor.value)
      }
      return
    }
    const color = tool.value === 'eraser' ? project.value.backgroundColor : selectedColor.value
    for (const [targetRow, targetColumn] of mirroredPaintTargets(row, column)) {
      const [sourceRow, sourceColumn] = sourceCellFor(project.value.repeatBoxes, targetRow, targetColumn)
      if (project.value.cells[sourceRow][sourceColumn] !== color) project.value.cells[sourceRow][sourceColumn] = color
    }
  }

  function commitColor() {
    if (tool.value === 'pencil' || tool.value === 'fill') chooseColor(selectedColor.value, true)
  }

  function floodFill(startRow: number, startColumn: number, replacement: string) {
    const selectedCells = selection.value?.cells ? new Set(selection.value.cells.map(([row, column]) => `${row}:${column}`)) : null
    const withinSelection = (row: number, column: number) => selection.value !== null
      && row >= selection.value.top
      && row <= selection.value.bottom
      && column >= selection.value.left
      && column <= selection.value.right
      && (!selectedCells || selectedCells.has(`${row}:${column}`))
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
    const cells = cloneGrid(project.value.cells)
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
    const cells = cloneGrid(project.value.cells)
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
    const snapshot = history.undo({ cells: project.value.cells, repeatBoxes: project.value.repeatBoxes, annotations: project.value.annotations, palette: project.value.palette, backgroundColor: project.value.backgroundColor, swatches: project.value.swatches, recentColors: recentColors.value })
    if (snapshot) {
      project.value.cells = snapshot.cells
      project.value.repeatBoxes = snapshot.repeatBoxes
      project.value.annotations = snapshot.annotations
      project.value.palette = snapshot.palette
      project.value.backgroundColor = snapshot.backgroundColor
      project.value.swatches = snapshot.swatches
      recentColors.value = snapshot.recentColors
      persistColors()
    }
    selectRow(Math.min(selectedRow.value, project.value.cells.length - 1))
    selectColumn(Math.min(selectedColumn.value, project.value.cells[0].length - 1))
  }

  function redo() {
    const snapshot = history.redo({ cells: project.value.cells, repeatBoxes: project.value.repeatBoxes, annotations: project.value.annotations, palette: project.value.palette, backgroundColor: project.value.backgroundColor, swatches: project.value.swatches, recentColors: recentColors.value })
    if (snapshot) {
      project.value.cells = snapshot.cells
      project.value.repeatBoxes = snapshot.repeatBoxes
      project.value.annotations = snapshot.annotations
      project.value.palette = snapshot.palette
      project.value.backgroundColor = snapshot.backgroundColor
      project.value.swatches = snapshot.swatches
      recentColors.value = snapshot.recentColors
      persistColors()
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
    selectedAnnotationId,
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
    addSwatch,
    removeSwatch,
    paletteEntries: computed(() => completePaletteEntries(project.value)),
    updatePaletteEntry,
    movePaletteEntry,
    reorderPaletteEntry,
    switchPaletteColor,
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
    setHeaderSelection,
    setMagicSelection,
    fillSelection,
    eraseSelection,
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
    rotateSelection,
    hasSelection: computed(() => selection.value !== null),
    hasClipboard: computed(() => clipboard.value !== null),
    saveRepeatBox,
    toggleRepeatBox,
    removeRepeatBox,
    addAnnotation,
    updateAnnotation,
    moveAnnotation,
    removeAnnotation,
    undo,
    redo,
  }
}
