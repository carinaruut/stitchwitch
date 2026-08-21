<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { useI18n } from 'vue-i18n'
import TopNavbar from '../components/TopNavbar.vue'
import DrawingTools from '../components/DrawingTools.vue'
import ColorMenu from '../components/ColorMenu.vue'
import ColorLegend from '../components/ColorLegend.vue'
import GridMenu from '../components/GridMenu.vue'
import RepeatMenu from '../components/RepeatMenu.vue'
import RowMenu from '../components/RowMenu.vue'
import ColumnMenu from '../components/ColumnMenu.vue'
import PatternGrid from '../components/PatternGrid.vue'
import PatternPreview from '../components/PatternPreview.vue'
import ReferenceImage from '../components/ReferenceImage.vue'
import NewProjectModal from '../components/NewProjectModal.vue'
import ConfirmModal from '../components/ConfirmModal.vue'
import NotificationToast from '../components/NotificationToast.vue'
import PrintView from '../components/PrintView.vue'
import UserGuideModal from '../components/UserGuideModal.vue'
import { usePattern } from '../composables/usePattern'
import { useTheme } from '../composables/useTheme'
import { useNotifications } from '../composables/useNotifications'
import { downloadProject, readProjectFile, safeFilename } from '../composables/useProjectFiles'
import type { DrawingTool, NewPatternProject, PatternProject, PrintMode, RepeatBoxInput } from '../types/pattern'
import { localizedErrorMessage } from '../utils/appError'
import { colorSymbolMap } from '../utils/colors'
import { renderGrid } from '../utils/grid'

const CANVAS_FULL_HEIGHT_KEY = 'stitch-canvas-full-height'
const CANVAS_SYMBOLS_KEY = 'stitch-canvas-symbols'

function readCanvasFullHeight() {
  try {
    return localStorage.getItem(CANVAS_FULL_HEIGHT_KEY) !== 'false'
  } catch {
    return true
  }
}

function readCanvasSymbols() {
  try {
    return localStorage.getItem(CANVAS_SYMBOLS_KEY) === 'true'
  } catch {
    return false
  }
}

const pattern = usePattern()
const { t } = useI18n({ useScope: 'global' })
const { theme, toggleTheme } = useTheme()
const { notifications, notify, dismiss } = useNotifications()
const newModalOpen = ref(false)
const clearModalOpen = ref(false)
const importModalOpen = ref(false)
const guideOpen = ref(false)
const referenceOpen = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const pendingImport = ref<PatternProject | null>(null)
const placingSelection = ref(false)
const printMode = ref<PrintMode>('color')
const printMenu = ref<HTMLDetailsElement | null>(null)
const canvasFullHeight = ref(readCanvasFullHeight())
const canvasSymbols = ref(readCanvasSymbols())
const downloadBackupNeeded = ref(pattern.restoredAutosave.value)
const patternName = ref(pattern.project.value.name)
const toolShortcuts: Record<string, DrawingTool> = {
  p: 'pencil',
  e: 'eraser',
  f: 'fill',
  i: 'eyedropper',
  s: 'select',
  w: 'wand',
  h: 'move',
}
const renderedPattern = computed(() => renderGrid(
  pattern.project.value.cells,
  pattern.project.value.horizontalRepeats,
  pattern.project.value.verticalRepeats,
  pattern.project.value.repeatBoxes,
))
const canvasSymbolMap = computed(() => canvasSymbols.value ? colorSymbolMap(renderedPattern.value.cells.flat()) : undefined)

watch(canvasFullHeight, (value) => {
  try {
    localStorage.setItem(CANVAS_FULL_HEIGHT_KEY, String(value))
  } catch {
    // The canvas layout still works when browser storage is unavailable.
  }
})
watch(canvasSymbols, (value) => {
  try {
    localStorage.setItem(CANVAS_SYMBOLS_KEY, String(value))
  } catch {
    // Symbols remain usable when browser storage is unavailable.
  }
})

function localizeProjectError(error: unknown, fallbackKey: string) {
  return localizedErrorMessage(error, t) ?? t(fallbackKey)
}

