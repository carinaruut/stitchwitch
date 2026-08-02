import type { PatternProject } from '../types/pattern'
import { isHexColor } from './colors'

export interface ValidationResult {
  valid: boolean
  error?: string
}

export function validateProject(value: unknown): ValidationResult {
  if (!value || typeof value !== 'object') return { valid: false, error: 'The file does not contain a project object.' }
  const project = value as Record<string, unknown>
  if (project.format !== 'stitch-pattern' || project.version !== 1) {
    return { valid: false, error: 'This is not a supported stitch-pattern file.' }
  }
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
  if (!Array.isArray(project.cells) || project.cells.length !== project.rows) {
    return { valid: false, error: 'The cell rows do not match the project dimensions.' }
  }
  const columns = project.columns as number
  if (!project.cells.every((row) => Array.isArray(row) && row.length === columns && row.every(isHexColor))) {
    return { valid: false, error: 'The cell colors or columns are invalid.' }
  }
  return { valid: true }
}

export function asPatternProject(value: unknown): PatternProject {
  const result = validateProject(value)
  if (!result.valid) throw new Error(result.error)
  return value as PatternProject
}
