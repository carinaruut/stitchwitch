import type { TrackerCompletionMode, TrackerDirection, TrackerStartRow } from '../../../types/tracker'
import { orderedCellIds, stitchOrdinal } from '../../../utils/tracker'
import type { TrackerCommandContext } from './trackerCommandContext'

export function createProgressCommands(context: TrackerCommandContext) {
  const { completedCount, ensureTracker, recordState, changed } = context

  function setOrder(startRow: TrackerStartRow, firstRowDirection: TrackerDirection, alternateRows: boolean) {
    const state = ensureTracker()
    if (completedCount.value > 0) return
    recordState()
    Object.assign(state.progress, { startRow, firstRowDirection, alternateRows })
    changed()
  }

  function setCompletionMode(mode: TrackerCompletionMode) {
    const state = ensureTracker()
    if (completedCount.value > 0 || state.progress.completionMode === mode) return
    recordState()
    state.progress.completionMode = mode
    changed()
  }

  function selectStitch(row: number, column: number, cellIds: string[][]) {
    const state = ensureTracker()
    const selected = cellIds[row][column]
    const completed = new Set(state.progress.completedCells)
    recordState()
    if (state.progress.completionMode === 'individual') {
      if (completed.has(selected)) completed.delete(selected)
      else completed.add(selected)
    } else {
      const ordered = orderedCellIds(cellIds, state.progress)
      const ordinal = stitchOrdinal(row, column, cellIds.length, cellIds[0].length, state.progress)
      if (completed.has(selected)) ordered.slice(ordinal).forEach((id) => completed.delete(id))
      else ordered.slice(0, ordinal + 1).forEach((id) => completed.add(id))
    }
    state.progress.completedCells = [...completed].sort()
    changed()
  }

  function selectStitches(cells: Array<[number, number]>, cellIds: string[][], complete: boolean) {
    const state = ensureTracker()
    if (state.progress.completionMode !== 'individual') return
    const completed = new Set(state.progress.completedCells)
    const ids = cells.map(([row, column]) => cellIds[row][column])
    if (ids.every((id) => completed.has(id) === complete)) return
    recordState()
    ids.forEach((id) => complete ? completed.add(id) : completed.delete(id))
    state.progress.completedCells = [...completed].sort()
    changed()
  }

  function selectRow(row: number, cellIds: string[][]) {
    const state = ensureTracker()
    const completed = new Set(state.progress.completedCells)
    const rowIds = cellIds[row]
    const rowComplete = rowIds.every((id) => completed.has(id))
    recordState()
    if (state.progress.completionMode === 'individual') rowIds.forEach((id) => rowComplete ? completed.delete(id) : completed.add(id))
    else {
      const ordered = orderedCellIds(cellIds, state.progress)
      const rowOrdinals = rowIds.map((id) => ordered.indexOf(id))
      const boundary = rowComplete ? Math.min(...rowOrdinals) : Math.max(...rowOrdinals)
      if (rowComplete) ordered.slice(boundary).forEach((id) => completed.delete(id))
      else ordered.slice(0, boundary + 1).forEach((id) => completed.add(id))
    }
    state.progress.completedCells = [...completed].sort()
    changed()
  }

  function resetProgress() {
    if (!context.tracker.value || completedCount.value === 0) return
    recordState()
    context.tracker.value.progress.completedCells = []
    changed()
  }

  return { setCompletionMode, setOrder, selectStitch, selectStitches, selectRow, resetProgress }
}