function savePatternName() {
  const name = patternName.value.trim()
  if (!name) {
    patternName.value = pattern.project.value.name
    return
  }
  patternName.value = name
  pattern.project.value.name = name
}

function cancelPatternName(event: KeyboardEvent) {
  patternName.value = pattern.project.value.name
  blurPatternName(event)
}

function blurPatternName(event: KeyboardEvent) {
  const input = event.currentTarget as HTMLInputElement
  input.blur()
}

function createProject(project: NewPatternProject) {
  pattern.createProject(project)
  newModalOpen.value = false
  notify(t('editor.notifications.patternCreated'), 'success')
}

function requestClear() {
  if (!pattern.hasColoredCells.value) {
    notify(t('editor.notifications.gridAlreadyClear'), 'info')
    return
  }
  clearModalOpen.value = true
}

function confirmClear() {
  pattern.clearGrid()
  clearModalOpen.value = false
  notify(t('editor.notifications.gridCleared'), 'success')
}

function saveProject() {
  try {
    pattern.flushAutosave()
    downloadProject(pattern.project.value)
    downloadBackupNeeded.value = false
    void nextTick(() => { downloadBackupNeeded.value = false })
    notify(t('editor.notifications.projectSaved'), 'success')
  } catch (error) {
    notify(localizeProjectError(error, 'editor.errors.saveFailed'), 'error')
  }
}

async function selectFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) {
    notify(t('editor.notifications.importCancelled'), 'info')
    return
  }
  try {
    pendingImport.value = await readProjectFile(file)
    importModalOpen.value = true
  } catch (error) {
    notify(localizeProjectError(error, 'editor.errors.invalidProjectFile'), 'error', 6000)
  }
}

function confirmImport() {
  if (!pendingImport.value) return
  pattern.replaceProject(pendingImport.value)
  downloadBackupNeeded.value = false
  void nextTick(() => { downloadBackupNeeded.value = false })
  pendingImport.value = null
  importModalOpen.value = false
  notify(t('editor.notifications.projectImported'), 'success')
}

function cancelImport() {
  pendingImport.value = null
  importModalOpen.value = false
  notify(t('editor.notifications.importCancelled'), 'info')
}

function beginStroke() {
  if (pattern.tool.value !== 'eyedropper') pattern.beginGridChange()
}

function pickReferenceColor(color: string) {
  pattern.chooseColor(color, true)
  pattern.tool.value = 'pencil'
  notify(t('editor.notifications.referenceColorPicked', { color: color.toUpperCase() }), 'success')
}

function endStroke() {
  pattern.commitColor()
}

function handleRowAction(action: 'above' | 'below' | 'multiple' | 'delete' | 'fill' | 'erase', row: number, count = 1) {
  if (action === 'above' || action === 'below' || action === 'multiple') pattern.selectRow(row)
  if (action === 'above') pattern.insertRow(row)
  if (action === 'below') pattern.insertRow(row + 1)
  if (action === 'multiple') pattern.insertMultipleRows(row + 1, count)
  if (action === 'delete') pattern.deleteSelectedRows()
  if (action === 'fill') pattern.fillSelectedRows(pattern.selectedColor.value)
  if (action === 'erase') pattern.eraseSelectedRows()
}

function handleColumnAction(action: 'before' | 'after' | 'multiple' | 'delete' | 'fill' | 'erase', column: number, count = 1) {
  if (action === 'before' || action === 'after' || action === 'multiple') pattern.selectColumn(column)
  if (action === 'before') pattern.insertColumn(column)
  if (action === 'after') pattern.insertColumn(column + 1)
  if (action === 'multiple') pattern.insertMultipleColumns(column + 1, count)
  if (action === 'delete') pattern.deleteSelectedColumns()
  if (action === 'fill') pattern.fillSelectedColumns(pattern.selectedColor.value)
  if (action === 'erase') pattern.eraseSelectedColumns()
}

