import type { PatternProject } from '../types/pattern'
import { MAX_TRACKER_COUNTER_NAME_LENGTH, MAX_TRACKER_COUNTERS, MAX_TRACKER_DAILY_STITCH_GOAL, MAX_TRACKER_DAILY_TIME_GOAL_MINUTES, MAX_TRACKER_PROJECT_NOTE_LENGTH, MAX_TRACKER_ROW_NOTE_LENGTH, MAX_TRACKER_SESSION_ARCHIVES, MAX_TRACKER_SESSIONS, type LegacyTrackerProgress, type StitchProject, type TrackerCounter, type TrackerDailyGoal, type TrackerPreferences, type TrackerProgress, type TrackerSession, type TrackerSessionArchive, type TrackerState, type TrackerTimer } from '../types/tracker'
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

function asTimer(value: unknown, validCellIds?: Set<string>): TrackerTimer {
  if (value === undefined) return { elapsedMilliseconds: 0, startedAt: null, sessionStartedCompletedCount: null, sessionStartedCompletedCells: null }
  if (!value || typeof value !== 'object') throw appError('tracker.timer')
  const timer = value as Partial<TrackerTimer>
  if (!Number.isSafeInteger(timer.elapsedMilliseconds) || timer.elapsedMilliseconds! < 0
    || (timer.startedAt !== null && (typeof timer.startedAt !== 'string' || Number.isNaN(Date.parse(timer.startedAt))))
    || (timer.sessionStartedCompletedCount !== undefined && timer.sessionStartedCompletedCount !== null
      && (!Number.isSafeInteger(timer.sessionStartedCompletedCount) || timer.sessionStartedCompletedCount < 0))) throw appError('tracker.timer')
  const startedAt = timer.startedAt ?? null
  const startedCells = timer.sessionStartedCompletedCells
  if (startedCells !== undefined && startedCells !== null
    && (!Array.isArray(startedCells)
      || startedCells.some((id) => typeof id !== 'string' || (validCellIds && !validCellIds.has(id)))
      || new Set(startedCells).size !== startedCells.length)) throw appError('tracker.timer')
  return {
    elapsedMilliseconds: timer.elapsedMilliseconds!,
    startedAt,
    sessionStartedCompletedCount: startedAt ? timer.sessionStartedCompletedCount ?? null : null,
    sessionStartedCompletedCells: startedAt && Array.isArray(startedCells) ? [...startedCells].sort() : null,
  }
}

function asSessions(value: unknown): TrackerSession[] {
  if (value === undefined) return []
  if (!Array.isArray(value) || value.length > MAX_TRACKER_SESSIONS) throw appError('tracker.sessions')
  const ids = new Set<string>()
  return value.map((item) => {
    if (!item || typeof item !== 'object') throw appError('tracker.sessions')
    const session = item as Partial<TrackerSession>
    const started = typeof session.startedAt === 'string' ? Date.parse(session.startedAt) : Number.NaN
    const ended = typeof session.endedAt === 'string' ? Date.parse(session.endedAt) : Number.NaN
    if (typeof session.id !== 'string' || !session.id || session.id.length > 100 || ids.has(session.id)
      || Number.isNaN(started) || Number.isNaN(ended) || ended < started
      || !Number.isSafeInteger(session.durationMilliseconds) || session.durationMilliseconds! < 0
      || !Number.isSafeInteger(session.stitchesCompleted) || session.stitchesCompleted! < 0
      || (session.stitchesReopened !== undefined && (!Number.isSafeInteger(session.stitchesReopened) || session.stitchesReopened! < 0))) throw appError('tracker.sessions')
    ids.add(session.id)
    return {
      id: session.id,
      startedAt: session.startedAt!,
      endedAt: session.endedAt!,
      durationMilliseconds: session.durationMilliseconds!,
      stitchesCompleted: session.stitchesCompleted!,
      stitchesReopened: session.stitchesReopened ?? 0,
    }
  })
}

