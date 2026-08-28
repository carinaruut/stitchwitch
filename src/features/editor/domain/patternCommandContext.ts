import type { Ref } from 'vue'
import type { DrawingTool, GridSelection, PatternGrid, PatternProject } from '../../../types/pattern'
import type { TrackerState } from '../../../types/tracker'

export interface SelectionClipboard {
  cells: PatternGrid
  mask: boolean[][] | null
}

export interface PatternCommandContext {
  project: Ref<PatternProject>
  tracker: Ref<TrackerState | undefined>
  tool: Ref<DrawingTool>
  selectedRow: Ref<number>
  selectedColumn: Ref<number>
  selectedRows: Ref<number[]>
  selectedColumns: Ref<number[]>
  selection: Ref<GridSelection | null>
  selectedAnnotationId: Ref<string | null>
  clipboard: Ref<SelectionClipboard | null>
  mirrorHorizontal: Ref<boolean>
  mirrorVertical: Ref<boolean>
  selectedColor: Ref<string>
  recentColors: Ref<string[]>
  replacementVersion: Ref<number>
  beginGridChange: () => void
  persistColors: () => void
  chooseColor: (value: string, recent?: boolean) => boolean
  selectRow: (index: number, extend?: boolean, exclusive?: boolean) => void
  selectColumn: (index: number, extend?: boolean, exclusive?: boolean) => void
  synchronizeEnabledBoxes: (cells: PatternGrid) => PatternGrid
  resetHistory: () => void
}
