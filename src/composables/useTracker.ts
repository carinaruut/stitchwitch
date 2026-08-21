import { computed, ref } from 'vue'
import type { PatternProject } from '../types/pattern'
import type { TrackerDirection, TrackerPreferences, TrackerProgress, TrackerProject, TrackerStartRow } from '../types/tracker'
import { asTrackerProject, createTracker, rowCompletionRange, stitchOrdinal, trackerElapsedMilliseconds, trackerTotal } from '../utils/tracker'

const STORAGE_KEY = 'stitch-tracker-autosave'

interface StoredTracker {
  tracker: TrackerProject
  backupNeeded: boolean
}

type ProgressSnapshot = Omit<TrackerProgress, 'updatedAt'>

function progressSnapshot(progress: TrackerProgress): ProgressSnapshot {
  return {
    completedCount: progress.completedCount,
    startRow: progress.startRow,
    firstRowDirection: progress.firstRowDirection,
    alternateRows: progress.alternateRows,
  }
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
  const undoStack = ref<ProgressSnapshot[]>([])
  const redoStack = ref<ProgressSnapshot[]>([])
  let autosaveTimer: ReturnType<typeof setTimeout> | null = null

  const completedCount = computed(() => tracker.value?.progress.completedCount ?? 0)
  const totalCount = computed(() => tracker.value ? trackerTotal(tracker.value.pattern) : 0)
  const canUndo = computed(() => undoStack.value.length > 0)
  const canRedo = computed(() => redoStack.value.length > 0)

  function resetHistory() {
    undoStack.value = []
    redoStack.value = []
  }

  function recordProgress() {
    if (!tracker.value) return
    undoStack.value.push(progressSnapshot(tracker.value.progress))
    if (undoStack.value.length > 100) undoStack.value.shift()
    redoStack.value = []
  }

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
    resetHistory()
    backupNeeded.value = true
    scheduleAutosave()
  }

  function openTracker(value: TrackerProject, fallbackPreferences?: TrackerPreferences) {
    tracker.value = asTrackerProject(value)
    if (!tracker.value.preferences && fallbackPreferences) tracker.value.preferences = { ...fallbackPreferences }
    resetHistory()
    backupNeeded.value = false
    scheduleAutosave()
  }

  function setPreferences(preferences: TrackerPreferences) {
    if (!tracker.value) return
    const current = tracker.value.preferences
    if (current?.display === preferences.display && current.cellSize === preferences.cellSize && current.autoScroll === preferences.autoScroll && current.keepAwake === preferences.keepAwake && current.showSymbols === preferences.showSymbols) return
    tracker.value.preferences = { ...preferences }
    changed()
  }

  function setOrder(startRow: TrackerStartRow, firstRowDirection: TrackerDirection, alternateRows: boolean) {
    if (!tracker.value || completedCount.value > 0) return
    const progress = tracker.value.progress
    if (progress.startRow === startRow && progress.firstRowDirection === firstRowDirection && progress.alternateRows === alternateRows) return
    recordProgress()
    progress.startRow = startRow
    progress.firstRowDirection = firstRowDirection
    progress.alternateRows = alternateRows
    changed()
  }

  function selectStitch(row: number, column: number, rows: number, columns: number) {
    if (!tracker.value) return
    const ordinal = stitchOrdinal(row, column, rows, columns, tracker.value.progress)
    recordProgress()
    tracker.value.progress.completedCount = completedCount.value === ordinal + 1 ? ordinal : ordinal + 1
    changed()
  }

  function selectRow(row: number, rows: number, columns: number) {
    if (!tracker.value) return
    const range = rowCompletionRange(row, rows, columns, tracker.value.progress.startRow)
    recordProgress()
    tracker.value.progress.completedCount = completedCount.value >= range.through ? range.before : range.through
    changed()
  }

  function resetProgress() {
    if (!tracker.value || completedCount.value === 0) return
    recordProgress()
    tracker.value.progress.completedCount = 0
    changed()
  }

  function restoreProgress(snapshot: ProgressSnapshot) {
    if (!tracker.value) return
    Object.assign(tracker.value.progress, snapshot)
    changed()
  }

  function undo() {
    if (!tracker.value) return
    const snapshot = undoStack.value.pop()
    if (!snapshot) return
    redoStack.value.push(progressSnapshot(tracker.value.progress))
    restoreProgress(snapshot)
  }

  function redo() {
    if (!tracker.value) return
    const snapshot = redoStack.value.pop()
    if (!snapshot) return
    undoStack.value.push(progressSnapshot(tracker.value.progress))
    restoreProgress(snapshot)
  }

  function startTimer() {
    if (!tracker.value || tracker.value.timer.startedAt) return
    tracker.value.timer.startedAt = new Date().toISOString()
    changed()
  }

  function pauseTimer() {
    if (!tracker.value?.timer.startedAt) return
    tracker.value.timer.elapsedMilliseconds = trackerElapsedMilliseconds(tracker.value.timer)
    tracker.value.timer.startedAt = null
    changed()
  }

  function resetTimer() {
    if (!tracker.value) return
    tracker.value.timer.elapsedMilliseconds = 0
    tracker.value.timer.startedAt = null
    changed()
  }

  function downloadSnapshot(): TrackerProject {
    if (!tracker.value) throw new Error('No tracker is open')
    return {
      ...tracker.value,
      timer: {
        elapsedMilliseconds: trackerElapsedMilliseconds(tracker.value.timer),
        startedAt: null,
      },
    }
  }

  function markDownloaded() {
    backupNeeded.value = tracker.value?.timer.startedAt !== null
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
    resetHistory()
    backupNeeded.value = false
    restoredAutosave.value = false
    autosaveStatus.value = 'idle'
    return true
  }

  return {
    tracker,
    completedCount,
    totalCount,
    canUndo,
    canRedo,
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
    undo,
    redo,
    startTimer,
    pauseTimer,
    resetTimer,
    downloadSnapshot,
    markDownloaded,
    clearTracker,
    flushAutosave,
  }
}
