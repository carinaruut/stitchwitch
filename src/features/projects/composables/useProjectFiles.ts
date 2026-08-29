import type { StitchProject } from '../../../types/tracker'
import { asStitchProject } from '../../../utils/project'
import { appError } from '../../../utils/appError'

export function safeFilename(name: string): string {
  const safe = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return `${safe || 'my-pattern'}.stitch-project`
}

export function createProjectFile(project: StitchProject) {
  const validated = asStitchProject(project)
  return new File([JSON.stringify(validated, null, 2)], safeFilename(project.pattern.name), { type: 'application/json' })
}

export function downloadFile(file: File) {
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = file.name
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

export function downloadProject(project: StitchProject) {
  downloadFile(createProjectFile(project))
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
