import type { PatternProject } from '../types/pattern'
import type { TrackerProject } from '../types/tracker'
import { asTrackerProject } from '../utils/tracker'
import { asPatternProject } from '../utils/validation'
import { appError } from '../utils/appError'

function trackerFilename(name: string) {
  const safe = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return `${safe || 'my-pattern'}.stitch-tracker`
}

export function downloadTracker(tracker: TrackerProject) {
  const validated = asTrackerProject(tracker)
  const blob = new Blob([JSON.stringify(validated, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = trackerFilename(tracker.pattern.name)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

export async function readTrackerInput(file: File): Promise<{ tracker?: TrackerProject; pattern?: PatternProject }> {
  if (file.size > 10_000_000) throw appError('files.selectedTooLarge')
  let value: unknown
  try {
    value = JSON.parse(await file.text())
  } catch {
    throw appError('files.invalidJson')
  }
  if (value && typeof value === 'object' && (value as Record<string, unknown>).format === 'stitch-tracker') {
    return { tracker: asTrackerProject(value) }
  }
  return { pattern: asPatternProject(value) }
}
