import type { PatternProject } from '../types/pattern'
import type { TrackerDirection, TrackerProgress, TrackerProject, TrackerStartRow } from '../types/tracker'
import { asPatternProject } from './validation'

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

export function createTracker(pattern: PatternProject): TrackerProject {
  return {
    format: 'stitch-tracker',
    version: 1,
    pattern: asPatternProject(pattern),
    progress: {
      completedCount: 0,
      startRow: 'top',
      firstRowDirection: 'left-to-right',
      alternateRows: false,
      updatedAt: new Date().toISOString(),
    },
  }
}

export function asTrackerProject(value: unknown): TrackerProject {
  if (!value || typeof value !== 'object') throw new Error('The file does not contain a tracker project.')
  const source = value as Record<string, unknown>
  if (source.format !== 'stitch-tracker' || source.version !== 1) throw new Error('This is not a supported stitch-tracker file.')
  const pattern = asPatternProject(source.pattern)
  if (!source.progress || typeof source.progress !== 'object') throw new Error('The tracker progress is missing.')
  const progress = source.progress as Record<string, unknown>
  const total = trackerTotal(pattern)
  if (!Number.isInteger(progress.completedCount) || (progress.completedCount as number) < 0 || (progress.completedCount as number) > total) {
    throw new Error('The completed stitch count is invalid.')
  }
  if (progress.startRow !== 'top' && progress.startRow !== 'bottom') throw new Error('The tracker start row is invalid.')
  if (progress.firstRowDirection !== 'left-to-right' && progress.firstRowDirection !== 'right-to-left') {
    throw new Error('The tracker row direction is invalid.')
  }
  if (typeof progress.alternateRows !== 'boolean') throw new Error('The tracker row alternation setting is invalid.')
  if (typeof progress.updatedAt !== 'string' || Number.isNaN(Date.parse(progress.updatedAt))) throw new Error('The tracker update time is invalid.')
  return {
    format: 'stitch-tracker',
    version: 1,
    pattern,
    progress: {
      completedCount: progress.completedCount as number,
      startRow: progress.startRow,
      firstRowDirection: progress.firstRowDirection,
      alternateRows: progress.alternateRows,
      updatedAt: progress.updatedAt,
    },
  }
}

function rowDirection(logicalRow: number, first: TrackerDirection, alternate: boolean): TrackerDirection {
  if (!alternate || logicalRow % 2 === 0) return first
  return first === 'left-to-right' ? 'right-to-left' : 'left-to-right'
}

export function stitchOrdinal(row: number, column: number, rows: number, columns: number, progress: TrackerProgress) {
  const logicalRow = progress.startRow === 'top' ? row : rows - row - 1
  const direction = rowDirection(logicalRow, progress.firstRowDirection, progress.alternateRows)
  const logicalColumn = direction === 'left-to-right' ? column : columns - column - 1
  return logicalRow * columns + logicalColumn
}

export function rowCompletionRange(row: number, rows: number, columns: number, startRow: TrackerStartRow) {
  const logicalRow = startRow === 'top' ? row : rows - row - 1
  return { before: logicalRow * columns, through: (logicalRow + 1) * columns }
}
