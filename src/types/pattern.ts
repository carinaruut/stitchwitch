export type PatternGrid = string[][]
export type DrawingTool = 'pencil' | 'eraser' | 'eyedropper' | 'move'

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
  cells: PatternGrid
}
