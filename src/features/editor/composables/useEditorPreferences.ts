import { ref, watch } from 'vue'

const CANVAS_FULL_HEIGHT_KEY = 'stitch-canvas-full-height'
const CANVAS_SYMBOLS_KEY = 'stitch-canvas-symbols'
const EXPORT_ANNOTATIONS_KEY = 'stitch-export-annotations'

function readPreference(key: string, fallback: boolean, storedValue: string) {
  try {
    return localStorage.getItem(key) === storedValue
  } catch {
    return fallback
  }
}

function readUnlessFalse(key: string) {
  try {
    return localStorage.getItem(key) !== 'false'
  } catch {
    return true
  }
}

export function useEditorPreferences() {
  const canvasFullHeight = ref(readUnlessFalse(CANVAS_FULL_HEIGHT_KEY))
  const canvasSymbols = ref(readPreference(CANVAS_SYMBOLS_KEY, false, 'true'))
  const includeAnnotations = ref(readUnlessFalse(EXPORT_ANNOTATIONS_KEY))

  const persist = (key: string, value: boolean) => {
    try {
      localStorage.setItem(key, String(value))
    } catch {
      // Preferences remain usable for the current session when storage is unavailable.
    }
  }

  watch(canvasFullHeight, value => persist(CANVAS_FULL_HEIGHT_KEY, value))
  watch(canvasSymbols, value => persist(CANVAS_SYMBOLS_KEY, value))
  watch(includeAnnotations, value => persist(EXPORT_ANNOTATIONS_KEY, value))

  return { canvasFullHeight, canvasSymbols, includeAnnotations }
}
