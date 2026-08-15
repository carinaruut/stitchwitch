<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import TopNavbar from '../components/TopNavbar.vue'
import DrawingTools from '../components/DrawingTools.vue'
import ColorMenu from '../components/ColorMenu.vue'
import GridMenu from '../components/GridMenu.vue'
import RepeatMenu from '../components/RepeatMenu.vue'
import RowMenu from '../components/RowMenu.vue'
import ColumnMenu from '../components/ColumnMenu.vue'
import PatternGrid from '../components/PatternGrid.vue'
import PatternPreview from '../components/PatternPreview.vue'
import NewProjectModal from '../components/NewProjectModal.vue'
import ConfirmModal from '../components/ConfirmModal.vue'
import NotificationToast from '../components/NotificationToast.vue'
import PrintView from '../components/PrintView.vue'
import UserGuideModal from '../components/UserGuideModal.vue'
import { usePattern } from '../composables/usePattern'
import { useTheme } from '../composables/useTheme'
import { useNotifications } from '../composables/useNotifications'
import { downloadProject, readProjectFile } from '../composables/useProjectFiles'
import type { DrawingTool, NewPatternProject, PatternProject, PrintMode, RepeatBoxInput } from '../types/pattern'
import { renderGrid } from '../utils/grid'

const pattern = usePattern()
const { theme, toggleTheme } = useTheme()
const { notifications, notify, dismiss } = useNotifications()
const newModalOpen = ref(false)
const clearModalOpen = ref(false)
const importModalOpen = ref(false)
const guideOpen = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const pendingImport = ref<PatternProject | null>(null)
const placingSelection = ref(false)
const printMode = ref<PrintMode>('color')
const printInColor = computed({
  get: () => printMode.value === 'color',
  set: (value: boolean) => { printMode.value = value ? 'color' : 'symbols' },
})
const downloadBackupNeeded = ref(pattern.restoredAutosave.value)
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

function createProject(project: NewPatternProject) {
  pattern.createProject(project)
  newModalOpen.value = false
  notify('New pattern created.', 'success')
}

function requestClear() {
  if (!pattern.hasColoredCells.value) {
    notify('The grid is already clear.', 'info')
    return
  }
  clearModalOpen.value = true
}

function confirmClear() {
  pattern.clearGrid()
  clearModalOpen.value = false
  notify('Grid cleared.', 'success')
}

function saveProject() {
  try {
    downloadProject(pattern.project.value)
    downloadBackupNeeded.value = false
    void nextTick(() => { downloadBackupNeeded.value = false })
    notify('Project saved to your downloads.', 'success')
  } catch (error) {
    notify(error instanceof Error ? error.message : 'The project could not be saved.', 'error')
  }
}

async function selectFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) {
    notify('Import cancelled.', 'info')
    return
  }
  try {
    pendingImport.value = await readProjectFile(file)
    importModalOpen.value = true
  } catch (error) {
    notify(error instanceof Error ? error.message : 'The project file is invalid.', 'error', 6000)
  }
}

function confirmImport() {
  if (!pendingImport.value) return
  pattern.replaceProject(pendingImport.value)
  downloadBackupNeeded.value = false
  void nextTick(() => { downloadBackupNeeded.value = false })
  pendingImport.value = null
  importModalOpen.value = false
  notify('Project imported successfully.', 'success')
}

function cancelImport() {
  pendingImport.value = null
  importModalOpen.value = false
  notify('Import cancelled.', 'info')
}

