import { MAX_ANNOTATIONS, type AnnotationType, type PatternAnnotation } from '../../../types/pattern'
import { normalizeColor } from '../../../utils/colors'
import { translateError } from '../../../utils/localizedErrors'
import type { PatternCommandContext } from '../domain/patternCommandContext'

export function usePatternAnnotationCommands(context: PatternCommandContext) {
  function addAnnotation(type: AnnotationType, row: number, column: number, endRow = row, endColumn = column, text = translateError('defaults.annotationText')) {
    if (context.project.value.annotations.length >= MAX_ANNOTATIONS) return null
    const boundedRow = Math.max(0, Math.min(context.project.value.cells.length - 1, row))
    const boundedColumn = Math.max(0, Math.min(context.project.value.cells[0].length - 1, column))
    const base = { id: crypto.randomUUID(), row: boundedRow, column: boundedColumn, color: context.selectedColor.value }
    const annotation: PatternAnnotation = type === 'text'
      ? { ...base, type, text }
      : type === 'arrow'
        ? { ...base, type, endRow: Math.max(0, Math.min(context.project.value.cells.length - 1, endRow)), endColumn: Math.max(0, Math.min(context.project.value.cells[0].length - 1, endColumn)) }
        : { ...base, type }
    context.beginGridChange()
    context.project.value.annotations.push(annotation)
    context.selectedAnnotationId.value = annotation.id
    return annotation.id
  }

  function updateAnnotation(id: string, updates: { text?: string; color?: string; row?: number; column?: number; endRow?: number; endColumn?: number }) {
    const annotation = context.project.value.annotations.find((candidate) => candidate.id === id)
    if (!annotation) return false
    const color = updates.color === undefined ? undefined : normalizeColor(updates.color)
    if (updates.color !== undefined && !color) return false
    const rows = context.project.value.cells.length
    const columns = context.project.value.cells[0].length
    const next = {
      ...annotation,
      ...(updates.text !== undefined && annotation.type === 'text' ? { text: updates.text.trim().slice(0, 500) || annotation.text } : {}),
      ...(color ? { color } : {}),
      ...(updates.row !== undefined ? { row: Math.max(0, Math.min(rows - 1, Math.round(updates.row))) } : {}),
      ...(updates.column !== undefined ? { column: Math.max(0, Math.min(columns - 1, Math.round(updates.column))) } : {}),
      ...(updates.endRow !== undefined && annotation.type === 'arrow' ? { endRow: Math.max(0, Math.min(rows - 1, Math.round(updates.endRow))) } : {}),
      ...(updates.endColumn !== undefined && annotation.type === 'arrow' ? { endColumn: Math.max(0, Math.min(columns - 1, Math.round(updates.endColumn))) } : {}),
    } as PatternAnnotation
    if (JSON.stringify(annotation) === JSON.stringify(next)) return false
    context.beginGridChange()
    Object.assign(annotation, next)
    return true
  }

  function moveAnnotation(id: string, rowDelta: number, columnDelta: number) {
    const annotation = context.project.value.annotations.find((candidate) => candidate.id === id)
    if (!annotation || (!rowDelta && !columnDelta)) return false
    return updateAnnotation(id, {
      row: annotation.row + rowDelta,
      column: annotation.column + columnDelta,
      ...(annotation.type === 'arrow' ? { endRow: annotation.endRow + rowDelta, endColumn: annotation.endColumn + columnDelta } : {}),
    })
  }

  function removeAnnotation(id: string) {
    if (!context.project.value.annotations.some((annotation) => annotation.id === id)) return false
    context.beginGridChange()
    context.project.value.annotations = context.project.value.annotations.filter((annotation) => annotation.id !== id)
    if (context.selectedAnnotationId.value === id) context.selectedAnnotationId.value = null
    return true
  }

  return { addAnnotation, updateAnnotation, moveAnnotation, removeAnnotation }
}
