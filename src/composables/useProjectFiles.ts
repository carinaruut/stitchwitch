import type { StitchProject } from '../types/tracker'
import { asStitchProject } from '../utils/project'
import { appError } from '../utils/appError'

export function safeFilename(name: string): string {
  const safe = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return `${safe || 'my-pattern'}.stitch-project`
}

export function downloadProject(project: StitchProject) {
  const validated = asStitchProject(project)
  const blob = new Blob([JSON.stringify(validated, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = safeFilename(project.pattern.name)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

export async function readProjectFile(file: File): Promise<StitchProject> {
  if (file.size > 10_000_000) throw appError('files.selectedTooLarge')
  let value: unknown
  try {
    value = JSON.parse(await file.text())
  } catch {
    throw appError('files.invalidJson')
  }
  return asStitchProject(value)
}
