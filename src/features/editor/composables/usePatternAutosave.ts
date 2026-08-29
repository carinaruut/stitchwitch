import { ref, watch } from 'vue'
import type { PatternCommandContext } from '../domain/patternCommandContext'
import type { StitchProject } from '../../../types/tracker'

export function usePatternAutosave(context: PatternCommandContext, autosaveKey: string, recovered: boolean, storage: Storage = localStorage) {
  const restoredAutosave = ref(recovered)
  const autosaveStatus = ref<'saving' | 'saved' | 'error'>('saving')
  const lastSavedAt = ref<number | null>(recovered ? Date.now() : null)
  let autosaveTimer: ReturnType<typeof setTimeout> | null = null

  function flushAutosave() {
    if (autosaveTimer) clearTimeout(autosaveTimer)
    autosaveTimer = null
    try {
      const snapshot: StitchProject = {
        format: 'stitch-project',
        version: 1,
        pattern: {
          ...context.project.value,
          rows: context.project.value.cells.length,
          columns: context.project.value.cells[0].length,
        },
        ...(context.tracker.value ? { tracker: context.tracker.value } : {}),
      }
      storage.setItem(autosaveKey, JSON.stringify(snapshot))
      autosaveStatus.value = 'saved'
      lastSavedAt.value = Date.now()
    } catch {
      autosaveStatus.value = 'error'
    }
  }

  function scheduleAutosave() {
    autosaveStatus.value = 'saving'
    if (autosaveTimer) clearTimeout(autosaveTimer)
    autosaveTimer = setTimeout(flushAutosave, 300)
  }

  const stopAutosave = watch([context.project, context.tracker], scheduleAutosave, { deep: true })
  scheduleAutosave()

  function dispose() {
    stopAutosave()
    if (autosaveTimer) clearTimeout(autosaveTimer)
    autosaveTimer = null
  }

  return { restoredAutosave, autosaveStatus, lastSavedAt, flushAutosave, scheduleAutosave, dispose }
}
