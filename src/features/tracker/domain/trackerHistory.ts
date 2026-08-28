import type { Ref } from 'vue'
import type { PatternAnnotation, PatternProject } from '../../../types/pattern'
import type { TrackerCounter, TrackerPreferences, TrackerProgress, TrackerState } from '../../../types/tracker'

type ProgressSnapshot = Omit<TrackerProgress, 'updatedAt'>

export interface TrackerSnapshot {
  progress: ProgressSnapshot
  annotations: PatternAnnotation[]
  counters: TrackerCounter[]
}

interface TrackerHistoryContext {
  pattern: Ref<PatternProject>
  tracker: Ref<TrackerState | undefined>
  undoStack: Ref<TrackerSnapshot[]>
  redoStack: Ref<TrackerSnapshot[]>
  ensureTracker: (preferences?: TrackerPreferences) => TrackerState
  changed: () => void
}

function trackerSnapshot(state: TrackerState, pattern: PatternProject): TrackerSnapshot {
  return {
    progress: {
      completedCells: [...state.progress.completedCells],
      completionMode: state.progress.completionMode,
      startRow: state.progress.startRow,
      firstRowDirection: state.progress.firstRowDirection,
      alternateRows: state.progress.alternateRows,
    },
    annotations: pattern.annotations.map((annotation) => ({ ...annotation })),
    counters: state.counters.map((counter) => ({ ...counter })),
  }
}

export function createTrackerHistory(context: TrackerHistoryContext) {
  function recordState() {
    if (!context.tracker.value) return
    context.undoStack.value.push(trackerSnapshot(context.tracker.value, context.pattern.value))
    if (context.undoStack.value.length > 100) context.undoStack.value.shift()
    context.redoStack.value = []
  }

  function restoreState(snapshot: TrackerSnapshot) {
    const state = context.ensureTracker()
    Object.assign(state.progress, snapshot.progress)
    context.pattern.value.annotations = snapshot.annotations.map((annotation) => ({ ...annotation }))
    state.counters = snapshot.counters.map((counter) => ({ ...counter }))
    context.changed()
  }

  function undo() {
    if (!context.tracker.value) return
    const snapshot = context.undoStack.value.pop()
    if (!snapshot) return
    context.redoStack.value.push(trackerSnapshot(context.tracker.value, context.pattern.value))
    restoreState(snapshot)
  }

  function redo() {
    if (!context.tracker.value) return
    const snapshot = context.redoStack.value.pop()
    if (!snapshot) return
    context.undoStack.value.push(trackerSnapshot(context.tracker.value, context.pattern.value))
    restoreState(snapshot)
  }

  return { recordState, undo, redo }
}
