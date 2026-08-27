import type { PatternDisplay, PatternProject } from './pattern'

export type TrackerStartRow = 'top' | 'bottom'
export type TrackerDirection = 'left-to-right' | 'right-to-left'
export type TrackerCompletionMode = 'sequential' | 'individual'

export const MAX_TRACKER_PROJECT_NOTE_LENGTH = 5000
export const MAX_TRACKER_ROW_NOTE_LENGTH = 1000
export const MAX_TRACKER_COUNTERS = 50
export const MAX_TRACKER_COUNTER_NAME_LENGTH = 100
export const MAX_TRACKER_SESSIONS = 5000
export const MAX_TRACKER_SESSION_ARCHIVES = 500

export interface TrackerProgress {
  completedCells: string[]
  completionMode: TrackerCompletionMode
  startRow: TrackerStartRow
  firstRowDirection: TrackerDirection
  alternateRows: boolean
  updatedAt: string
}

export interface TrackerTimer {
  elapsedMilliseconds: number
  startedAt: string | null
  sessionStartedCompletedCount?: number | null
}

export interface TrackerSession {
  id: string
  startedAt: string
  endedAt: string
  durationMilliseconds: number
  stitchesCompleted: number
}

export interface TrackerSessionArchive {
  id: string
  archivedAt: string
  elapsedMilliseconds: number
  sessions: TrackerSession[]
}

export interface TrackerPreferences {
  display: PatternDisplay
  cellSize: number
  autoScroll: boolean
  keepAwake: boolean
  showSymbols: boolean
  showAnnotations: boolean
}

export interface TrackerCounter {
  id: string
  name: string
  value: number
}

export interface TrackerState {
  progress: TrackerProgress
  timer: TrackerTimer
  projectNote: string
  rowNotes: Record<string, string>
  counters: TrackerCounter[]
  sessions: TrackerSession[]
  sessionArchives: TrackerSessionArchive[]
  preferences?: TrackerPreferences
}

export interface StitchProject {
  format: 'stitch-project'
  version: 1
  pattern: PatternProject
  tracker?: TrackerState
}

export interface LegacyTrackerProgress {
  completedCount: number
  completedCells: number[]
  completionMode: TrackerCompletionMode
  startRow: TrackerStartRow
  firstRowDirection: TrackerDirection
  alternateRows: boolean
  updatedAt: string
}

export interface TrackerProject {
  format: 'stitch-tracker'
  version: 1
  pattern: PatternProject
  progress: LegacyTrackerProgress
  timer: TrackerTimer
  preferences?: TrackerPreferences
}