function beginStroke() {
  if (pattern.tool.value !== 'eyedropper') pattern.beginGridChange()
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

function handleSelectionAction(action: 'fill' | 'erase') {
  if (action === 'fill') pattern.fillSelection(pattern.selectedColor.value)
  else pattern.eraseSelection()
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
}

function selectColumnHeader(column: number, extend: boolean, toggle: boolean) {
  if (toggle) pattern.clearColumnSelection()
  else pattern.selectColumn(column, extend, true)
}

function printPattern() {
  window.print()
}

function saveRepeatBox(input: RepeatBoxInput, id: string | null, complete: (error: string | null) => void) {
  const error = pattern.saveRepeatBox(input, id)
  complete(error)
  if (!error) notify(id ? 'Repeat box updated.' : 'Repeat box added.', 'success')
}

function selectTool(tool: typeof pattern.tool.value) {
  pattern.tool.value = tool
  if (tool !== 'select') placingSelection.value = false
}

function copySelection() {
  if (pattern.copySelection()) notify('Selection copied.', 'success')
}

function pasteSelection() {
  if (pattern.pasteSelection()) notify('Selection pasted.', 'success')
  else notify('The selection cannot extend beyond 500 rows or columns.', 'error')
}

function startMoveSelection() {
  if (pattern.hasSelection.value) placingSelection.value = true
}

function mirrorSelection(direction: 'horizontal' | 'vertical') {
  if (pattern.mirrorSelection(direction)) notify(`Selection flipped ${direction === 'horizontal' ? 'horizontally' : 'vertically'}.`, 'success')
}

function toggleMirror(direction: 'horizontal' | 'vertical') {
  if (direction === 'horizontal') pattern.mirrorHorizontal.value = !pattern.mirrorHorizontal.value
  else pattern.mirrorVertical.value = !pattern.mirrorVertical.value
}

function placeSelection(row: number, column: number) {
  if (!placingSelection.value) return
  if (pattern.moveSelectionTo(row, column)) notify('Selection moved.', 'success')
  else notify('The selection cannot extend beyond 500 rows or columns.', 'error')
  placingSelection.value = false
}

function moveSelectionDirectly(row: number, column: number) {
  if (pattern.moveSelectionTo(row, column)) notify('Selection moved.', 'success')
  else notify('The selection cannot extend beyond 500 rows or columns.', 'error')
}

function handleKeyboardShortcuts(event: KeyboardEvent) {
  const target = event.target as HTMLElement | null
  if (target?.closest('input, textarea, select, [contenteditable="true"]')) return
  if (newModalOpen.value || clearModalOpen.value || importModalOpen.value || guideOpen.value) return
  if (event.key === 'Escape' && placingSelection.value) {
    placingSelection.value = false
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
  event.returnValue = 'Download a project backup with Save before leaving.'
}

let autosaveErrorNotified = false
watch(pattern.autosaveStatus, (status) => {
  if (status === 'error' && !autosaveErrorNotified) {
    autosaveErrorNotified = true
    notify('Local backup failed. Download the project to avoid losing changes.', 'error', 7000)
  }
})
watch(pattern.project, () => {
  downloadBackupNeeded.value = true
}, { deep: true })

onBeforeRouteLeave(() => {
  pattern.flushAutosave()
  if (!downloadBackupNeeded.value) return true
  return window.confirm('Your pattern is saved only in this browser. Leave without downloading a project file?')
})

onMounted(() => {
  window.addEventListener('keydown', handleKeyboardShortcuts)
  window.addEventListener('beforeunload', warnBeforeUnload)
  window.addEventListener('pagehide', pattern.flushAutosave)
  document.addEventListener('visibilitychange', flushHiddenProject)
  if (pattern.restoredAutosave.value) notify('Recovered your locally saved pattern.', 'success')
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
      :can-undo="pattern.canUndo.value"
      :can-redo="pattern.canRedo.value"
      :theme="theme"
      @new="newModalOpen = true"
      @open="fileInput?.click()"
      @save="saveProject"
      @print="printPattern"
      @undo="pattern.undo"
      @redo="pattern.redo"
      @theme="toggleTheme"
      @guide="guideOpen = true"
    />
    <input ref="fileInput" class="hidden" type="file" accept=".stitch-pattern,application/json" @change="selectFile" />

    <div class="min-w-0 p-3 sm:p-5">
      <main class="mx-auto max-w-[90rem] space-y-4">
        <section class="card border border-base-300 bg-base-100">
          <div class="card-body gap-3 p-3 sm:p-5">
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 class="text-xl font-bold">{{ pattern.project.value.name }}</h1>
                  <p class="text-sm text-base-content/65">Edit the complete pattern. Repeated copies update their source cells.</p>
                </div>
                <div class="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:items-end">
                  <div class="flex flex-wrap items-center gap-2 sm:justify-end">
                    <span class="badge badge-sm" :class="pattern.autosaveStatus.value === 'error' ? 'badge-error' : pattern.autosaveStatus.value === 'saving' ? 'badge-ghost' : 'badge-success badge-outline'">
                      <span class="mdi" :class="pattern.autosaveStatus.value === 'error' ? 'mdi-alert-circle-outline' : pattern.autosaveStatus.value === 'saving' ? 'mdi-loading mdi-spin' : 'mdi-content-save-check-outline'" aria-hidden="true"></span>
                      {{ pattern.autosaveStatus.value === 'error' ? 'Backup failed' : pattern.autosaveStatus.value === 'saving' ? 'Saving locally' : 'Saved locally' }}
                    </span>
                    <span class="badge badge-outline">{{ renderedPattern.cells[0].length }} columns shown</span>
                    <span class="badge badge-outline">{{ renderedPattern.cells.length }} rows shown</span>
                  </div>
                  <div class="flex flex-wrap items-center justify-between gap-2 sm:justify-end">
                    <label class="flex h-8 cursor-pointer items-center gap-2 rounded-lg border border-base-300 bg-base-200/60 px-2.5 text-xs">
                      <span :class="!printInColor ? 'font-semibold text-base-content' : 'text-base-content/55'">B&amp;W symbols</span>
                      <input v-model="printInColor" class="toggle toggle-primary toggle-xs" type="checkbox" aria-label="Print charts in color" />
                      <span :class="printInColor ? 'font-semibold text-base-content' : 'text-base-content/55'">Color</span>
                    </label>
                    <button class="btn btn-primary btn-sm" type="button" @click="printPattern">
                      <span class="mdi mdi-printer-outline text-base" aria-hidden="true"></span>
                      Print or Save as PDF
                    </button>
                  </div>
                </div>
              </div>
              <DrawingTools
                :tool="pattern.tool.value"
                :can-copy="pattern.hasSelection.value"
                :can-paste="pattern.hasClipboard.value && pattern.hasSelection.value"
                :placing-selection="placingSelection"
                :mirror-horizontal="pattern.mirrorHorizontal.value"
                :mirror-vertical="pattern.mirrorVertical.value"
                @select="selectTool"
                @copy="copySelection"
                @paste="pasteSelection"
                @move-selection="startMoveSelection"
                @mirror-horizontal="mirrorSelection('horizontal')"
                @mirror-vertical="mirrorSelection('vertical')"
                @toggle-mirror-horizontal="toggleMirror('horizontal')"
                @toggle-mirror-vertical="toggleMirror('vertical')"
                @cancel-placement="placingSelection = false"
                @clear="requestClear"
              >
                <template #settings>
                  <ColorMenu :color="pattern.selectedColor.value" :recent-colors="pattern.recentColors.value" @select="pattern.chooseColor($event)" @eyedropper="pattern.tool.value = 'eyedropper'" />
                  <GridMenu :cell-size="pattern.project.value.cellSize" @cell-size="pattern.project.value.cellSize = $event" />
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
              </DrawingTools>
              <PatternGrid
                :cells="renderedPattern.cells"
                :cell-source-rows="renderedPattern.sourceRows"
                :cell-source-columns="renderedPattern.sourceColumns"
                :row-headers="renderedPattern.rowHeaders"
                :column-headers="renderedPattern.columnHeaders"
                :row-copies="renderedPattern.rowCopies"
                :column-copies="renderedPattern.columnCopies"
                :repeat-flags="renderedPattern.repeatFlags"
                :source-rows="pattern.rowCount.value"
                :source-columns="pattern.columnCount.value"
                :cell-size="pattern.project.value.cellSize"
                :selected-row="pattern.selectedRow.value"
                :selected-column="pattern.selectedColumn.value"
                :selected-rows="pattern.selectedRows.value"
                :selected-columns="pattern.selectedColumns.value"
                :tool="pattern.tool.value"
                :selection="pattern.selection.value"
                :placing-selection="placingSelection"
                :mirror-horizontal="pattern.mirrorHorizontal.value"
                :mirror-vertical="pattern.mirrorVertical.value"
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
        </section>

        <PatternPreview
          v-model:stitch="pattern.project.value.previewStitch"
          :cells="renderedPattern.cells"
        />

      </main>
    </div>
  </div>

  <NewProjectModal :open="newModalOpen" @create="createProject" @cancel="newModalOpen = false" />
  <UserGuideModal :open="guideOpen" @close="guideOpen = false" />
  <ConfirmModal
    :open="clearModalOpen"
    title="Clear the grid?"
    message="All colored cells will return to the background color. You can undo this action."
    confirm-label="Clear grid"
    destructive
    @confirm="confirmClear"
    @cancel="clearModalOpen = false"
  />
  <ConfirmModal
    :open="importModalOpen"
    title="Replace the current project?"
    message="Opening this file will replace the pattern currently in the editor. Save it first if you want to keep it."
    confirm-label="Open project"
    @confirm="confirmImport"
    @cancel="cancelImport"
  />
  <NotificationToast :notifications="notifications" @dismiss="dismiss" />
  <PrintView :project="pattern.project.value" :mode="printMode" />
</template>
