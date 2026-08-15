export type PatternGrid = string[][]
export type DrawingTool = 'pencil' | 'eraser' | 'fill' | 'eyedropper' | 'select' | 'wand' | 'move'
export type PreviewStitch = 'knit' | 'cross-stitch' | 'single-crochet'
export type PatternDisplay = 'canvas' | PreviewStitch
export type PrintMode = 'color' | 'symbols'

export const MAX_REPEAT_COUNT = 100

export interface GridSelection {
  top: number
  left: number
  bottom: number
  right: number
  cells?: Array<[row: number, column: number]>
}
export type RepeatDirection = 'across' | 'down'

export interface RepeatBoxInput {
  direction: RepeatDirection
  top: number
  bottom: number
  left: number
  right: number
  sections: number
  enabled: boolean
}

export interface RepeatBox extends RepeatBoxInput {
  id: string
}

export interface PatternProject {
  format: 'stitch-pattern'
  version: 1
  name: string
  rows: number
  columns: number
  cellSize: number
  backgroundColor: string
  horizontalRepeats: number
  verticalRepeats: number
  previewStitch: PreviewStitch
  recentColors: string[]
  repeatBoxes: RepeatBox[]
  cells: PatternGrid
}

export type NewPatternProject = Omit<PatternProject, 'format' | 'version' | 'previewStitch' | 'cells' | 'recentColors' | 'repeatBoxes'>
