import { computed, ref, watch } from 'vue'
import type { DrawingTool, GridSelection, PatternGrid, PatternProject } from '../../../types/pattern'
import type { StitchProject, TrackerState } from '../../../types/tracker'
import { normalizeColor } from '../../../utils/colors'
import { parseAxisSelection } from '../../../utils/axisSelection'
import { cloneGrid, createGrid, synchronizeRepeatBox } from '../../../utils/grid'
import { paletteEntries as completePaletteEntries } from '../../../utils/palette'
import { createStableId } from '../../../utils/validation'
import { useHistory } from '../../../shared/composables/useHistory'
import { usePatternAnnotationCommands } from './usePatternAnnotationCommands'
import { usePatternAutosave } from './usePatternAutosave'
import { usePatternAxisCommands } from './usePatternAxisCommands'
import { usePatternFactoryCommands } from './usePatternFactoryCommands'
import { usePatternPaintCommands } from './usePatternPaintCommands'
import { choosePatternColor, usePatternPaletteCommands } from './usePatternPaletteCommands'
import { usePatternRepeatCommands } from './usePatternRepeatCommands'
import { usePatternSelectionCommands } from './usePatternSelectionCommands'
import type { PatternCommandContext, SelectionClipboard } from '../domain/patternCommandContext'
import { createDefaultProject } from '../domain/patternFactory'

export { createDefaultProject }

interface PatternOptions {
  autosaveKey: string
  autosaveStorage?: Storage
  preferenceStorage?: Storage
  recovered?: boolean
}

