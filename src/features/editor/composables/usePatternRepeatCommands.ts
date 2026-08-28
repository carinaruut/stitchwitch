import { MAX_REPEAT_COUNT, type RepeatBox, type RepeatBoxInput } from '../../../types/pattern'
import { boxesOverlap, ensureGridSize, synchronizeRepeatBox } from '../../../utils/grid'
import { translateError } from '../../../utils/localizedErrors'
import type { PatternCommandContext } from '../domain/patternCommandContext'

export function usePatternRepeatCommands(context: PatternCommandContext) {
  function repeatBoxesConflict(candidate: RepeatBox): boolean {
    return context.project.value.repeatBoxes.some((box) => box.id !== candidate.id && boxesOverlap(box, candidate))
  }

  function saveRepeatBox(input: RepeatBoxInput, id: string | null): string | null {
    const candidate: RepeatBox = { ...input, id: id ?? crypto.randomUUID() }
    const values = [candidate.top, candidate.bottom, candidate.left, candidate.right, candidate.sections]
    if (!values.every(Number.isInteger) || candidate.top < 0 || candidate.left < 0 || candidate.bottom <= candidate.top || candidate.right <= candidate.left || candidate.sections < 2 || candidate.sections > MAX_REPEAT_COUNT) return translateError('repeatSave.settings')
    if (candidate.bottom > 500 || candidate.right > 500) return translateError('repeatSave.bounds')
    const length = candidate.direction === 'across' ? candidate.right - candidate.left : candidate.bottom - candidate.top
    if (length % candidate.sections !== 0) return translateError('repeatSave.sections')
    if (repeatBoxesConflict(candidate)) return translateError('repeatSave.overlap')

    context.beginGridChange()
    const existingIndex = context.project.value.repeatBoxes.findIndex((box) => box.id === candidate.id)
    if (existingIndex >= 0) context.project.value.cells = synchronizeRepeatBox(context.project.value.cells, context.project.value.repeatBoxes[existingIndex])
    context.project.value.cells = ensureGridSize(context.project.value.cells, candidate.bottom, candidate.right, context.project.value.backgroundColor)
    if (existingIndex >= 0) context.project.value.repeatBoxes[existingIndex] = candidate
    else context.project.value.repeatBoxes.push(candidate)
    context.project.value.cells = synchronizeRepeatBox(context.project.value.cells, candidate)
    return null
  }

  function toggleRepeatBox(id: string, enabled: boolean) {
    const box = context.project.value.repeatBoxes.find((candidate) => candidate.id === id)
    if (!box || box.enabled === enabled) return
    context.beginGridChange()
    context.project.value.cells = synchronizeRepeatBox(context.project.value.cells, box)
    box.enabled = enabled
  }

  function removeRepeatBox(id: string) {
    const box = context.project.value.repeatBoxes.find((candidate) => candidate.id === id)
    if (!box) return
    context.beginGridChange()
    context.project.value.cells = synchronizeRepeatBox(context.project.value.cells, box)
    context.project.value.repeatBoxes = context.project.value.repeatBoxes.filter((candidate) => candidate.id !== id)
  }

  return { saveRepeatBox, toggleRepeatBox, removeRepeatBox }
}