function handleSelectionAction(action: 'move' | 'copy' | 'paste' | 'flip-horizontal' | 'flip-vertical' | 'fill' | 'erase') {
  if (action === 'move') startMoveSelection()
  if (action === 'copy') copySelection()
  if (action === 'paste') pasteSelection()
  if (action === 'flip-horizontal') mirrorSelection('horizontal')
  if (action === 'flip-vertical') mirrorSelection('vertical')
  if (action === 'fill') pattern.fillSelection(pattern.selectedColor.value)
  if (action === 'erase') pattern.eraseSelection()
}

function deleteRows(value: string) {
  if (pattern.selectRows(value)) pattern.deleteSelectedRows()
}

function deleteColumns(value: string) {
  if (pattern.selectColumns(value)) pattern.deleteSelectedColumns()
}

function selectRowHeader(row: number, extend: boolean, toggle: boolean) {
  if (toggle) pattern.clearRowSelection()
  else pattern.selectRow(row, extend, true)
  if (pattern.setHeaderSelection('row')) selectTool('select')
}

function selectColumnHeader(column: number, extend: boolean, toggle: boolean) {
  if (toggle) pattern.clearColumnSelection()
  else pattern.selectColumn(column, extend, true)
  if (pattern.setHeaderSelection('column')) selectTool('select')
}

async function printPattern(mode: PrintMode = printMode.value) {
  printMode.value = mode
  if (printMenu.value) printMenu.value.open = false
  await nextTick()
  window.print()
}

async function downloadCanvasPng() {
  if (printMenu.value) printMenu.value.open = false
  try {
    const { cells, rowHeaders, columnHeaders } = renderedPattern.value
    const maximumDimension = Math.max(cells.length, cells[0].length)
    const cellPixels = Math.max(1, Math.min(pattern.project.value.cellSize, Math.floor((4096 - 32) / maximumDimension)))
    const fontPixels = Math.max(6, Math.min(14, Math.floor(cellPixels * 0.5)))
    const largestCoordinate = String(Math.max(...rowHeaders, ...columnHeaders) + 1)
    const headerPixels = Math.max(cellPixels, Math.ceil(largestCoordinate.length * fontPixels * 0.65) + 6)
    const canvas = document.createElement('canvas')
    canvas.width = headerPixels + cells[0].length * cellPixels
    canvas.height = headerPixels + cells.length * cellPixels
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas rendering is unavailable')

    context.fillStyle = '#f3f4f6'
    context.fillRect(0, 0, canvas.width, canvas.height)
    cells.forEach((row, rowIndex) => row.forEach((color, columnIndex) => {
      context.fillStyle = color
      context.fillRect(headerPixels + columnIndex * cellPixels, headerPixels + rowIndex * cellPixels, cellPixels, cellPixels)
    }))

    context.strokeStyle = '#9ca3af'
    context.lineWidth = 1
    context.beginPath()
    for (let row = 0; row <= cells.length; row++) {
      const y = Math.min(canvas.height - 0.5, headerPixels + row * cellPixels + 0.5)
      context.moveTo(0, y)
      context.lineTo(canvas.width, y)
    }
    for (let column = 0; column <= cells[0].length; column++) {
      const x = Math.min(canvas.width - 0.5, headerPixels + column * cellPixels + 0.5)
      context.moveTo(x, 0)
      context.lineTo(x, canvas.height)
    }
    context.rect(0.5, 0.5, canvas.width - 1, canvas.height - 1)
    context.stroke()

    context.fillStyle = '#111827'
    context.font = `${fontPixels}px sans-serif`
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    rowHeaders.forEach((coordinate, index) => context.fillText(String(coordinate + 1), headerPixels / 2, headerPixels + (index + 0.5) * cellPixels))
    columnHeaders.forEach((coordinate, index) => {
      const label = String(coordinate + 1)
      const x = headerPixels + (index + 0.5) * cellPixels
      if (context.measureText(label).width <= cellPixels - 2) context.fillText(label, x, headerPixels / 2)
      else {
        context.save()
        context.translate(x, headerPixels / 2)
        context.rotate(-Math.PI / 2)
        context.fillText(label, 0, 0)
        context.restore()
      }
    })

    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('PNG creation failed')), 'image/png'))
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = safeFilename(pattern.project.value.name).replace(/\.stitch-pattern$/, '.png')
    link.click()
    URL.revokeObjectURL(url)
    notify(t('editor.notifications.pngDownloaded'), 'success')
  } catch {
    notify(t('editor.errors.pngFailed'), 'error')
  }
}

