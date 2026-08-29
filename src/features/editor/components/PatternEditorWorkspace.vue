<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { PatternState } from '../composables/usePattern'
import type { NotificationKind } from '../../../shared/composables/useNotifications'
import type { DrawingTool, PrintMode, WrittenInstructionFormat } from '../../../types/pattern'
import { colorSymbolMap } from '../../../utils/colors'
import type { RenderedGrid } from '../../../utils/grid'
import { orderedColorCounts } from '../../../utils/palette'
import { pickScreenColor } from '../../../utils/eyeDropper'
import ColorLegend from '../../palette/components/ColorLegend.vue'
import PatternPreview from './PatternPreview.vue'
import EditorCanvasPanel from './EditorCanvasPanel.vue'
import EditorProjectHeader from './EditorProjectHeader.vue'
import EditorToolbar from './EditorToolbar.vue'

const props = defineProps<{
  pattern: PatternState
  renderedPattern: RenderedGrid
  downloadBackupNeeded: boolean
  canvasFullHeight: boolean
  canvasSymbols: boolean
  includeAnnotations: boolean
}>()
const emit = defineEmits<{
  clear: []
  switchWorkspace: []
  save: []
  png: []
  print: [mode?: PrintMode]
  instructions: [format: WrittenInstructionFormat]
  notify: [message: string, kind?: NotificationKind]
  'update:canvasFullHeight': [value: boolean]
  'update:canvasSymbols': [value: boolean]
  'update:includeAnnotations': [value: boolean]
}>()
const { t } = useI18n({ useScope: 'global' })
const pattern = props.pattern
const projectHeader = ref<InstanceType<typeof EditorProjectHeader> | null>(null)
const editorCanvas = ref<InstanceType<typeof EditorCanvasPanel> | null>(null)
const placingSelection = ref(false)
const referenceOpen = ref(false)
const toolShortcuts: Record<string, DrawingTool> = {
  p: 'pencil', e: 'eraser', f: 'fill', i: 'eyedropper', s: 'select', w: 'wand', h: 'move', t: 'text', m: 'marker', a: 'arrow',
}
const canvasSymbolMap = computed(() => props.canvasSymbols
  ? colorSymbolMap(orderedColorCounts(props.renderedPattern.cells, pattern.paletteEntries.value).map(entry => entry.color), pattern.paletteEntries.value)
  : undefined)

async function selectTool(tool: DrawingTool) {
  if (tool === 'eyedropper') {
    const result = await pickScreenColor()
    if (result.status === 'picked') {
      pattern.chooseColor(result.color, true)
      pattern.tool.value = 'pencil'
      return
    }
    if (result.status === 'cancelled') return
  }
  pattern.tool.value = tool
  if (tool === 'move') pattern.clearSelection()
  if (tool !== 'select') placingSelection.value = false
}

function switchPaletteColor(source: string, target: string) {
  const entries = new Map(pattern.paletteEntries.value.map(entry => [entry.color, entry]))
  const sourceLabel = entries.get(source)?.name || source.toUpperCase()
  const targetLabel = entries.get(target)?.name || target.toUpperCase()
  if (pattern.switchPaletteColor(source, target)) emit('notify', t('editor.notifications.colorSwitched', { source: sourceLabel, target: targetLabel }), 'success')
}

