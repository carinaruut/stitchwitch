import type { PatternProject } from './pattern'

export type TrackerStartRow = 'top' | 'bottom'
export type TrackerDirection = 'left-to-right' | 'right-to-left'

export interface TrackerProgress {
  completedCount: number
  startRow: TrackerStartRow
  firstRowDirection: TrackerDirection
  alternateRows: boolean
  updatedAt: string
}

export interface TrackerProject {
  format: 'stitch-tracker'
  version: 1
  pattern: PatternProject
  progress: TrackerProgress
}
