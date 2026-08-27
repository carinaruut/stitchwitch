import { computed, ref, type Ref } from 'vue'
import type { PaletteEntry, PatternAnnotation, PatternProject } from '../types/pattern'
import { MAX_TRACKER_COUNTER_NAME_LENGTH, MAX_TRACKER_COUNTERS, MAX_TRACKER_PROJECT_NOTE_LENGTH, MAX_TRACKER_ROW_NOTE_LENGTH, MAX_TRACKER_SESSION_ARCHIVES, MAX_TRACKER_SESSIONS, type TrackerCompletionMode, type TrackerCounter, type TrackerDailyGoal, type TrackerDirection, type TrackerPreferences, type TrackerProgress, type TrackerStartRow, type TrackerState } from '../types/tracker'
import { normalizeColor } from '../utils/colors'
import { createTrackerState } from '../utils/project'
import { completeTrackerSession, orderedCellIds, stitchOrdinal, trackerTotal } from '../utils/tracker'
import { paletteEntries as completePaletteEntries, reorderPaletteEntries } from '../utils/palette'

type ProgressSnapshot = Omit<TrackerProgress, 'updatedAt'>

interface TrackerSnapshot {
  progress: ProgressSnapshot
  annotations: PatternAnnotation[]
  counters: TrackerCounter[]
}

function progressSnapshot(progress: TrackerProgress): ProgressSnapshot {
  return {
    completedCells: [...progress.completedCells],
    completionMode: progress.completionMode,
    startRow: progress.startRow,
    firstRowDirection: progress.firstRowDirection,
    alternateRows: progress.alternateRows,
  }
}

