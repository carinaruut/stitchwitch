import { computed, ref } from 'vue'
import type { PaletteEntry, PatternAnnotation, PatternGrid, RepeatBox } from '../types/pattern'
import { cloneGrid } from '../utils/grid'

export interface PatternSnapshot {
  cells: PatternGrid
  rowIds: string[]
  columnIds: string[]
  repeatBoxes: RepeatBox[]
  annotations: PatternAnnotation[]
  palette: PaletteEntry[]
  backgroundColor: string
  swatches: string[]
  recentColors: string[]
}

function cloneSnapshot(snapshot: PatternSnapshot): PatternSnapshot {
  return {
    cells: cloneGrid(snapshot.cells),
    rowIds: [...snapshot.rowIds],
    columnIds: [...snapshot.columnIds],
    repeatBoxes: snapshot.repeatBoxes.map((box) => ({ ...box })),
    annotations: snapshot.annotations.map((annotation) => ({ ...annotation })),
    palette: snapshot.palette.map((entry) => ({ ...entry })),
    backgroundColor: snapshot.backgroundColor,
    swatches: [...snapshot.swatches],
    recentColors: [...snapshot.recentColors],
  }
}

export function useHistory() {
  const undoStack = ref<PatternSnapshot[]>([])
  const redoStack = ref<PatternSnapshot[]>([])

  function record(snapshot: PatternSnapshot) {
    undoStack.value.push(cloneSnapshot(snapshot))
    if (undoStack.value.length > 100) undoStack.value.shift()
    redoStack.value = []
  }

  function undo(current: PatternSnapshot): PatternSnapshot | null {
    const previous = undoStack.value.pop()
    if (!previous) return null
    redoStack.value.push(cloneSnapshot(current))
    return cloneSnapshot(previous)
  }

  function redo(current: PatternSnapshot): PatternSnapshot | null {
    const next = redoStack.value.pop()
    if (!next) return null
    undoStack.value.push(cloneSnapshot(current))
    return cloneSnapshot(next)
  }

  function reset() {
    undoStack.value = []
    redoStack.value = []
  }

  return {
    canUndo: computed(() => undoStack.value.length > 0),
    canRedo: computed(() => redoStack.value.length > 0),
    record,
    undo,
    redo,
    reset,
  }
}
