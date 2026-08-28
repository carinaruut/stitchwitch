import type { MaybeRefOrGetter } from 'vue'
import { toValue } from 'vue'
import type { PatternProject } from '../../../types/pattern'
import type { RenderedGrid } from '../../../utils/grid'
import { safeFilename } from '../../projects/composables/useProjectFiles'
import { renderPatternPng } from '../domain/renderPatternPng'

interface PatternExportOptions {
  project: MaybeRefOrGetter<PatternProject>
  renderedPattern: MaybeRefOrGetter<RenderedGrid>
  includeAnnotations: MaybeRefOrGetter<boolean>
  onSuccess: () => void
  onError: () => void
}

export function usePatternExport(options: PatternExportOptions) {
  async function downloadCanvasPng() {
    try {
      const project = toValue(options.project)
      const blob = await renderPatternPng(project, toValue(options.renderedPattern), toValue(options.includeAnnotations))
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = safeFilename(project.name).replace(/\.stitch-project$/, '.png')
      link.click()
      URL.revokeObjectURL(url)
      options.onSuccess()
    } catch {
      options.onError()
    }
  }

  return { downloadCanvasPng }
}
