import type { PatternProject } from '../types/pattern'
import type { LegacyTrackerProgress, StitchProject, TrackerPreferences, TrackerProgress, TrackerState, TrackerTimer } from '../types/tracker'
import { renderGrid } from './grid'
import { appError } from './appError'
import { asPatternProject } from './validation'

function validPreferences(value: unknown): TrackerPreferences | undefined {
  if (!value || typeof value !== 'object') return undefined
  const preferences = value as Partial<TrackerPreferences>
  if ((preferences.display !== 'canvas' && preferences.display !== 'knit' && preferences.display !== 'cross-stitch' && preferences.display !== 'single-crochet')
    || !Number.isInteger(preferences.cellSize) || preferences.cellSize! < 16 || preferences.cellSize! > 48
    || typeof preferences.autoScroll !== 'boolean') return undefined
  return {
    display: preferences.display,
    cellSize: preferences.cellSize!,
    autoScroll: preferences.autoScroll,
    keepAwake: typeof preferences.keepAwake === 'boolean' ? preferences.keepAwake : false,
    showSymbols: typeof preferences.showSymbols === 'boolean' ? preferences.showSymbols : false,
    showAnnotations: typeof preferences.showAnnotations === 'boolean' ? preferences.showAnnotations : true,
  }
}

function asTimer(value: unknown): TrackerTimer {
  if (value === undefined) return { elapsedMilliseconds: 0, startedAt: null }
  if (!value || typeof value !== 'object') throw appError('tracker.timer')
  const timer = value as Partial<TrackerTimer>
  if (!Number.isSafeInteger(timer.elapsedMilliseconds) || timer.elapsedMilliseconds! < 0
    || (timer.startedAt !== null && (typeof timer.startedAt !== 'string' || Number.isNaN(Date.parse(timer.startedAt))))) throw appError('tracker.timer')
  return { elapsedMilliseconds: timer.elapsedMilliseconds!, startedAt: timer.startedAt ?? null }
}

function progressSettings(value: Record<string, unknown>) {
  const completionMode = value.completionMode === undefined ? 'sequential' : value.completionMode
  if (completionMode !== 'sequential' && completionMode !== 'individual') throw appError('tracker.completionMode')
  if (value.startRow !== 'top' && value.startRow !== 'bottom') throw appError('tracker.startRow')
  if (value.firstRowDirection !== 'left-to-right' && value.firstRowDirection !== 'right-to-left') throw appError('tracker.rowDirection')
  if (typeof value.alternateRows !== 'boolean') throw appError('tracker.alternateRows')
  if (typeof value.updatedAt !== 'string' || Number.isNaN(Date.parse(value.updatedAt))) throw appError('tracker.updatedAt')
  return {
    completionMode,
    startRow: value.startRow,
    firstRowDirection: value.firstRowDirection,
    alternateRows: value.alternateRows,
    updatedAt: value.updatedAt,
  } satisfies Omit<TrackerProgress, 'completedCells'>
}

function orderedIds(pattern: PatternProject, progress: Pick<TrackerProgress, 'startRow' | 'firstRowDirection' | 'alternateRows'>) {
  const rendered = renderGrid(pattern.cells, pattern.horizontalRepeats, pattern.verticalRepeats, pattern.repeatBoxes, pattern.rowIds, pattern.columnIds)
  const rows = rendered.cells.length
  const columns = rendered.cells[0].length
  return rendered.cellIds.flatMap((row, rowIndex) => row.map((id, columnIndex) => {
    const logicalRow = progress.startRow === 'top' ? rowIndex : rows - rowIndex - 1
    const direction = !progress.alternateRows || logicalRow % 2 === 0
      ? progress.firstRowDirection
      : progress.firstRowDirection === 'left-to-right' ? 'right-to-left' : 'left-to-right'
    const logicalColumn = direction === 'left-to-right' ? columnIndex : columns - columnIndex - 1
    return { id, ordinal: logicalRow * columns + logicalColumn }
  })).sort((first, second) => first.ordinal - second.ordinal).map(({ id }) => id)
}

