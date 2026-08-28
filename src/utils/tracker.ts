import type { PatternProject } from '../types/pattern'
import { MAX_TRACKER_SESSIONS, type TrackerDirection, type TrackerProgress, type TrackerStartRow, type TrackerState, type TrackerTimer } from '../types/tracker'
import type { RenderedGrid } from './grid'

export const MAX_TRACKER_STITCHES = 50_000

export function renderedDimensions(pattern: PatternProject) {
  const usesBoxes = pattern.repeatBoxes.length > 0
  return {
    rows: usesBoxes ? pattern.rows : pattern.rows * pattern.verticalRepeats,
    columns: usesBoxes ? pattern.columns : pattern.columns * pattern.horizontalRepeats,
  }
}

export function trackerTotal(pattern: PatternProject) {
  const dimensions = renderedDimensions(pattern)
  return dimensions.rows * dimensions.columns
}

export function trackerElapsedMilliseconds(timer: TrackerTimer, now = Date.now()) {
  if (!timer.startedAt) return timer.elapsedMilliseconds
  return timer.elapsedMilliseconds + Math.max(0, now - Date.parse(timer.startedAt))
}

export function trackerSessionProgress(timer: TrackerTimer, completedCells: readonly string[]) {
  const baselineCells = timer.sessionStartedCompletedCells
  if (baselineCells) {
    const baseline = new Set(baselineCells)
    const current = new Set(completedCells)
    const completed = completedCells.reduce((total, id) => total + (baseline.has(id) ? 0 : 1), 0)
    const reopened = baselineCells.reduce((total, id) => total + (current.has(id) ? 0 : 1), 0)
    return { completed, reopened, net: completed - reopened }
  }
  const delta = completedCells.length - (timer.sessionStartedCompletedCount ?? completedCells.length)
  return { completed: Math.max(0, delta), reopened: Math.max(0, -delta), net: delta }
}

export function trackerSessionNetStitches(session: Pick<TrackerState['sessions'][number], 'stitchesCompleted' | 'stitchesReopened'>) {
  return session.stitchesCompleted - session.stitchesReopened
}

export function completeTrackerSession(state: TrackerState, completedCells: readonly string[], endedAt = new Date()) {
  const startedAt = state.timer.startedAt
  if (!startedAt) return false
  const durationMilliseconds = Math.max(0, endedAt.getTime() - Date.parse(startedAt))
  const progress = trackerSessionProgress(state.timer, completedCells)
  state.timer.elapsedMilliseconds += durationMilliseconds
  state.timer.startedAt = null
  state.timer.sessionStartedCompletedCount = null
  state.timer.sessionStartedCompletedCells = null
  state.sessions.push({
    id: crypto.randomUUID(),
    startedAt,
    endedAt: endedAt.toISOString(),
    durationMilliseconds,
    stitchesCompleted: progress.completed,
    stitchesReopened: progress.reopened,
  })
  if (state.sessions.length > MAX_TRACKER_SESSIONS) state.sessions.shift()
  return true
}

function rowDirection(logicalRow: number, first: TrackerDirection, alternate: boolean): TrackerDirection {
  if (!alternate || logicalRow % 2 === 0) return first
  return first === 'left-to-right' ? 'right-to-left' : 'left-to-right'
}

export function stitchOrdinal(row: number, column: number, rows: number, columns: number, progress: Pick<TrackerProgress, 'startRow' | 'firstRowDirection' | 'alternateRows'>) {
  const logicalRow = progress.startRow === 'top' ? row : rows - row - 1
  const direction = rowDirection(logicalRow, progress.firstRowDirection, progress.alternateRows)
  const logicalColumn = direction === 'left-to-right' ? column : columns - column - 1
  return logicalRow * columns + logicalColumn
}

export function orderedCellIds(cellIds: string[][], progress: Pick<TrackerProgress, 'startRow' | 'firstRowDirection' | 'alternateRows'>) {
  const rows = cellIds.length
  const columns = cellIds[0].length
  return cellIds.flatMap((row, rowIndex) => row.map((id, columnIndex) => ({ id, ordinal: stitchOrdinal(rowIndex, columnIndex, rows, columns, progress) })))
    .sort((first, second) => first.ordinal - second.ordinal)
    .map(({ id }) => id)
}

export function isStitchCompleted(cellId: string, progress: TrackerProgress) {
  return progress.completedCells.includes(cellId)
}

export function nextStitchId(cellIds: string[][], progress: TrackerProgress) {
  const completed = new Set(progress.completedCells)
  return orderedCellIds(cellIds, progress).find((id) => !completed.has(id)) ?? null
}

export function activeTrackerRow(cellIds: string[][], progress: TrackerProgress) {
  const nextId = nextStitchId(cellIds, progress)
  if (nextId) return cellIds.findIndex((row) => row.includes(nextId))
  if (cellIds.length === 0) return null
  return progress.startRow === 'top' ? cellIds.length - 1 : 0
}

export function rowCellIds(row: number, cellIds: string[][]) {
  return cellIds[row] ?? []
}

export function rowCompletionRange(row: number, rows: number, columns: number, startRow: TrackerStartRow) {
  const logicalRow = startRow === 'top' ? row : rows - row - 1
  return { before: logicalRow * columns, through: (logicalRow + 1) * columns }
}

export function reconcileTracker(state: TrackerState | undefined, previous: RenderedGrid, current: RenderedGrid) {
  if (!state || state.progress.completedCells.length === 0) return false
  const previousColors = new Map<string, string>()
  previous.cellIds.forEach((row, rowIndex) => row.forEach((id, columnIndex) => previousColors.set(id, previous.cells[rowIndex][columnIndex])))
  const currentColors = new Map<string, string>()
  current.cellIds.forEach((row, rowIndex) => row.forEach((id, columnIndex) => currentColors.set(id, current.cells[rowIndex][columnIndex])))
  const completedCells = state.progress.completedCells.filter((id) => currentColors.has(id) && previousColors.get(id) === currentColors.get(id))
  if (completedCells.length === state.progress.completedCells.length) return false
  state.progress.completedCells = completedCells
  state.progress.updatedAt = new Date().toISOString()
  return true
}