function asSessionArchives(value: unknown): TrackerSessionArchive[] {
  if (value === undefined) return []
  if (!Array.isArray(value) || value.length > MAX_TRACKER_SESSION_ARCHIVES) throw appError('tracker.sessions')
  const ids = new Set<string>()
  return value.map((item) => {
    if (!item || typeof item !== 'object') throw appError('tracker.sessions')
    const archive = item as Partial<TrackerSessionArchive>
    if (typeof archive.id !== 'string' || !archive.id || archive.id.length > 100 || ids.has(archive.id)
      || typeof archive.archivedAt !== 'string' || Number.isNaN(Date.parse(archive.archivedAt))
      || !Number.isSafeInteger(archive.elapsedMilliseconds) || archive.elapsedMilliseconds! < 0) throw appError('tracker.sessions')
    ids.add(archive.id)
    return {
      id: archive.id,
      archivedAt: archive.archivedAt,
      elapsedMilliseconds: archive.elapsedMilliseconds!,
      sessions: asSessions(archive.sessions),
    }
  })
}

function asDailyGoal(value: unknown): TrackerDailyGoal | null {
  if (value === undefined || value === null) return null
  if (!value || typeof value !== 'object') throw appError('tracker.goals')
  const goal = value as Partial<TrackerDailyGoal> & { targetStitches?: unknown; targetMinutes?: unknown }
  if (goal.type === 'stitches' && Number.isSafeInteger(goal.targetStitches)
    && goal.targetStitches! >= 1 && goal.targetStitches! <= MAX_TRACKER_DAILY_STITCH_GOAL) {
    return { type: 'stitches', targetStitches: goal.targetStitches! }
  }
  if (goal.type === 'time' && Number.isSafeInteger(goal.targetMinutes)
    && goal.targetMinutes! >= 1 && goal.targetMinutes! <= MAX_TRACKER_DAILY_TIME_GOAL_MINUTES) {
    return { type: 'time', targetMinutes: goal.targetMinutes! }
  }
  throw appError('tracker.goals')
}

function asNotes(source: Record<string, unknown>, pattern: PatternProject) {
  const projectNote = source.projectNote === undefined ? '' : source.projectNote
  if (typeof projectNote !== 'string' || projectNote.length > MAX_TRACKER_PROJECT_NOTE_LENGTH) throw appError('tracker.notes')

  const rowNotesSource = source.rowNotes === undefined ? {} : source.rowNotes
  if (!rowNotesSource || typeof rowNotesSource !== 'object' || Array.isArray(rowNotesSource)) throw appError('tracker.notes')
  const validRowIds = new Set(pattern.rowIds)
  const rowNotes: Record<string, string> = {}
  for (const [rowId, note] of Object.entries(rowNotesSource)) {
    if (typeof note !== 'string' || note.length > MAX_TRACKER_ROW_NOTE_LENGTH) throw appError('tracker.notes')
    if (validRowIds.has(rowId) && note) rowNotes[rowId] = note
  }
  return { projectNote, rowNotes }
}

function asCounters(value: unknown): TrackerCounter[] {
  if (value === undefined) return []
  if (!Array.isArray(value) || value.length > MAX_TRACKER_COUNTERS) throw appError('tracker.counters')
  const ids = new Set<string>()
  return value.map((item) => {
    if (!item || typeof item !== 'object') throw appError('tracker.counters')
    const counter = item as Partial<TrackerCounter>
    if (typeof counter.id !== 'string' || !counter.id || counter.id.length > 100 || ids.has(counter.id)
      || typeof counter.name !== 'string' || !counter.name.trim() || counter.name.length > MAX_TRACKER_COUNTER_NAME_LENGTH
      || !Number.isSafeInteger(counter.value)) throw appError('tracker.counters')
    ids.add(counter.id)
    return { id: counter.id, name: counter.name, value: counter.value! }
  })
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
    timer: asTimer(source.timer, validIds),
    ...asNotes(source, pattern),
    counters: asCounters(source.counters),
    sessions: asSessions(source.sessions),
    sessionArchives: asSessionArchives(source.sessionArchives),
    dailyGoal: asDailyGoal(source.dailyGoal),
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
    timer: { elapsedMilliseconds: 0, startedAt: null, sessionStartedCompletedCount: null, sessionStartedCompletedCells: null },
    projectNote: '',
    rowNotes: {},
    counters: [],
    sessions: [],
    sessionArchives: [],
    dailyGoal: null,
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
        timer: asTimer(source.timer, new Set(renderGrid(pattern.cells, pattern.horizontalRepeats, pattern.verticalRepeats, pattern.repeatBoxes, pattern.rowIds, pattern.columnIds).cellIds.flat())),
        projectNote: '',
        rowNotes: {},
        counters: [],
        sessions: [],
        sessionArchives: [],
        dailyGoal: null,
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