function legacyProgress(value: unknown, pattern: PatternProject): TrackerProgress {
  if (!value || typeof value !== 'object') throw appError('tracker.progressMissing')
  const source = value as unknown as Record<string, unknown>
  const settings = progressSettings(source)
  const ids = orderedIds(pattern, settings)
  const legacy = value as LegacyTrackerProgress
  if (!Number.isInteger(legacy.completedCount) || legacy.completedCount < 0 || legacy.completedCount > ids.length) throw appError('tracker.completedCount')
  const indexes = legacy.completedCells === undefined ? [] : legacy.completedCells
  if (!Array.isArray(indexes) || indexes.some((cell) => !Number.isInteger(cell) || cell < 0 || cell >= ids.length) || new Set(indexes).size !== indexes.length) throw appError('tracker.completedCells')
  const rendered = renderGrid(pattern.cells, pattern.horizontalRepeats, pattern.verticalRepeats, pattern.repeatBoxes, pattern.rowIds, pattern.columnIds)
  const completedCells = settings.completionMode === 'sequential'
    ? ids.slice(0, legacy.completedCount)
    : indexes.map((index) => rendered.cellIds[Math.floor(index / rendered.cells[0].length)][index % rendered.cells[0].length])
  return { ...settings, completedCells: [...new Set(completedCells)].sort() }
}

export function asTrackerState(value: unknown, pattern: PatternProject): TrackerState {
  if (!value || typeof value !== 'object') throw appError('tracker.progressMissing')
  const source = value as Record<string, unknown>
  if (!source.progress || typeof source.progress !== 'object') throw appError('tracker.progressMissing')
  const progressSource = source.progress as Record<string, unknown>
  const settings = progressSettings(progressSource)
  const validIds = new Set(renderGrid(pattern.cells, pattern.horizontalRepeats, pattern.verticalRepeats, pattern.repeatBoxes, pattern.rowIds, pattern.columnIds).cellIds.flat())
  if (!Array.isArray(progressSource.completedCells) || progressSource.completedCells.some((id) => typeof id !== 'string' || !validIds.has(id)) || new Set(progressSource.completedCells).size !== progressSource.completedCells.length) throw appError('tracker.completedCells')
  const preferences = validPreferences(source.preferences)
  return {
    progress: { ...settings, completedCells: [...progressSource.completedCells as string[]].sort() },
    timer: asTimer(source.timer),
    ...(preferences ? { preferences } : {}),
  }
}

export function createTrackerState(preferences?: TrackerPreferences): TrackerState {
  return {
    progress: {
      completedCells: [],
      completionMode: 'sequential',
      startRow: 'top',
      firstRowDirection: 'left-to-right',
      alternateRows: false,
      updatedAt: new Date().toISOString(),
    },
    timer: { elapsedMilliseconds: 0, startedAt: null },
    ...(preferences ? { preferences: { ...preferences } } : {}),
  }
}

export function asStitchProject(value: unknown): StitchProject {
  if (!value || typeof value !== 'object') throw appError('validation.projectObject')
  const source = value as Record<string, unknown>
  if (source.format === 'stitch-pattern') return { format: 'stitch-project', version: 1, pattern: asPatternProject(source) }
  if (source.format === 'stitch-tracker') {
    if (source.version !== 1) throw appError('tracker.unsupportedFile')
    const pattern = asPatternProject(source.pattern)
    return {
      format: 'stitch-project',
      version: 1,
      pattern,
      tracker: {
        progress: legacyProgress(source.progress, pattern),
        timer: asTimer(source.timer),
        ...(validPreferences(source.preferences) ? { preferences: validPreferences(source.preferences) } : {}),
      },
    }
  }
  if (source.format !== 'stitch-project' || source.version !== 1) throw appError('validation.unsupportedPattern')
  const pattern = asPatternProject(source.pattern)
  return {
    format: 'stitch-project',
    version: 1,
    pattern,
    ...(source.tracker === undefined ? {} : { tracker: asTrackerState(source.tracker, pattern) }),
  }
}
