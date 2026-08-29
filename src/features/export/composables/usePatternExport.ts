import type { MaybeRefOrGetter } from 'vue'
import { toValue } from 'vue'
import type { PatternProject } from '../../../types/pattern'
import type { RenderedGrid } from '../../../utils/grid'
import { safeFilename } from '../../projects/composables/useProjectFiles'
import type { WrittenInstructionDocument } from '../domain/buildWrittenInstructions'
import { formatWrittenInstructionsText } from '../domain/buildWrittenInstructions'
import { renderPatternPng } from '../domain/renderPatternPng'
import { useI18n } from 'vue-i18n'

interface PatternExportOptions {
  project: MaybeRefOrGetter<PatternProject>
  renderedPattern: MaybeRefOrGetter<RenderedGrid>
  writtenInstructions: MaybeRefOrGetter<WrittenInstructionDocument>
  includeAnnotations: MaybeRefOrGetter<boolean>
  onPngSuccess: () => void
  onPngError: () => void
  onInstructionsSuccess: () => void
  onInstructionsError: () => void
}

export function usePatternExport(options: PatternExportOptions) {
  const { n, t } = useI18n({ useScope: 'global' })

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
  }

  async function downloadCanvasPng() {
    try {
      const project = toValue(options.project)
      const blob = await renderPatternPng(project, toValue(options.renderedPattern), toValue(options.includeAnnotations))
      downloadBlob(blob, safeFilename(project.name).replace(/\.stitch-project$/, '.png'))
      options.onPngSuccess()
    } catch {
      options.onPngError()
    }
  }

  function downloadWrittenInstructions() {
    try {
      const project = toValue(options.project)
      const text = formatWrittenInstructionsText(toValue(options.writtenInstructions), t, value => n(value, 'integer'))
      downloadBlob(
        new Blob([text], { type: 'text/plain;charset=utf-8' }),
        safeFilename(project.name).replace(/\.stitch-project$/, '-instructions.txt'),
      )
      options.onInstructionsSuccess()
    } catch {
      options.onInstructionsError()
    }
  }

  return { downloadCanvasPng, downloadWrittenInstructions }
}
