import type { PatternGrid, PatternProject, RepeatBox } from '../types/pattern'
import { boxesOverlap } from './grid'
import { isHexColor } from './colors'

export interface ValidationResult {
  valid: boolean
  error?: string
}

interface LegacyRepeatRange {
  id: string
  axis: 'row' | 'column'
  start: number
  end: number
  count: number
  enabled: boolean
}

function repeatBoxesConflict(first: RepeatBox, second: RepeatBox): boolean {
  return boxesOverlap(first, second)
}

export function validateProject(value: unknown): ValidationResult {
  if (!value || typeof value !== 'object') return { valid: false, error: 'The file does not contain a project object.' }
  const project = value as Record<string, unknown>
  if (project.format !== 'stitch-pattern' || project.version !== 1) return { valid: false, error: 'This is not a supported stitch-pattern file.' }
  if (typeof project.name !== 'string' || !project.name.trim()) return { valid: false, error: 'The project name is missing.' }

  const integers: Array<[string, number, number]> = [
    ['rows', 1, 500],
    ['columns', 1, 500],
    ['cellSize', 8, 64],
    ['horizontalRepeats', 1, 20],
    ['verticalRepeats', 1, 20],
  ]
  for (const [key, minimum, maximum] of integers) {
    const number = project[key]
    if (!Number.isInteger(number) || (number as number) < minimum || (number as number) > maximum) {
      return { valid: false, error: `${key} must be a whole number from ${minimum} to ${maximum}.` }
    }
  }
  if (!isHexColor(project.backgroundColor)) return { valid: false, error: 'The background color is invalid.' }
  if (project.previewStitch !== undefined && project.previewStitch !== 'knit' && project.previewStitch !== 'cross-stitch') {
    return { valid: false, error: 'The preview stitch is invalid.' }
  }
  if (!Array.isArray(project.cells) || project.cells.length !== project.rows) return { valid: false, error: 'The cell rows do not match the project dimensions.' }
  const columns = project.columns as number
  if (!project.cells.every((row) => Array.isArray(row) && row.length === columns && row.every(isHexColor))) {
    return { valid: false, error: 'The cell colors or columns are invalid.' }
  }
  if (project.recentColors !== undefined && (!Array.isArray(project.recentColors) || project.recentColors.length > 20 || !project.recentColors.every(isHexColor))) {
    return { valid: false, error: 'The recent colors are invalid.' }
  }

  if (project.repeatBoxes !== undefined) {
    if (!Array.isArray(project.repeatBoxes) || project.repeatBoxes.length > 100) return { valid: false, error: 'The repeat boxes are invalid.' }
    const boxes = project.repeatBoxes as RepeatBox[]
    const ids = new Set<string>()
    for (const box of boxes) {
      if (typeof box.id !== 'string' || !box.id || ids.has(box.id)) return { valid: false, error: 'Each repeat box must have a unique ID.' }
      ids.add(box.id)
      const coordinates = [box.top, box.bottom, box.left, box.right, box.sections]
      if ((box.direction !== 'across' && box.direction !== 'down') || !coordinates.every(Number.isInteger) || typeof box.enabled !== 'boolean') {
        return { valid: false, error: 'A repeat box has invalid settings.' }
      }
      if (box.top < 0 || box.left < 0 || box.bottom <= box.top || box.right <= box.left || box.bottom > (project.rows as number) || box.right > columns || box.sections < 2 || box.sections > 20) {
        return { valid: false, error: 'A repeat box is outside the pattern.' }
      }
      const length = box.direction === 'across' ? box.right - box.left : box.bottom - box.top
      if (length % box.sections !== 0) return { valid: false, error: 'A repeat box does not divide evenly into sections.' }
    }
    for (let index = 0; index < boxes.length; index += 1) {
      if (boxes.slice(index + 1).some((box) => repeatBoxesConflict(boxes[index], box))) {
        return { valid: false, error: 'Repeat boxes overlap.' }
      }
    }
  }
  return { valid: true }
}

function expandLegacyAxis(length: number, axis: LegacyRepeatRange['axis'], fallback: number, ranges: LegacyRepeatRange[]): number[] {
  const defined = ranges.filter((range) => range.axis === axis)
  const active = defined.filter((range) => range.enabled).sort((a, b) => a.start - b.start)
  if (defined.length === 0) return Array.from({ length: fallback }, () => Array.from({ length }, (_, index) => index)).flat()
  if (active.length === 0) return Array.from({ length }, (_, index) => index)
  const sources: number[] = []
  let source = 0
  for (const range of active) {
    while (source < range.start) sources.push(source++)
    for (let copy = 0; copy < range.count; copy += 1) {
      for (let index = range.start; index <= range.end; index += 1) sources.push(index)
    }
    source = range.end + 1
  }
  while (source < length) sources.push(source++)
  return sources
}

function flattenLegacyRepeats(project: Record<string, unknown>, cells: PatternGrid): PatternGrid {
  const ranges = Array.isArray(project.repeatRanges) ? project.repeatRanges as LegacyRepeatRange[] : []
  if (ranges.length === 0) return cells.map((row) => [...row])
  const rows = expandLegacyAxis(cells.length, 'row', project.verticalRepeats as number, ranges)
  const columns = expandLegacyAxis(cells[0].length, 'column', project.horizontalRepeats as number, ranges)
  return rows.map((row) => columns.map((column) => cells[row][column]))
}

export function asPatternProject(value: unknown): PatternProject {
  const result = validateProject(value)
  if (!result.valid) throw new Error(result.error)
  const source = value as Record<string, unknown>
  const originalCells = source.cells as PatternGrid
  const cells = source.repeatBoxes === undefined ? flattenLegacyRepeats(source, originalCells) : originalCells.map((row) => [...row])
  return {
    ...(source as unknown as PatternProject),
    rows: cells.length,
    columns: cells[0].length,
    horizontalRepeats: source.repeatBoxes === undefined && Array.isArray(source.repeatRanges) && source.repeatRanges.length > 0 ? 1 : source.horizontalRepeats as number,
    verticalRepeats: source.repeatBoxes === undefined && Array.isArray(source.repeatRanges) && source.repeatRanges.length > 0 ? 1 : source.verticalRepeats as number,
    previewStitch: source.previewStitch === 'cross-stitch' ? 'cross-stitch' : 'knit',
    recentColors: Array.isArray(source.recentColors) ? [...source.recentColors] as string[] : [],
    repeatBoxes: Array.isArray(source.repeatBoxes) ? (source.repeatBoxes as RepeatBox[]).map((box) => ({ ...box })) : [],
    cells,
  }
}
