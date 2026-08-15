import { computed, ref } from 'vue'
import type { PatternProject } from '../types/pattern'
import type { TrackerDirection, TrackerPreferences, TrackerProject, TrackerStartRow } from '../types/tracker'
import { asTrackerProject, createTracker, rowCompletionRange, stitchOrdinal, trackerTotal } from '../utils/tracker'

const STORAGE_KEY = 'stitch-tracker-autosave'

interface StoredTracker {
  tracker: TrackerProject
  backupNeeded: boolean
}

function readAutosave(): { tracker: TrackerProject | null; backupNeeded: boolean; restored: boolean } {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return { tracker: null, backupNeeded: false, restored: false }
    const value = JSON.parse(saved) as Partial<StoredTracker>
    return {
      tracker: asTrackerProject(value.tracker),
      backupNeeded: value.backupNeeded !== false,
      restored: true,
    }
  } catch {
    try { localStorage.removeItem(STORAGE_KEY) } catch { /* Browser storage may be unavailable. */ }
    return { tracker: null, backupNeeded: false, restored: false }
  }
}

export function useTracker() {
  const saved = readAutosave()
  const tracker = ref<TrackerProject | null>(saved.tracker)
  const autosaveStatus = ref<'idle' | 'saving' | 'saved' | 'error'>(saved.tracker ? 'saved' : 'idle')
  const backupNeeded = ref(saved.backupNeeded)
  const restoredAutosave = ref(saved.restored)
  let autosaveTimer: ReturnType<typeof setTimeout> | null = null

  const completedCount = computed(() => tracker.value?.progress.completedCount ?? 0)
  const totalCount = computed(() => tracker.value ? trackerTotal(tracker.value.pattern) : 0)

  function flushAutosave() {
    if (autosaveTimer) clearTimeout(autosaveTimer)
    autosaveTimer = null
    if (!tracker.value) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ tracker: tracker.value, backupNeeded: backupNeeded.value }))
      autosaveStatus.value = 'saved'
    } catch {
      autosaveStatus.value = 'error'
    }
  }

  function scheduleAutosave() {
    autosaveStatus.value = 'saving'
    if (autosaveTimer) clearTimeout(autosaveTimer)
    autosaveTimer = setTimeout(flushAutosave, 300)
  }

  function changed() {
    if (!tracker.value) return
    tracker.value.progress.updatedAt = new Date().toISOString()
    backupNeeded.value = true
    scheduleAutosave()
  }

  function openPattern(pattern: PatternProject, preferences?: TrackerPreferences) {
    tracker.value = createTracker(pattern, preferences)
    backupNeeded.value = true
    scheduleAutosave()
  }

  function openTracker(value: TrackerProject, fallbackPreferences?: TrackerPreferences) {
    tracker.value = asTrackerProject(value)
    if (!tracker.value.preferences && fallbackPreferences) tracker.value.preferences = { ...fallbackPreferences }
    backupNeeded.value = false
    scheduleAutosave()
  }

  function setPreferences(preferences: TrackerPreferences) {
    if (!tracker.value) return
    const current = tracker.value.preferences
    if (current?.display === preferences.display && current.cellSize === preferences.cellSize && current.autoScroll === preferences.autoScroll && current.keepAwake === preferences.keepAwake) return
    tracker.value.preferences = { ...preferences }
    changed()
  }

  function setOrder(startRow: TrackerStartRow, firstRowDirection: TrackerDirection, alternateRows: boolean) {
    if (!tracker.value || completedCount.value > 0) return
    tracker.value.progress.startRow = startRow
    tracker.value.progress.firstRowDirection = firstRowDirection
    tracker.value.progress.alternateRows = alternateRows
    changed()
  }

  function selectStitch(row: number, column: number, rows: number, columns: number) {
    if (!tracker.value) return
    const ordinal = stitchOrdinal(row, column, rows, columns, tracker.value.progress)
    tracker.value.progress.completedCount = completedCount.value === ordinal + 1 ? ordinal : ordinal + 1
    changed()
  }

  function selectRow(row: number, rows: number, columns: number) {
    if (!tracker.value) return
    const range = rowCompletionRange(row, rows, columns, tracker.value.progress.startRow)
    tracker.value.progress.completedCount = completedCount.value >= range.through ? range.before : range.through
    changed()
  }

  function resetProgress() {
    if (!tracker.value) return
    tracker.value.progress.completedCount = 0
    changed()
  }

  function markDownloaded() {
    backupNeeded.value = false
    flushAutosave()
  }

  function clearTracker() {
    if (autosaveTimer) clearTimeout(autosaveTimer)
    autosaveTimer = null
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      autosaveStatus.value = 'error'
      return false
    }
    tracker.value = null
    backupNeeded.value = false
    restoredAutosave.value = false
    autosaveStatus.value = 'idle'
    return true
  }

  return {
    tracker,
    completedCount,
    totalCount,
    autosaveStatus,
    backupNeeded,
    restoredAutosave,
    openPattern,
    openTracker,
    setPreferences,
    setOrder,
    selectStitch,
    selectRow,
    resetProgress,
    markDownloaded,
    clearTracker,
    flushAutosave,
  }
}