function saveRepeatBox(input: RepeatBoxInput, id: string | null, complete: (error: string | null) => void) {
  const error = pattern.saveRepeatBox(input, id)
  complete(error)
  if (!error) notify(t(id ? 'editor.notifications.repeatBoxUpdated' : 'editor.notifications.repeatBoxAdded'), 'success')
}

function selectTool(tool: typeof pattern.tool.value) {
  pattern.tool.value = tool
  if (tool === 'move') pattern.clearSelection()
  if (tool !== 'select') placingSelection.value = false
}

function copySelection() {
  if (pattern.copySelection()) notify(t('editor.notifications.selectionCopied'), 'success')
}

function pasteSelection() {
  if (pattern.pasteSelection()) notify(t('editor.notifications.selectionPasted'), 'success')
  else notify(t('editor.errors.selectionLimit'), 'error')
}

function startMoveSelection() {
  if (pattern.hasSelection.value) placingSelection.value = true
}

function mirrorSelection(direction: 'horizontal' | 'vertical') {
  if (pattern.mirrorSelection(direction)) notify(t('editor.notifications.selectionFlipped', { direction: t(`editor.directions.${direction}`) }), 'success')
}

function toggleMirror(direction: 'horizontal' | 'vertical') {
  if (direction === 'horizontal') pattern.mirrorHorizontal.value = !pattern.mirrorHorizontal.value
  else pattern.mirrorVertical.value = !pattern.mirrorVertical.value
}

function placeSelection(row: number, column: number) {
  if (!placingSelection.value) return
  if (pattern.moveSelectionTo(row, column)) notify(t('editor.notifications.selectionMoved'), 'success')
  else notify(t('editor.errors.selectionLimit'), 'error')
  placingSelection.value = false
}

function moveSelectionDirectly(row: number, column: number) {
  if (pattern.moveSelectionTo(row, column)) notify(t('editor.notifications.selectionMoved'), 'success')
  else notify(t('editor.errors.selectionLimit'), 'error')
}

function handleKeyboardShortcuts(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === 's') {
    event.preventDefault()
    if (newModalOpen.value || clearModalOpen.value || importModalOpen.value || guideOpen.value) return
    savePatternName()
    saveProject()
    return
  }
  const target = event.target as HTMLElement | null
  if (target?.closest('input, textarea, select, [contenteditable="true"]')) return
  if (newModalOpen.value || clearModalOpen.value || importModalOpen.value || guideOpen.value) return
  if (event.key === 'Escape' && (placingSelection.value || pattern.hasSelection.value || pattern.selectedRows.value.length > 0 || pattern.selectedColumns.value.length > 0)) {
    placingSelection.value = false
    pattern.clearSelection()
    pattern.clearRowSelection()
    pattern.clearColumnSelection()
    return
  }
  if (!event.metaKey && !event.ctrlKey && !event.altKey) {
    const tool = toolShortcuts[event.key.toLowerCase()]
    if (tool) {
      event.preventDefault()
      selectTool(tool)
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
    copySelection()
  }
  if (event.key.toLowerCase() === 'v' && pattern.hasClipboard.value && pattern.hasSelection.value) {
    event.preventDefault()
    pasteSelection()
  }
}

function flushHiddenProject() {
  if (document.visibilityState === 'hidden') pattern.flushAutosave()
}

function warnBeforeUnload(event: BeforeUnloadEvent) {
  pattern.flushAutosave()
  if (!downloadBackupNeeded.value) return
  event.preventDefault()
  event.returnValue = t('editor.confirmations.beforeUnload')
}

let autosaveErrorNotified = false
watch(pattern.autosaveStatus, (status) => {
  if (status === 'error' && !autosaveErrorNotified) {
    autosaveErrorNotified = true
    notify(t('editor.notifications.backupFailed'), 'error', 7000)
  }
})
watch(pattern.project, () => {
  downloadBackupNeeded.value = true
}, { deep: true })
watch(() => pattern.project.value.name, (name) => {
  patternName.value = name
})

