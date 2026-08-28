import type { NewPatternProject, PatternProject } from '../../../types/pattern'
import type { TrackerState } from '../../../types/tracker'
import { cloneGrid, createGrid } from '../../../utils/grid'
import { paletteEntries } from '../../../utils/palette'
import { createStableId } from '../../../utils/validation'
import type { PatternCommandContext } from '../domain/patternCommandContext'

export function usePatternFactoryCommands(context: PatternCommandContext) {
  function replaceProject(next: PatternProject, nextTracker?: TrackerState) {
    context.project.value = { ...next, recentColors: [...next.recentColors], swatches: [...next.swatches], palette: next.palette.map((entry) => ({ ...entry })), repeatBoxes: next.repeatBoxes.map((box) => ({ ...box })), annotations: next.annotations.map((annotation) => ({ ...annotation })), cells: cloneGrid(next.cells) }
    context.project.value.palette = paletteEntries(context.project.value)
    context.tracker.value = nextTracker ? structuredClone(nextTracker) : undefined
    context.recentColors.value = [...next.recentColors]
    context.persistColors()
    context.selectRow(0)
    context.selectColumn(0)
    context.selection.value = null
    context.selectedAnnotationId.value = null
    context.clipboard.value = null
    context.resetHistory()
    context.replacementVersion.value += 1
  }

  function createProject(input: NewPatternProject) {
    replaceProject({ ...input, format: 'stitch-pattern', version: 1, rowIds: Array.from({ length: input.rows }, createStableId), columnIds: Array.from({ length: input.columns }, createStableId), previewStitch: 'knit', recentColors: [...context.recentColors.value], swatches: [], palette: [], repeatBoxes: [], annotations: [], cells: createGrid(input.rows, input.columns, input.backgroundColor) })
  }

  return { replaceProject, createProject }
}
