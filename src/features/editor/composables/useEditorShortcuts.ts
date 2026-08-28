import { onBeforeUnmount, onMounted, type MaybeRefOrGetter, toValue } from 'vue'

interface EditorShortcutOptions {
  blocked: MaybeRefOrGetter<boolean>
  editorActive: MaybeRefOrGetter<boolean>
  onSave: () => void
  onEditorKey: (event: KeyboardEvent) => void
}

export function useEditorShortcuts(options: EditorShortcutOptions) {
  function handleKeyboardShortcuts(event: KeyboardEvent) {
    if ((event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === 's') {
      event.preventDefault()
      if (!toValue(options.blocked)) options.onSave()
      return
    }
    if (toValue(options.blocked) || !toValue(options.editorActive)) return
    options.onEditorKey(event)
  }

  onMounted(() => window.addEventListener('keydown', handleKeyboardShortcuts))
  onBeforeUnmount(() => window.removeEventListener('keydown', handleKeyboardShortcuts))
}