onBeforeRouteLeave(() => {
  pattern.flushAutosave()
  if (!downloadBackupNeeded.value) return true
  return window.confirm(t('editor.confirmations.leavePage'))
})

onMounted(() => {
  window.addEventListener('keydown', handleKeyboardShortcuts)
  window.addEventListener('beforeunload', warnBeforeUnload)
  window.addEventListener('pagehide', pattern.flushAutosave)
  document.addEventListener('visibilitychange', flushHiddenProject)
  if (pattern.restoredAutosave.value) notify(t('editor.notifications.patternRecovered'), 'success')
})
onBeforeUnmount(() => {
  pattern.flushAutosave()
  window.removeEventListener('keydown', handleKeyboardShortcuts)
  window.removeEventListener('beforeunload', warnBeforeUnload)
  window.removeEventListener('pagehide', pattern.flushAutosave)
  document.removeEventListener('visibilitychange', flushHiddenProject)
})
</script>

<template>
  <div class="screen-only min-h-screen bg-base-200 text-base-content">
    <TopNavbar
      :theme="theme"
      @new="newModalOpen = true"
      @open="fileInput?.click()"
      @save="saveProject"
      @png="downloadCanvasPng"
      @print="printPattern"
      @theme="toggleTheme"
      @guide="guideOpen = true"
    />
    <input
      ref="fileInput"
      class="sr-only"
      type="file"
      tabindex="-1"
      :aria-label="t('editor.nav.openProject')"
      @change="selectFile"
    >

    <div class="min-w-0 p-3 sm:p-5">
      <main class="mx-auto max-w-[90rem] space-y-4">
        <section class="card border border-base-300 bg-base-100">
          <div class="card-body gap-3 p-3 sm:p-5">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <input
                  v-model="patternName"
                  class="input input-ghost h-auto min-h-0 w-full max-w-lg px-0 py-0 text-xl font-bold focus:px-2 focus:py-1"
                  type="text"
                  required
                  maxlength="100"
                  :aria-label="t('controls.newProject.projectName')"
                  @blur="savePatternName"
                  @keydown.enter.prevent="blurPatternName"
                  @keydown.esc.prevent="cancelPatternName"
                >
              </div>
              <div class="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:items-end">
                <div class="flex flex-wrap items-center gap-2 sm:justify-end">
                  <span
                    class="badge"
                    :class="pattern.autosaveStatus.value === 'error' ? 'badge-error' : pattern.autosaveStatus.value === 'saving' ? 'badge-ghost' : 'badge-success badge-outline'"
                  >
                    <span
                      class="mdi"
                      :class="pattern.autosaveStatus.value === 'error' ? 'mdi-alert-circle-outline' : pattern.autosaveStatus.value === 'saving' ? 'mdi-loading mdi-spin' : 'mdi-content-save-check-outline'"
                      aria-hidden="true"
                    />
                    {{ t(`editor.status.${pattern.autosaveStatus.value}`) }}
                  </span>
                  <span
                    v-if="downloadBackupNeeded"
                    class="badge badge-warning badge-outline"
                  >
                    <span
                      class="mdi mdi-download-alert-outline"
                      aria-hidden="true"
                    />
                    {{ t('editor.status.notDownloaded') }}
                  </span>
                  <span class="badge badge-primary">{{ t(renderedPattern.cells[0].length === 1 ? 'editor.status.oneColumn' : 'editor.status.columns', { count: renderedPattern.cells[0].length }) }}</span>
                  <span class="badge badge-secondary">{{ t(renderedPattern.cells.length === 1 ? 'editor.status.oneRow' : 'editor.status.rows', { count: renderedPattern.cells.length }) }}</span>
                </div>
              </div>
            </div>
            <DrawingTools
              :tool="pattern.tool.value"
              :placing-selection="placingSelection"
              :mirror-horizontal="pattern.mirrorHorizontal.value"
              :mirror-vertical="pattern.mirrorVertical.value"
              :reference-open="referenceOpen"
              @select="selectTool"
              @toggle-mirror-horizontal="toggleMirror('horizontal')"
              @toggle-mirror-vertical="toggleMirror('vertical')"
              @toggle-reference="referenceOpen = !referenceOpen"
              @cancel-placement="placingSelection = false"
              @clear="requestClear"
              @save="saveProject"
              @png="downloadCanvasPng"
              @print="printPattern"
            >
              <template #color>
                <ColorMenu
                  :color="pattern.selectedColor.value"
                  :recent-colors="pattern.recentColors.value"
                  :swatches="pattern.project.value.swatches"
                  @select="pattern.chooseColor($event)"
                  @eyedropper="pattern.tool.value = 'eyedropper'"
                  @add-swatch="pattern.addSwatch()"
                  @remove-swatch="pattern.removeSwatch($event)"
                />
              </template>
              <template #controls>
                <button
                  class="btn btn-ghost btn-square btn-sm"
                  type="button"
                  :disabled="!pattern.canUndo.value"
                  :aria-label="t('editor.nav.undo')"
                  :title="t('editor.nav.undo')"
                  aria-keyshortcuts="Control+Z Meta+Z"
                  @click="pattern.undo"
                >
                  <span
                    class="mdi mdi-undo text-lg"
                    aria-hidden="true"
                  />
                </button>
                <button
                  class="btn btn-ghost btn-square btn-sm"
                  type="button"
                  :disabled="!pattern.canRedo.value"
                  :aria-label="t('editor.nav.redo')"
                  :title="t('editor.nav.redo')"
                  aria-keyshortcuts="Control+Y Control+Shift+Z Meta+Shift+Z"
                  @click="pattern.redo"
                >
                  <span
                    class="mdi mdi-redo text-lg"
                    aria-hidden="true"
                  />
                </button>
                <RepeatMenu
                  :horizontal="pattern.project.value.horizontalRepeats"
                  :vertical="pattern.project.value.verticalRepeats"
                  :boxes="pattern.project.value.repeatBoxes"
                  :selected-row="pattern.selectedRow.value"
                  :row-count="pattern.rowCount.value"
                  :selected-column="pattern.selectedColumn.value"
                  :column-count="pattern.columnCount.value"
                  @horizontal="pattern.project.value.horizontalRepeats = $event"
                  @vertical="pattern.project.value.verticalRepeats = $event"
                  @save="saveRepeatBox"
                  @toggle="pattern.toggleRepeatBox"
                  @remove="pattern.removeRepeatBox"
                />
                <RowMenu
                  :selected="pattern.selectedRow.value"
                  :count="pattern.rowCount.value"
                  @before="pattern.insertRow(pattern.selectedRow.value)"
                  @after="pattern.insertRow(pattern.selectedRow.value + 1)"
                  @beginning="pattern.insertRow(0)"
                  @end="pattern.insertRow(pattern.rowCount.value)"
                  @fill="pattern.fillRow(pattern.selectedRow.value, pattern.selectedColor.value)"
                  @erase="pattern.eraseRow(pattern.selectedRow.value)"
                  @remove-current="pattern.deleteSelectedRow"
                  @remove-rows="deleteRows"
                />
                <ColumnMenu
                  :selected="pattern.selectedColumn.value"
                  :count="pattern.columnCount.value"
                  @before="pattern.insertColumn(pattern.selectedColumn.value)"
                  @after="pattern.insertColumn(pattern.selectedColumn.value + 1)"
                  @beginning="pattern.insertColumn(0)"
                  @end="pattern.insertColumn(pattern.columnCount.value)"
                  @fill="pattern.fillColumn(pattern.selectedColumn.value, pattern.selectedColor.value)"
                  @erase="pattern.eraseColumn(pattern.selectedColumn.value)"
                  @remove-current="pattern.deleteSelectedColumn"
                  @remove-columns="deleteColumns"
                />
              </template>
              <template #settings>
                <GridMenu
                  :cell-size="pattern.project.value.cellSize"
                  :full-height="canvasFullHeight"
                  :show-symbols="canvasSymbols"
                  @cell-size="pattern.project.value.cellSize = $event"
                  @full-height="canvasFullHeight = $event"
                  @show-symbols="canvasSymbols = $event"
                />
              </template>
            </DrawingTools>
            <div
              class="grid min-w-0"
              :class="referenceOpen ? 'gap-3 lg:grid-cols-[minmax(0,1fr)_22rem]' : 'grid-cols-1'"
            >
              <div
                v-show="referenceOpen"
                class="min-w-0 lg:order-2 lg:sticky lg:top-3 lg:self-start"
              >
                <ReferenceImage
                  :picking="pattern.tool.value === 'eyedropper'"
                  @pick="pickReferenceColor"
                  @request-pick="selectTool('eyedropper')"
                  @close="referenceOpen = false"
                  @error="notify($event, 'error')"
                />
              </div>
              <div class="min-w-0 lg:order-1">
                <PatternGrid
                  :cells="renderedPattern.cells"
                  :cell-source-rows="renderedPattern.sourceRows"
                  :cell-source-columns="renderedPattern.sourceColumns"
                  :row-headers="renderedPattern.rowHeaders"
                  :column-headers="renderedPattern.columnHeaders"
                  :row-copies="renderedPattern.rowCopies"
                  :column-copies="renderedPattern.columnCopies"
                  :repeat-flags="renderedPattern.repeatFlags"
                  :repeat-color-indices="renderedPattern.repeatColorIndices"
                  :source-rows="pattern.rowCount.value"
                  :source-columns="pattern.columnCount.value"
                  :cell-size="pattern.project.value.cellSize"
                  :full-height="canvasFullHeight"
                  :selected-row="pattern.selectedRow.value"
                  :selected-column="pattern.selectedColumn.value"
                  :selected-rows="pattern.selectedRows.value"
                  :selected-columns="pattern.selectedColumns.value"
                  :tool="pattern.tool.value"
                  :selection="pattern.selection.value"
                  :placing-selection="placingSelection"
                  :can-paste="pattern.hasClipboard.value"
                  :mirror-horizontal="pattern.mirrorHorizontal.value"
                  :mirror-vertical="pattern.mirrorVertical.value"
                  :symbols="canvasSymbolMap"
                  @stroke-start="beginStroke"
                  @paint="pattern.paintCell"
                  @stroke-end="endStroke"
                  @select-row="selectRowHeader"
                  @row-action="handleRowAction"
                  @select-column="selectColumnHeader"
                  @column-action="handleColumnAction"
                  @select-area="pattern.setSelection"
                  @magic-select="pattern.setMagicSelection"
                  @selection-action="handleSelectionAction"
                  @clear-selection="pattern.clearSelection"
                  @place-selection="placeSelection"
                  @move-selection="moveSelectionDirectly"
                />
              </div>
            </div>
          </div>
        </section>

        <ColorLegend
          :cells="renderedPattern.cells"
          :symbols="canvasSymbolMap"
        />

        <PatternPreview
          v-model:stitch="pattern.project.value.previewStitch"
          :cells="renderedPattern.cells"
        />
      </main>
    </div>
  </div>

  <NewProjectModal
    :open="newModalOpen"
    @create="createProject"
    @cancel="newModalOpen = false"
  />
  <UserGuideModal
    :open="guideOpen"
    @close="guideOpen = false"
  />
  <ConfirmModal
    :open="clearModalOpen"
    :title="t('editor.confirmations.clearTitle')"
    :message="t('editor.confirmations.clearMessage')"
    :confirm-label="t('editor.confirmations.clearConfirm')"
    destructive
    @confirm="confirmClear"
    @cancel="clearModalOpen = false"
  />
  <ConfirmModal
    :open="importModalOpen"
    :title="t('editor.confirmations.importTitle')"
    :message="t('editor.confirmations.importMessage')"
    :confirm-label="t('editor.confirmations.importConfirm')"
    @confirm="confirmImport"
    @cancel="cancelImport"
  />
  <NotificationToast
    :notifications="notifications"
    @dismiss="dismiss"
  />
  <PrintView
    :project="pattern.project.value"
    :mode="printMode"
  />
</template>
