import { computed, ref } from 'vue'
import type { PatternGrid } from '../types/pattern'
import { cloneGrid } from '../utils/grid'

export function useHistory() {
  const undoStack = ref<PatternGrid[]>([])
  const redoStack = ref<PatternGrid[]>([])

  function record(grid: PatternGrid) {
    undoStack.value.push(cloneGrid(grid))
    if (undoStack.value.length > 100) undoStack.value.shift()
    redoStack.value = []
  }

  function undo(current: PatternGrid): PatternGrid | null {
    const previous = undoStack.value.pop()
    if (!previous) return null
    redoStack.value.push(cloneGrid(current))
    return cloneGrid(previous)
  }

  function redo(current: PatternGrid): PatternGrid | null {
    const next = redoStack.value.pop()
    if (!next) return null
    undoStack.value.push(cloneGrid(current))
    return cloneGrid(next)
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
