import { ref, watch } from 'vue'

const CANVAS_FULL_HEIGHT_KEY = 'stitch-canvas-full-height'
const CANVAS_SYMBOLS_KEY = 'stitch-canvas-symbols'
const EXPORT_ANNOTATIONS_KEY = 'stitch-export-annotations'

function readPreference(storage: Storage, key: string, fallback: boolean, storedValue: string) {
  try {
    return storage.getItem(key) === storedValue
  } catch {
    return fallback
  }
}

function readUnlessFalse(storage: Storage, key: string) {
  try {
    return storage.getItem(key) !== 'false'
  } catch {
    return true
  }
}

export function useEditorPreferences(storage: Storage = localStorage) {
  const canvasFullHeight = ref(readUnlessFalse(storage, CANVAS_FULL_HEIGHT_KEY))
  const canvasSymbols = ref(readPreference(storage, CANVAS_SYMBOLS_KEY, false, 'true'))
  const includeAnnotations = ref(readUnlessFalse(storage, EXPORT_ANNOTATIONS_KEY))

  const persist = (key: string, value: boolean) => {
    try {
      storage.setItem(key, String(value))
    } catch {
      // Preferences remain usable for the current session when storage is unavailable.
    }
  }

  watch(canvasFullHeight, value => persist(CANVAS_FULL_HEIGHT_KEY, value))
  watch(canvasSymbols, value => persist(CANVAS_SYMBOLS_KEY, value))
  watch(includeAnnotations, value => persist(EXPORT_ANNOTATIONS_KEY, value))

  return { canvasFullHeight, canvasSymbols, includeAnnotations }
}
