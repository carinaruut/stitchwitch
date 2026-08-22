import type { PatternProject } from '../types/pattern'
import { asPatternProject, validateProject } from '../utils/validation'
import { appError } from '../utils/appError'

export function safeFilename(name: string): string {
  const safe = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return `${safe || 'my-pattern'}.stitch-pattern`
}

export function downloadProject(project: PatternProject) {
  const validation = validateProject(project)
  if (!validation.valid) throw validation.error
  const validated = asPatternProject(project)
  const blob = new Blob([JSON.stringify(validated, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = safeFilename(project.name)
  link.click()
  URL.revokeObjectURL(url)
}

export async function readProjectFile(file: File): Promise<PatternProject> {
  if (file.size > 5_000_000) throw appError('files.projectTooLarge')
  let value: unknown
  try {
    value = JSON.parse(await file.text())
  } catch {
    throw appError('files.invalidJson')
  }
  return asPatternProject(value)
}
