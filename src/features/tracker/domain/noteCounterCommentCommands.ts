import { MAX_TRACKER_COUNTER_NAME_LENGTH, MAX_TRACKER_COUNTERS, MAX_TRACKER_PROJECT_NOTE_LENGTH, MAX_TRACKER_ROW_NOTE_LENGTH } from '../../../types/tracker'
import type { TrackerCommandContext } from './trackerCommandContext'

export function createNoteCounterCommentCommands(context: TrackerCommandContext) {
  const { pattern, tracker, ensureTracker, recordState, changed } = context

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

  return { setProjectNote, setRowNote, addCounter, renameCounter, adjustCounter, resetCounter, removeCounter, addComment, updateComment, removeComment }
}