function trackerSnapshot(state: TrackerState, pattern: PatternProject): TrackerSnapshot {
  return {
    progress: progressSnapshot(state.progress),
    annotations: pattern.annotations.map((annotation) => ({ ...annotation })),
    counters: state.counters.map((counter) => ({ ...counter })),
  }
}

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

  function recordState() {
    if (!tracker.value) return
    undoStack.value.push(trackerSnapshot(tracker.value, pattern.value))
    if (undoStack.value.length > 100) undoStack.value.shift()
    redoStack.value = []
  }

  function changed() {
    if (tracker.value) tracker.value.progress.updatedAt = new Date().toISOString()
    scheduleAutosave()
  }

  function setPreferences(preferences: TrackerPreferences) {
    const state = ensureTracker(preferences)
    state.preferences = { ...preferences }
  }

  function updatePaletteEntry(color: string, updates: Partial<Pick<PaletteEntry, 'name' | 'brand' | 'code' | 'notes'>>) {
    const entries = completePaletteEntries(pattern.value)
    const index = entries.findIndex((entry) => entry.color === color)
    if (index < 0) return
    entries[index] = { ...entries[index], ...updates }
    pattern.value.palette = entries
  }

  function movePaletteEntry(color: string, direction: -1 | 1) {
    const entries = completePaletteEntries(pattern.value)
    const index = entries.findIndex((entry) => entry.color === color)
    const destination = index + direction
    if (index < 0 || destination < 0 || destination >= entries.length) return
    const current = entries[index]
    entries[index] = entries[destination]
    entries[destination] = current
    pattern.value.palette = entries
  }

  function reorderPaletteEntry(source: string, target: string, after: boolean) {
    if (source === target) return
    const reordered = reorderPaletteEntries(completePaletteEntries(pattern.value), source, target, after)
    if (reordered) pattern.value.palette = reordered
  }

  function switchPaletteColor(sourceValue: string, targetValue: string): boolean {
    const source = normalizeColor(sourceValue)
    const target = normalizeColor(targetValue)
    if (!source || !target || source === target) return false
    const entries = completePaletteEntries(pattern.value)
    const sourceEntry = entries.find((entry) => entry.color === source)
    const targetEntry = entries.find((entry) => entry.color === target)
    if (!sourceEntry) return false
    if (targetEntry) {
      const sourceDetails = [source.toUpperCase(), sourceEntry.name, sourceEntry.brand, sourceEntry.code].filter(Boolean).join(' · ')
      const merged: PaletteEntry = {
        color: target,
        symbol: targetEntry.symbol,
        name: targetEntry.name || sourceEntry.name,
        brand: targetEntry.brand || sourceEntry.brand,
        code: targetEntry.code || sourceEntry.code,
        notes: [...new Set([targetEntry.notes.trim(), sourceEntry.notes.trim(), sourceDetails].filter(Boolean))].join('\n'),
      }
      pattern.value.palette = entries.filter((entry) => entry.color !== source).map((entry) => entry.color === target ? merged : entry)
    } else {
      pattern.value.palette = entries.map((entry) => entry.color === source ? { ...entry, color: target } : entry)
    }
    pattern.value.cells = pattern.value.cells.map((row) => row.map((color) => color === source ? target : color))
    if (pattern.value.backgroundColor === source) pattern.value.backgroundColor = target
    pattern.value.swatches = [...new Set(pattern.value.swatches.map((color) => color === source ? target : color))]
    pattern.value.recentColors = [...new Set(pattern.value.recentColors.map((color) => color === source ? target : color))]
    return true
  }

  function setOrder(startRow: TrackerStartRow, firstRowDirection: TrackerDirection, alternateRows: boolean) {
    const state = ensureTracker()
    if (completedCount.value > 0) return
    recordState()
    Object.assign(state.progress, { startRow, firstRowDirection, alternateRows })
    changed()
  }

  function setCompletionMode(mode: TrackerCompletionMode) {
    const state = ensureTracker()
    if (completedCount.value > 0 || state.progress.completionMode === mode) return
    recordState()
    state.progress.completionMode = mode
    changed()
  }

  function selectStitch(row: number, column: number, cellIds: string[][]) {
    const state = ensureTracker()
    const selected = cellIds[row][column]
    const completed = new Set(state.progress.completedCells)
    recordState()
    if (state.progress.completionMode === 'individual') {
      if (completed.has(selected)) completed.delete(selected)
      else completed.add(selected)
    } else {
      const ordered = orderedCellIds(cellIds, state.progress)
      const ordinal = stitchOrdinal(row, column, cellIds.length, cellIds[0].length, state.progress)
      if (completed.has(selected)) ordered.slice(ordinal).forEach((id) => completed.delete(id))
      else ordered.slice(0, ordinal + 1).forEach((id) => completed.add(id))
    }
    state.progress.completedCells = [...completed].sort()
    changed()
  }

  function selectStitches(cells: Array<[number, number]>, cellIds: string[][], complete: boolean) {
    const state = ensureTracker()
    if (state.progress.completionMode !== 'individual') return
    const completed = new Set(state.progress.completedCells)
    const ids = cells.map(([row, column]) => cellIds[row][column])
    if (ids.every((id) => completed.has(id) === complete)) return
    recordState()
    ids.forEach((id) => complete ? completed.add(id) : completed.delete(id))
    state.progress.completedCells = [...completed].sort()
    changed()
  }

  function selectRow(row: number, cellIds: string[][]) {
    const state = ensureTracker()
    const completed = new Set(state.progress.completedCells)
    const rowIds = cellIds[row]
    const rowComplete = rowIds.every((id) => completed.has(id))
    recordState()
    if (state.progress.completionMode === 'individual') rowIds.forEach((id) => rowComplete ? completed.delete(id) : completed.add(id))
    else {
      const ordered = orderedCellIds(cellIds, state.progress)
      const rowOrdinals = rowIds.map((id) => ordered.indexOf(id))
      const boundary = rowComplete ? Math.min(...rowOrdinals) : Math.max(...rowOrdinals)
      if (rowComplete) ordered.slice(boundary).forEach((id) => completed.delete(id))
      else ordered.slice(0, boundary + 1).forEach((id) => completed.add(id))
    }
    state.progress.completedCells = [...completed].sort()
    changed()
  }

  function resetProgress() {
    if (!tracker.value || completedCount.value === 0) return
    recordState()
    tracker.value.progress.completedCells = []
    changed()
  }

  function setProjectNote(note: string) {
    const state = ensureTracker()
    const next = note.slice(0, MAX_TRACKER_PROJECT_NOTE_LENGTH)
    if (state.projectNote === next) return
    state.projectNote = next
    changed()
  }

  function setRowNote(rowId: string, note: string) {
    const state = ensureTracker()
    if (!pattern.value.rowIds.includes(rowId)) return
    const next = note.slice(0, MAX_TRACKER_ROW_NOTE_LENGTH)
    if ((state.rowNotes[rowId] ?? '') === next) return
    if (next) state.rowNotes[rowId] = next
    else delete state.rowNotes[rowId]
    changed()
  }

  function addCounter(name: string) {
    const state = ensureTracker()
    const next = name.trim().slice(0, MAX_TRACKER_COUNTER_NAME_LENGTH)
    if (!next || state.counters.length >= MAX_TRACKER_COUNTERS) return null
    recordState()
    const counter = { id: crypto.randomUUID(), name: next, value: 0 }
    state.counters.push(counter)
    changed()
    return counter.id
  }

  function renameCounter(id: string, name: string) {
    const counter = tracker.value?.counters.find((item) => item.id === id)
    const next = name.trim().slice(0, MAX_TRACKER_COUNTER_NAME_LENGTH)
    if (!counter || !next || counter.name === next) return false
    recordState()
    counter.name = next
    changed()
    return true
  }

  function adjustCounter(id: string, amount: -1 | 1) {
    const counter = tracker.value?.counters.find((item) => item.id === id)
    if (!counter || !Number.isSafeInteger(counter.value + amount)) return
    recordState()
    counter.value += amount
    changed()
  }

  function resetCounter(id: string) {
    const counter = tracker.value?.counters.find((item) => item.id === id)
    if (!counter || counter.value === 0) return
    recordState()
    counter.value = 0
    changed()
  }

  function removeCounter(id: string) {
    const state = tracker.value
    if (!state || !state.counters.some((counter) => counter.id === id)) return
    recordState()
    state.counters = state.counters.filter((counter) => counter.id !== id)
    changed()
  }

  function restoreState(snapshot: TrackerSnapshot) {
    const state = ensureTracker()
    Object.assign(state.progress, snapshot.progress)
    pattern.value.annotations = snapshot.annotations.map((annotation) => ({ ...annotation }))
    state.counters = snapshot.counters.map((counter) => ({ ...counter }))
    changed()
  }

  function addComment(row: number, column: number, text: string) {
    if (pattern.value.annotations.length >= 500) return null
    const comment = { id: crypto.randomUUID(), type: 'text' as const, row, column, color: '#7c3aed', text: text.trim().slice(0, 500) || 'Comment' }
    recordState()
    pattern.value.annotations.push(comment)
    changed()
    return comment.id
  }

  function updateComment(id: string, text: string) {
    const comment = pattern.value.annotations.find((annotation) => annotation.id === id)
    const next = text.trim().slice(0, 500)
    if (comment?.type !== 'text' || !next || comment.text === next) return false
    recordState()
    comment.text = next
    changed()
    return true
  }

  function removeComment(id: string) {
    if (!pattern.value.annotations.some((annotation) => annotation.id === id && annotation.type === 'text')) return false
    recordState()
    pattern.value.annotations = pattern.value.annotations.filter((annotation) => annotation.id !== id)
    changed()
    return true
  }

  function undo() {
    if (!tracker.value) return
    const snapshot = undoStack.value.pop()
    if (!snapshot) return
    redoStack.value.push(trackerSnapshot(tracker.value, pattern.value))
    restoreState(snapshot)
  }

  function redo() {
    if (!tracker.value) return
    const snapshot = redoStack.value.pop()
    if (!snapshot) return
    undoStack.value.push(trackerSnapshot(tracker.value, pattern.value))
    restoreState(snapshot)
  }

  function startTimer() {
    const state = ensureTracker()
    if (state.timer.startedAt) return
    state.timer.startedAt = new Date().toISOString()
    state.timer.sessionStartedCompletedCount = completedCount.value
    changed()
  }

  function pauseTimer() {
    if (!tracker.value || !completeTrackerSession(tracker.value, completedCount.value)) return
    changed()
  }

  function resetTimer() {
    const state = ensureTracker()
    const archivedAt = new Date()
    if (state.timer.startedAt) completeTrackerSession(state, completedCount.value, archivedAt)
    if (state.timer.elapsedMilliseconds > 0 || state.sessions.length > 0) {
      state.sessionArchives.push({
        id: crypto.randomUUID(),
        archivedAt: archivedAt.toISOString(),
        elapsedMilliseconds: state.timer.elapsedMilliseconds,
        sessions: state.sessions.map((session) => ({ ...session })),
      })
      if (state.sessionArchives.length > MAX_TRACKER_SESSION_ARCHIVES) state.sessionArchives.shift()
    }
    state.timer = { elapsedMilliseconds: 0, startedAt: null, sessionStartedCompletedCount: null }
    state.sessions = []
    changed()
  }

  function removeSession(id: string) {
    const state = tracker.value
    const session = state?.sessions.find((item) => item.id === id)
    if (!state || !session) return
    state.sessions = state.sessions.filter((item) => item.id !== id)
    state.timer.elapsedMilliseconds = Math.max(0, state.timer.elapsedMilliseconds - session.durationMilliseconds)
    changed()
  }

  function removeSessionArchive(id: string) {
    const state = tracker.value
    if (!state || !state.sessionArchives.some((archive) => archive.id === id)) return
    state.sessionArchives = state.sessionArchives.filter((archive) => archive.id !== id)
    changed()
  }

  function restoreLastSessionArchive() {
    const state = tracker.value
    const archive = state?.sessionArchives.at(-1)
    if (!state || !archive) return
    const sessions = new Map([...archive.sessions, ...state.sessions].map((session) => [session.id, session]))
    state.sessions = [...sessions.values()].slice(-MAX_TRACKER_SESSIONS).map((session) => ({ ...session }))
    state.timer.elapsedMilliseconds = Math.min(Number.MAX_SAFE_INTEGER, state.timer.elapsedMilliseconds + archive.elapsedMilliseconds)
    state.sessionArchives = state.sessionArchives.slice(0, -1)
    changed()
  }

  function setDailyGoal(goal: TrackerDailyGoal | null) {
    const state = ensureTracker()
    state.dailyGoal = goal ? { ...goal } : null
    changed()
  }

  return {
    tracker,
    completedCount,
    totalCount,
    canUndo,
    canRedo,
    paletteEntries,
    ensureTracker,
    setPreferences,
    updatePaletteEntry,
    movePaletteEntry,
    reorderPaletteEntry,
    switchPaletteColor,
    setCompletionMode,
    setOrder,
    selectStitch,
    selectStitches,
    selectRow,
    resetProgress,
    setProjectNote,
    setRowNote,
    addCounter,
    renameCounter,
    adjustCounter,
    resetCounter,
    removeCounter,
    addComment,
    updateComment,
    removeComment,
    undo,
    redo,
    startTimer,
    pauseTimer,
    resetTimer,
    removeSession,
    removeSessionArchive,
    restoreLastSessionArchive,
    setDailyGoal,
  }
}
