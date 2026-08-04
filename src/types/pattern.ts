export type PatternGrid = string[][]
export type DrawingTool = 'pencil' | 'eraser' | 'eyedropper' | 'move'
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
  repeatBoxes: RepeatBox[]
  cells: PatternGrid
}
