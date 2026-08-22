import { MAX_PALETTE_ENTRIES, MAX_PROJECT_SWATCHES, MAX_REPEAT_COUNT, type PaletteEntry, type PatternGrid, type PatternProject, type RepeatBox } from '../types/pattern'
import { boxesOverlap } from './grid'
import { isHexColor } from './colors'
import { appError, type AppError } from './appError'

export interface ValidationResult {
  valid: boolean
  error?: AppError
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
  if (!value || typeof value !== 'object') return { valid: false, error: appError('validation.projectObject') }
  const project = value as Record<string, unknown>
  if (project.format !== 'stitch-pattern' || project.version !== 1) return { valid: false, error: appError('validation.unsupportedPattern') }
  if (typeof project.name !== 'string' || !project.name.trim()) return { valid: false, error: appError('validation.projectNameMissing') }

  const integers: Array<[string, number, number]> = [
    ['rows', 1, 500],
    ['columns', 1, 500],
    ['cellSize', 8, 64],
    ['horizontalRepeats', 1, MAX_REPEAT_COUNT],
    ['verticalRepeats', 1, MAX_REPEAT_COUNT],
  ]
  for (const [key, minimum, maximum] of integers) {
    const number = project[key]
    if (!Number.isInteger(number) || (number as number) < minimum || (number as number) > maximum) {
      return { valid: false, error: appError('validation.integerRange', { fieldKey: `errors.validation.fields.${key}`, minimum, maximum }) }
    }
  }
  if (!isHexColor(project.backgroundColor)) return { valid: false, error: appError('validation.backgroundColor') }
  if (project.previewStitch !== undefined && project.previewStitch !== 'knit' && project.previewStitch !== 'cross-stitch' && project.previewStitch !== 'single-crochet') {
    return { valid: false, error: appError('validation.previewStitch') }
  }
  if (!Array.isArray(project.cells) || project.cells.length !== project.rows) return { valid: false, error: appError('validation.cellRows') }
  const columns = project.columns as number
  if (!project.cells.every((row) => Array.isArray(row) && row.length === columns && row.every(isHexColor))) {
    return { valid: false, error: appError('validation.cellColors') }
  }
  if (project.recentColors !== undefined && (!Array.isArray(project.recentColors) || project.recentColors.length > 20 || !project.recentColors.every(isHexColor))) {
    return { valid: false, error: appError('validation.recentColors') }
  }
  if (project.swatches !== undefined && (!Array.isArray(project.swatches) || project.swatches.length > MAX_PROJECT_SWATCHES || !project.swatches.every(isHexColor) || new Set(project.swatches.map((color) => String(color).toLowerCase())).size !== project.swatches.length)) {
    return { valid: false, error: appError('validation.swatches') }
  }
  if (project.palette !== undefined) {
    if (!Array.isArray(project.palette) || project.palette.length > MAX_PALETTE_ENTRIES) return { valid: false, error: appError('validation.palette') }
    const colors = new Set<string>()
    for (const value of project.palette) {
      if (!value || typeof value !== 'object') return { valid: false, error: appError('validation.palette') }
      const entry = value as Record<string, unknown>
      const color = typeof entry.color === 'string' ? entry.color.toLowerCase() : ''
      if (!isHexColor(color) || colors.has(color)) return { valid: false, error: appError('validation.palette') }
      if (typeof entry.name !== 'string' || entry.name.length > 100 || typeof entry.brand !== 'string' || entry.brand.length > 100 || typeof entry.code !== 'string' || entry.code.length > 100 || typeof entry.notes !== 'string' || entry.notes.length > 1000) {
        return { valid: false, error: appError('validation.palette') }
      }
      colors.add(color)
    }
  }

  if (project.repeatBoxes !== undefined) {
    if (!Array.isArray(project.repeatBoxes) || project.repeatBoxes.length > 100) return { valid: false, error: appError('validation.repeatBoxes') }
    const boxes = project.repeatBoxes as RepeatBox[]
    const ids = new Set<string>()
    for (const box of boxes) {
      if (typeof box.id !== 'string' || !box.id || ids.has(box.id)) return { valid: false, error: appError('validation.repeatBoxId') }
      ids.add(box.id)
      const coordinates = [box.top, box.bottom, box.left, box.right, box.sections]
      if ((box.direction !== 'across' && box.direction !== 'down') || !coordinates.every(Number.isInteger) || typeof box.enabled !== 'boolean') {
        return { valid: false, error: appError('validation.repeatBoxSettings') }
      }
      if (box.top < 0 || box.left < 0 || box.bottom <= box.top || box.right <= box.left || box.bottom > (project.rows as number) || box.right > columns || box.sections < 2 || box.sections > MAX_REPEAT_COUNT) {
        return { valid: false, error: appError('validation.repeatBoxBounds') }
      }
      const length = box.direction === 'across' ? box.right - box.left : box.bottom - box.top
      if (length % box.sections !== 0) return { valid: false, error: appError('validation.repeatBoxSections') }
    }
    for (let index = 0; index < boxes.length; index += 1) {
      if (boxes.slice(index + 1).some((box) => repeatBoxesConflict(boxes[index], box))) {
        return { valid: false, error: appError('validation.repeatBoxOverlap') }
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
  if (!result.valid) throw result.error
  const source = value as Record<string, unknown>
  const originalCells = source.cells as PatternGrid
  const cells = (source.repeatBoxes === undefined ? flattenLegacyRepeats(source, originalCells) : originalCells.map((row) => [...row]))
    .map((row) => row.map((color) => color.toLowerCase()))
  const palette = Array.isArray(source.palette) ? (source.palette as PaletteEntry[]).map((entry) => ({
    color: entry.color.toLowerCase(),
    name: entry.name,
    brand: entry.brand,
    code: entry.code,
    notes: entry.notes,
  })) : []
  return {
    ...(source as unknown as PatternProject),
    rows: cells.length,
    columns: cells[0].length,
    horizontalRepeats: source.repeatBoxes === undefined && Array.isArray(source.repeatRanges) && source.repeatRanges.length > 0 ? 1 : source.horizontalRepeats as number,
    verticalRepeats: source.repeatBoxes === undefined && Array.isArray(source.repeatRanges) && source.repeatRanges.length > 0 ? 1 : source.verticalRepeats as number,
    previewStitch: source.previewStitch === 'cross-stitch' || source.previewStitch === 'single-crochet' ? source.previewStitch : 'knit',
    backgroundColor: (source.backgroundColor as string).toLowerCase(),
    recentColors: Array.isArray(source.recentColors) ? (source.recentColors as string[]).map((color) => color.toLowerCase()) : [],
    swatches: Array.isArray(source.swatches) ? (source.swatches as string[]).map((color) => color.toLowerCase()) : [],
    palette,
    repeatBoxes: Array.isArray(source.repeatBoxes) ? (source.repeatBoxes as RepeatBox[]).map((box) => ({ ...box })) : [],
    cells,
  }
}
