import { computed, ref } from 'vue'
import type { PaletteEntry, PatternProject } from '../types/pattern'
import type { TrackerCompletionMode, TrackerDirection, TrackerPreferences, TrackerProgress, TrackerProject, TrackerStartRow } from '../types/tracker'
import { normalizeColor } from '../utils/colors'
import { asTrackerProject, createTracker, rowCompletionRange, stitchOrdinal, trackerElapsedMilliseconds, trackerTotal } from '../utils/tracker'
import { paletteEntries as completePaletteEntries, reorderPaletteEntries } from '../utils/palette'

const STORAGE_KEY = 'stitch-tracker-autosave'

interface StoredTracker {
  tracker: TrackerProject
  backupNeeded: boolean
}

type ProgressSnapshot = Omit<TrackerProgress, 'updatedAt'>

function progressSnapshot(progress: TrackerProgress): ProgressSnapshot {
  return {
    completedCount: progress.completedCount,
    completedCells: [...progress.completedCells],
    completionMode: progress.completionMode,
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

  const completedCount = computed(() => {
    const progress = tracker.value?.progress
    if (!progress) return 0
    return progress.completionMode === 'individual' ? progress.completedCells.length : progress.completedCount
  })
  const totalCount = computed(() => tracker.value ? trackerTotal(tracker.value.pattern) : 0)
  const canUndo = computed(() => undoStack.value.length > 0)
  const canRedo = computed(() => redoStack.value.length > 0)
  const paletteEntries = computed(() => tracker.value ? completePaletteEntries(tracker.value.pattern) : [])

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
    if (current?.display === preferences.display && current.cellSize === preferences.cellSize && current.autoScroll === preferences.autoScroll && current.keepAwake === preferences.keepAwake && current.showSymbols === preferences.showSymbols && current.showAnnotations === preferences.showAnnotations) return
    tracker.value.preferences = { ...preferences }
    changed()
  }

  function updatePaletteEntry(color: string, updates: Partial<Pick<PaletteEntry, 'name' | 'brand' | 'code' | 'notes'>>) {
    if (!tracker.value) return
    const entries = completePaletteEntries(tracker.value.pattern)
    const index = entries.findIndex((entry) => entry.color === color)
    if (index < 0) return
    entries[index] = { ...entries[index], ...updates }
    tracker.value.pattern.palette = entries
    changed()
  }

  function movePaletteEntry(color: string, direction: -1 | 1) {
    if (!tracker.value) return
    const entries = completePaletteEntries(tracker.value.pattern)
    const index = entries.findIndex((entry) => entry.color === color)
    const destination = index + direction
    if (index < 0 || destination < 0 || destination >= entries.length) return
    const current = entries[index]
    entries[index] = entries[destination]
    entries[destination] = current
    tracker.value.pattern.palette = entries
    changed()
  }

  function reorderPaletteEntry(source: string, target: string, after: boolean) {
    if (!tracker.value || source === target) return
    const entries = completePaletteEntries(tracker.value.pattern)
    const reordered = reorderPaletteEntries(entries, source, target, after)
    if (!reordered) return
    tracker.value.pattern.palette = reordered
    changed()
  }

  function switchPaletteColor(sourceValue: string, targetValue: string): boolean {
    if (!tracker.value) return false
    const source = normalizeColor(sourceValue)
    const target = normalizeColor(targetValue)
    if (!source || !target || source === target) return false
    const pattern = tracker.value.pattern
    const entries = completePaletteEntries(pattern)
    const sourceEntry = entries.find((entry) => entry.color === source)
    const targetEntry = entries.find((entry) => entry.color === target)
    if (!sourceEntry) return false
    if (targetEntry) {
      const conflictingMetadata = [
        targetEntry.name && sourceEntry.name && targetEntry.name !== sourceEntry.name ? sourceEntry.name : '',
        targetEntry.brand && sourceEntry.brand && targetEntry.brand !== sourceEntry.brand ? sourceEntry.brand : '',
        targetEntry.code && sourceEntry.code && targetEntry.code !== sourceEntry.code ? sourceEntry.code : '',
      ].filter(Boolean)
      const sourceDetails = conflictingMetadata.length > 0 ? [source.toUpperCase(), ...conflictingMetadata].join(' · ') : ''
      const notes = [targetEntry.notes.trim(), sourceEntry.notes.trim(), sourceDetails].filter(Boolean)
      const merged: PaletteEntry = {
        color: target,
        name: targetEntry.name || sourceEntry.name,
        brand: targetEntry.brand || sourceEntry.brand,
        code: targetEntry.code || sourceEntry.code,
        notes: [...new Set(notes)].join('\n'),
      }
      pattern.palette = entries.filter((entry) => entry.color !== source).map((entry) => entry.color === target ? merged : entry)
    } else {
      pattern.palette = entries.map((entry) => entry.color === source ? { ...entry, color: target } : entry)
    }
    pattern.cells = pattern.cells.map((row) => row.map((color) => color === source ? target : color))
    if (pattern.backgroundColor === source) pattern.backgroundColor = target
    pattern.swatches = [...new Set(pattern.swatches.map((color) => color === source ? target : color))]
    pattern.recentColors = [...new Set(pattern.recentColors.map((color) => color === source ? target : color))]
    changed()
    return true
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

  function setCompletionMode(mode: TrackerCompletionMode) {
    if (!tracker.value || completedCount.value > 0 || tracker.value.progress.completionMode === mode) return
    recordProgress()
    tracker.value.progress.completionMode = mode
    tracker.value.progress.completedCount = 0
    tracker.value.progress.completedCells = []
    changed()
  }

  function selectStitch(row: number, column: number, rows: number, columns: number) {
    if (!tracker.value) return
    if (tracker.value.progress.completionMode === 'individual') {
      const cell = row * columns + column
      recordProgress()
      tracker.value.progress.completedCells = tracker.value.progress.completedCells.includes(cell)
        ? tracker.value.progress.completedCells.filter((completed) => completed !== cell)
        : [...tracker.value.progress.completedCells, cell].sort((a, b) => a - b)
      changed()
      return
    }
    const ordinal = stitchOrdinal(row, column, rows, columns, tracker.value.progress)
    recordProgress()
    tracker.value.progress.completedCount = completedCount.value === ordinal + 1 ? ordinal : ordinal + 1
    changed()
  }

  function selectRow(row: number, rows: number, columns: number) {
    if (!tracker.value) return
    if (tracker.value.progress.completionMode === 'individual') {
      const firstCell = row * columns
      const rowCells = Array.from({ length: columns }, (_, column) => firstCell + column)
      const completed = new Set(tracker.value.progress.completedCells)
      const rowIsComplete = rowCells.every((cell) => completed.has(cell))
      recordProgress()
      rowCells.forEach((cell) => rowIsComplete ? completed.delete(cell) : completed.add(cell))
      tracker.value.progress.completedCells = [...completed].sort((a, b) => a - b)
      changed()
      return
    }
    const range = rowCompletionRange(row, rows, columns, tracker.value.progress.startRow)
    recordProgress()
    tracker.value.progress.completedCount = completedCount.value >= range.through ? range.before : range.through
    changed()
  }

  function resetProgress() {
    if (!tracker.value || completedCount.value === 0) return
    recordProgress()
    tracker.value.progress.completedCount = 0
    tracker.value.progress.completedCells = []
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
    paletteEntries,
    autosaveStatus,
    backupNeeded,
    restoredAutosave,
    openPattern,
    openTracker,
    setPreferences,
    updatePaletteEntry,
    movePaletteEntry,
    reorderPaletteEntry,
    switchPaletteColor,
    setCompletionMode,
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
