export type PatternGrid = string[][]
export type AnnotationType = 'text' | 'marker' | 'arrow'
export type DrawingTool = 'pencil' | 'eraser' | 'fill' | 'eyedropper' | 'select' | 'wand' | 'move' | AnnotationType
export type PreviewStitch = 'knit' | 'cross-stitch' | 'single-crochet'
export type PatternDisplay = 'canvas' | PreviewStitch
export type PrintMode = 'color' | 'symbols'

export const MAX_REPEAT_COUNT = 100
export const MAX_PROJECT_SWATCHES = 32
export const MAX_PALETTE_ENTRIES = 1000
export const MAX_ANNOTATIONS = 500

interface PatternAnnotationBase {
  id: string
  type: AnnotationType
  row: number
  column: number
  color: string
}

export interface TextAnnotation extends PatternAnnotationBase {
  type: 'text'
  text: string
}

export interface MarkerAnnotation extends PatternAnnotationBase {
  type: 'marker'
}

export interface ArrowAnnotation extends PatternAnnotationBase {
  type: 'arrow'
  endRow: number
  endColumn: number
}

export type PatternAnnotation = TextAnnotation | MarkerAnnotation | ArrowAnnotation

export interface PaletteEntry {
  color: string
  name: string
  brand: string
  code: string
  notes: string
}

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
  swatches: string[]
  palette: PaletteEntry[]
  repeatBoxes: RepeatBox[]
  annotations: PatternAnnotation[]
  cells: PatternGrid
}

export type NewPatternProject = Omit<PatternProject, 'format' | 'version' | 'previewStitch' | 'cells' | 'recentColors' | 'swatches' | 'palette' | 'repeatBoxes' | 'annotations'>