export function createPattern(initialDocument: StitchProject, options: PatternOptions) {
  const recovered = options.recovered ?? false
  const initialProject = initialDocument.pattern
  const project = ref<PatternProject>({
    ...initialProject,
    recentColors: [...initialProject.recentColors],
    swatches: [...initialProject.swatches],
    palette: initialProject.palette.map((entry) => ({ ...entry })),
    repeatBoxes: initialProject.repeatBoxes.map((box) => ({ ...box })),
    annotations: initialProject.annotations.map((annotation) => ({ ...annotation })),
    cells: cloneGrid(initialProject.cells),
  })
  const tracker = ref<TrackerState | undefined>(initialDocument.tracker ? structuredClone(initialDocument.tracker) : undefined)
  project.value.palette = completePaletteEntries(project.value)
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
  const preferenceStorage = options.preferenceStorage ?? localStorage
  let savedColorValue = ''
  let savedRecent: string | null = null
  try {
    savedColorValue = preferenceStorage.getItem('stitch-selected-color') ?? ''
    savedRecent = preferenceStorage.getItem('stitch-recent-colors')
  } catch {
    // Keep project colors available when optional preference storage is unavailable.
  }
  const savedColor = normalizeColor(savedColorValue)
  const selectedColor = ref(savedColor ?? '#7c3aed')
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
  const replacementVersion = ref(0)
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

  function persistColors() {
    project.value.recentColors = [...recentColors.value]
    try {
      preferenceStorage.setItem('stitch-selected-color', selectedColor.value)
      preferenceStorage.setItem('stitch-recent-colors', JSON.stringify(recentColors.value))
    } catch {
      // Project state remains editable when optional preference storage is unavailable.
    }
  }

  function beginGridChange() {
    history.record({
      cells: project.value.cells,
      rowIds: project.value.rowIds,
      columnIds: project.value.columnIds,
      repeatBoxes: project.value.repeatBoxes,
      annotations: project.value.annotations,
      palette: project.value.palette,
      backgroundColor: project.value.backgroundColor,
      swatches: project.value.swatches,
      recentColors: recentColors.value,
    })
  }

  function synchronizeEnabledBoxes(cells: PatternGrid): PatternGrid {
    let next = cells
    for (const box of project.value.repeatBoxes) if (box.enabled) next = synchronizeRepeatBox(next, box)
    return next
  }

  const context: PatternCommandContext = {
    project,
    tracker,
    tool,
    selectedRow,
    selectedColumn,
    selectedRows,
    selectedColumns,
    selection,
    selectedAnnotationId,
    clipboard,
    mirrorHorizontal,
    mirrorVertical,
    selectedColor,
    recentColors,
    replacementVersion,
    beginGridChange,
    persistColors,
    chooseColor: (value, recent = false) => choosePatternColor(context, value, recent),
    selectRow,
    selectColumn,
    synchronizeEnabledBoxes,
    resetHistory: history.reset,
  }
  const chooseColor = context.chooseColor

  watch(
    () => project.value.cells,
    (cells) => {
      project.value.rows = cells.length
      project.value.columns = cells[0].length
      project.value.rowIds = project.value.rowIds.slice(0, cells.length)
      project.value.columnIds = project.value.columnIds.slice(0, cells[0].length)
      while (project.value.rowIds.length < cells.length) project.value.rowIds.push(createStableId())
      while (project.value.columnIds.length < cells[0].length) project.value.columnIds.push(createStableId())
    },
    { immediate: true, flush: 'sync' },
  )

  const autosave = usePatternAutosave(context, options.autosaveKey, recovered, options.autosaveStorage)
  const factoryCommands = usePatternFactoryCommands(context)
  const paletteCommands = usePatternPaletteCommands(context)
  const selectionCommands = usePatternSelectionCommands(context)
  const annotationCommands = usePatternAnnotationCommands(context)
  const repeatCommands = usePatternRepeatCommands(context)
  const paintCommands = usePatternPaintCommands(context)
  const axisCommands = usePatternAxisCommands(context)

  function mutateGrid(next: string[][]) {
    beginGridChange()
    project.value.cells = next
  }

  function clearGrid() {
    selection.value = null
    mutateGrid(createGrid(project.value.cells.length, project.value.cells[0].length, project.value.backgroundColor))
  }

  function currentSnapshot() {
    return { cells: project.value.cells, rowIds: project.value.rowIds, columnIds: project.value.columnIds, repeatBoxes: project.value.repeatBoxes, annotations: project.value.annotations, palette: project.value.palette, backgroundColor: project.value.backgroundColor, swatches: project.value.swatches, recentColors: recentColors.value }
  }

  function restoreSnapshot(snapshot: ReturnType<typeof currentSnapshot>) {
    project.value.cells = snapshot.cells
    project.value.rowIds = snapshot.rowIds
    project.value.columnIds = snapshot.columnIds
    project.value.repeatBoxes = snapshot.repeatBoxes
    project.value.annotations = snapshot.annotations
    project.value.palette = snapshot.palette
    project.value.backgroundColor = snapshot.backgroundColor
    project.value.swatches = snapshot.swatches
    recentColors.value = snapshot.recentColors
    persistColors()
  }

  function undo() {
    const snapshot = history.undo(currentSnapshot())
    if (snapshot) restoreSnapshot(snapshot)
    selectRow(Math.min(selectedRow.value, project.value.cells.length - 1))
    selectColumn(Math.min(selectedColumn.value, project.value.cells[0].length - 1))
  }

  function redo() {
    const snapshot = history.redo(currentSnapshot())
    if (snapshot) restoreSnapshot(snapshot)
    selectRow(Math.min(selectedRow.value, project.value.cells.length - 1))
    selectColumn(Math.min(selectedColumn.value, project.value.cells[0].length - 1))
  }

  return {
    project,
    tracker,
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
    restoredAutosave: autosave.restoredAutosave,
    replacementVersion,
    autosaveStatus: autosave.autosaveStatus,
    lastSavedAt: autosave.lastSavedAt,
    rowCount: computed(() => project.value.cells.length),
    columnCount: computed(() => project.value.cells[0].length),
    hasColoredCells: computed(() => project.value.cells.some((row) => row.some((color) => color !== project.value.backgroundColor))),
    ...history,
    chooseColor,
    ...paletteCommands,
    paletteEntries: computed(() => completePaletteEntries(project.value)),
    ...factoryCommands,
    beginGridChange,
    ...paintCommands,
    ...axisCommands,
    clearGrid,
    flushAutosave: autosave.flushAutosave,
    scheduleAutosave: autosave.scheduleAutosave,
    ...selectionCommands,
    selectRow,
    selectColumn,
    selectRows,
    selectColumns,
    clearRowSelection: () => { selectedRows.value = [] },
    clearColumnSelection: () => { selectedColumns.value = [] },
    clearSelection: () => { selection.value = null },
    hasSelection: computed(() => selection.value !== null),
    hasClipboard: computed(() => clipboard.value !== null),
    ...repeatCommands,
    ...annotationCommands,
    undo,
    redo,
    dispose: autosave.dispose,
  }
}

export type PatternState = ReturnType<typeof createPattern>
