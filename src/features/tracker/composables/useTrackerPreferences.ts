import { computed, ref, watch } from 'vue'
import type { PatternDisplay } from '../../../types/pattern'
import type { TrackerPreferences } from '../../../types/tracker'

const TRACKER_PREFERENCES_KEY = 'stitch-tracker-preferences'

function readTrackerPreferences(): Partial<TrackerPreferences> {
  try {
    const value = JSON.parse(localStorage.getItem(TRACKER_PREFERENCES_KEY) ?? 'null') as Partial<TrackerPreferences> | null
    if (!value || typeof value !== 'object') return {}
    return {
      display: value.display === 'canvas' || value.display === 'knit' || value.display === 'cross-stitch' || value.display === 'single-crochet' ? value.display : undefined,
      cellSize: Number.isInteger(value.cellSize) && value.cellSize! >= 16 && value.cellSize! <= 48 ? value.cellSize : undefined,
      autoScroll: typeof value.autoScroll === 'boolean' ? value.autoScroll : undefined,
      keepAwake: typeof value.keepAwake === 'boolean' ? value.keepAwake : undefined,
      showSymbols: typeof value.showSymbols === 'boolean' ? value.showSymbols : undefined,
      showAnnotations: typeof value.showAnnotations === 'boolean' ? value.showAnnotations : undefined,
    }
  } catch {
    return {}
  }
}

export function useTrackerPreferences(savedPreferences: TrackerPreferences | undefined, defaultCellSize: number) {
  const initial = savedPreferences ?? readTrackerPreferences()
  const cellSize = ref(initial.cellSize ?? defaultCellSize)
  const display = ref<PatternDisplay>(initial.display ?? 'canvas')
  const autoScroll = ref(initial.autoScroll ?? true)
  const keepAwake = ref(initial.keepAwake ?? false)
  const showSymbols = ref(initial.showSymbols ?? false)
  const showAnnotations = ref(initial.showAnnotations ?? true)
  const preferences = computed<TrackerPreferences>(() => ({
    display: display.value,
    cellSize: cellSize.value,
    autoScroll: autoScroll.value,
    keepAwake: keepAwake.value,
    showSymbols: showSymbols.value,
    showAnnotations: showAnnotations.value,
  }))

  watch(preferences, (value) => {
    try {
      localStorage.setItem(TRACKER_PREFERENCES_KEY, JSON.stringify(value))
    } catch {
      // Display preferences are optional when browser storage is unavailable.
    }
  })

  return { autoScroll, cellSize, display, keepAwake, preferences, showAnnotations, showSymbols }
}
