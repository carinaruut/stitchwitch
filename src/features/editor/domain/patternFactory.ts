import type { PatternProject } from '../../../types/pattern'
import { createGrid } from '../../../utils/grid'
import { translateError } from '../../../utils/localizedErrors'
import { createStableId } from '../../../utils/validation'

export function createDefaultProject(): PatternProject {
  return {
    format: 'stitch-pattern',
    version: 1,
    name: translateError('defaults.projectName'),
    rows: 20,
    columns: 20,
    rowIds: Array.from({ length: 20 }, createStableId),
    columnIds: Array.from({ length: 20 }, createStableId),
    cellSize: 24,
    backgroundColor: '#ffffff',
    horizontalRepeats: 1,
    verticalRepeats: 1,
    previewStitch: 'knit',
    recentColors: [],
    swatches: [],
    palette: [],
    repeatBoxes: [],
    annotations: [],
    cells: createGrid(20, 20, '#ffffff'),
  }
}
