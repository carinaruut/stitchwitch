import { computed, ref, type Ref } from 'vue'
import { createNoteCounterCommentCommands } from '../domain/noteCounterCommentCommands'
import { createPaletteCommands } from '../domain/paletteCommands'
import { createProgressCommands } from '../domain/progressCommands'
import { createTimerSessionArchiveCommands } from '../domain/timerSessionArchiveCommands'
import type { TrackerCommandContext } from '../domain/trackerCommandContext'
import { createTrackerHistory, type TrackerSnapshot } from '../domain/trackerHistory'
import type { PatternProject } from '../../../types/pattern'
import type { TrackerPreferences, TrackerState } from '../../../types/tracker'
import { paletteEntries as completePaletteEntries } from '../../../utils/palette'
import { createTrackerState } from '../../../utils/project'
import { trackerTotal } from '../../../utils/tracker'

export function useTracker(pattern: Ref<PatternProject>, tracker: Ref<TrackerState | undefined>, scheduleAutosave: () => void = () => {}) {
  const undoStack = ref<TrackerSnapshot[]>([])
  const redoStack = ref<TrackerSnapshot[]>([])
  const completedCount = computed(() => tracker.value?.progress.completedCells.length ?? 0)
  const totalCount = computed(() => trackerTotal(pattern.value))
  const canUndo = computed(() => undoStack.value.length > 0)
  const canRedo = computed(() => redoStack.value.length > 0)
  const paletteEntries = computed(() => completePaletteEntries(pattern.value))

  function ensureTracker(preferences?: TrackerPreferences) {
    if (!tracker.value) tracker.value = createTrackerState(preferences)
    else if (!tracker.value.preferences && preferences) tracker.value.preferences = { ...preferences }
    return tracker.value
  }

  function changed() {
    if (tracker.value) tracker.value.progress.updatedAt = new Date().toISOString()
    scheduleAutosave()
  }

  function setPreferences(preferences: TrackerPreferences) {
    const state = ensureTracker(preferences)
    state.preferences = { ...preferences }
  }

  const history = createTrackerHistory({ pattern, tracker, undoStack, redoStack, ensureTracker, changed })
  const context: TrackerCommandContext = { pattern, tracker, completedCount, ensureTracker, recordState: history.recordState, changed }
  const palette = createPaletteCommands(context)
  const progress = createProgressCommands(context)
  const notes = createNoteCounterCommentCommands(context)
  const timer = createTimerSessionArchiveCommands(context)

  return {
    tracker,
    completedCount,
    totalCount,
    canUndo,
    canRedo,
    paletteEntries,
    ensureTracker,
    setPreferences,
    ...palette,
    ...progress,
    ...notes,
    undo: history.undo,
    redo: history.redo,
    ...timer,
  }
}

export type TrackerController = ReturnType<typeof useTracker>