function handleKeyboardShortcut(event: KeyboardEvent) {
  const target = event.target as HTMLElement | null
  if (target?.closest('input, textarea, select, [contenteditable="true"]')) return
  if (event.key === 'Escape' && pattern.selectedAnnotationId.value) {
    pattern.selectedAnnotationId.value = null
    return
  }
  if (event.key === 'Escape' && (placingSelection.value || pattern.hasSelection.value || pattern.selectedRows.value.length > 0 || pattern.selectedColumns.value.length > 0)) {
    placingSelection.value = false
    pattern.clearSelection()
    pattern.clearRowSelection()
    pattern.clearColumnSelection()
    return
  }
  if ((event.key === 'Delete' || event.key === 'Backspace') && pattern.selectedAnnotationId.value) {
    event.preventDefault()
    pattern.removeAnnotation(pattern.selectedAnnotationId.value)
    return
  }
  if (!event.metaKey && !event.ctrlKey && !event.altKey) {
    const tool = toolShortcuts[event.key.toLowerCase()]
    if (tool) {
      event.preventDefault()
      void selectTool(tool)
      return
    }
  }
  if ((event.metaKey || event.ctrlKey) && !event.altKey) {
    const key = event.key.toLowerCase()
    if (key === 'z') {
      event.preventDefault()
      if (event.shiftKey) pattern.redo()
      else pattern.undo()
      return
    }
    if (key === 'y' && !event.shiftKey) {
      event.preventDefault()
      pattern.redo()
      return
    }
  }
  if (!(event.metaKey || event.ctrlKey) || pattern.tool.value !== 'select') return
  if (event.key.toLowerCase() === 'c' && pattern.hasSelection.value) {
    event.preventDefault()
    if (pattern.copySelection()) emit('notify', t('editor.notifications.selectionCopied'), 'success')
  }
  if (event.key.toLowerCase() === 'v' && pattern.hasClipboard.value && pattern.hasSelection.value) {
    event.preventDefault()
    if (pattern.pasteSelection()) emit('notify', t('editor.notifications.selectionPasted'), 'success')
    else emit('notify', t('editor.errors.selectionLimit'), 'error')
  }
}

function resetInteraction() {
  placingSelection.value = false
  editorCanvas.value?.reset()
}

defineExpose({
  handleKeyboardShortcut,
  prepareSave: () => projectHeader.value?.saveName(),
  resetInteraction,
})
</script>

<template>
  <section class="card border border-base-300 bg-base-100">
    <div class="card-body app-card-body">
      <EditorProjectHeader
        ref="projectHeader"
        :name="pattern.project.value.name"
        :autosave-status="pattern.autosaveStatus.value"
        :download-backup-needed="downloadBackupNeeded"
        :rows="renderedPattern.cells.length"
        :columns="renderedPattern.cells[0].length"
        @rename="pattern.project.value.name = $event"
      />
      <EditorToolbar
        :pattern="pattern"
        :placing-selection="placingSelection"
        :reference-open="referenceOpen"
        :canvas-full-height="canvasFullHeight"
        :canvas-symbols="canvasSymbols"
        :include-annotations="includeAnnotations"
        @select-tool="selectTool"
        @clear="$emit('clear')"
        @cancel-placement="placingSelection = false"
        @toggle-reference="referenceOpen = !referenceOpen"
        @switch-workspace="$emit('switchWorkspace')"
        @save="$emit('save')"
        @png="$emit('png')"
        @print="$emit('print', $event)"
        @instructions="$emit('instructions', $event)"
        @repeat-saved="$emit('notify', t($event ? 'editor.notifications.repeatBoxUpdated' : 'editor.notifications.repeatBoxAdded'), 'success')"
        @update:canvas-full-height="$emit('update:canvasFullHeight', $event)"
        @update:canvas-symbols="$emit('update:canvasSymbols', $event)"
        @update:include-annotations="$emit('update:includeAnnotations', $event)"
      />
      <EditorCanvasPanel
        ref="editorCanvas"
        v-model:placing-selection="placingSelection"
        v-model:reference-open="referenceOpen"
        :pattern="pattern"
        :rendered-pattern="renderedPattern"
        :canvas-full-height="canvasFullHeight"
        :symbols="canvasSymbolMap"
        @select-tool="selectTool"
        @notify="(message, kind) => $emit('notify', message, kind)"
      />
    </div>
  </section>

  <ColorLegend
    :cells="renderedPattern.cells"
    :symbols="canvasSymbolMap"
    :palette="pattern.paletteEntries.value"
    editable
    allow-color-switch
    @update="pattern.updatePaletteEntry"
    @move="pattern.movePaletteEntry"
    @switch-color="switchPaletteColor"
    @reorder="pattern.reorderPaletteEntry"
  />

  <PatternPreview
    v-model:stitch="pattern.project.value.previewStitch"
    :cells="renderedPattern.cells"
  />
</template>
