<script setup lang="ts">
import { ref } from 'vue'
import TopNavbar from './components/TopNavbar.vue'
import SettingsPanel from './components/SettingsPanel.vue'
import DrawingTools from './components/DrawingTools.vue'
import PatternGrid from './components/PatternGrid.vue'
import PatternPreview from './components/PatternPreview.vue'
import NewProjectModal from './components/NewProjectModal.vue'
import ConfirmModal from './components/ConfirmModal.vue'
import NotificationToast from './components/NotificationToast.vue'
import PrintView from './components/PrintView.vue'
import { usePattern } from './composables/usePattern'
import { useTheme } from './composables/useTheme'
import { useNotifications } from './composables/useNotifications'
import { downloadProject, readProjectFile } from './composables/useProjectFiles'
import type { PatternProject } from './types/pattern'

const pattern = usePattern()
const { theme, toggleTheme } = useTheme()
const { notifications, notify, dismiss } = useNotifications()
const drawerOpen = ref(false)
const newModalOpen = ref(false)
const clearModalOpen = ref(false)
const importModalOpen = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const pendingImport = ref<PatternProject | null>(null)

function createProject(project: Omit<PatternProject, 'format' | 'version' | 'cells'>) {
  pattern.createProject(project)
  newModalOpen.value = false
  drawerOpen.value = false
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
  pendingImport.value = null
  importModalOpen.value = false
  drawerOpen.value = false
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
  pattern.selectedRow.value = row
  if (action === 'above') pattern.insertRow(row)
  if (action === 'below') pattern.insertRow(row + 1)
  if (action === 'multiple') pattern.insertMultipleRows(row + 1, count)
  if (action === 'delete') pattern.deleteSelectedRow()
  if (action === 'fill') pattern.fillRow(row, pattern.selectedColor.value)
  if (action === 'erase') pattern.eraseRow(row)
}

function handleColumnAction(action: 'before' | 'after' | 'multiple' | 'delete' | 'fill' | 'erase', column: number, count = 1) {
  pattern.selectedColumn.value = column
  if (action === 'before') pattern.insertColumn(column)
  if (action === 'after') pattern.insertColumn(column + 1)
  if (action === 'multiple') pattern.insertMultipleColumns(column + 1, count)
  if (action === 'delete') pattern.deleteSelectedColumn()
  if (action === 'fill') pattern.fillColumn(column, pattern.selectedColor.value)
  if (action === 'erase') pattern.eraseColumn(column)
}

function printPattern() {
  window.print()
}
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
      @menu="drawerOpen = true"
    />
    <input ref="fileInput" class="hidden" type="file" accept=".stitch-pattern,application/json" @change="selectFile" />

    <div class="drawer lg:drawer-open">
      <input id="editor-drawer" v-model="drawerOpen" type="checkbox" class="drawer-toggle" />
      <div class="drawer-content min-w-0 p-3 sm:p-5">
        <main class="mx-auto max-w-6xl space-y-4">
          <section class="card border border-base-300 bg-base-100">
            <div class="card-body gap-3 p-3 sm:p-5">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h1 class="text-xl font-bold">{{ pattern.project.value.name }}</h1>
                  <p class="text-sm text-base-content/65">Edit one repeat section. Select a cell to choose its row and column.</p>
                </div>
                <div class="flex gap-2">
                  <span class="badge badge-outline">{{ pattern.columnCount.value }} columns</span>
                  <span class="badge badge-outline">{{ pattern.rowCount.value }} rows</span>
                </div>
              </div>
              <DrawingTools :tool="pattern.tool.value" @select="pattern.tool.value = $event" @clear="requestClear" />
              <PatternGrid
                :cells="pattern.project.value.cells"
                :cell-size="pattern.project.value.cellSize"
                :selected-row="pattern.selectedRow.value"
                :selected-column="pattern.selectedColumn.value"
                :tool="pattern.tool.value"
                @stroke-start="beginStroke"
                @paint="pattern.paintCell"
                @stroke-end="endStroke"
                @select-row="pattern.selectedRow.value = $event"
                @row-action="handleRowAction"
                @select-column="pattern.selectedColumn.value = $event"
                @column-action="handleColumnAction"
              />
            </div>
          </section>

          <PatternPreview
            :cells="pattern.project.value.cells"
            :horizontal="pattern.project.value.horizontalRepeats"
            :vertical="pattern.project.value.verticalRepeats"
          />

          <div class="flex justify-end">
            <button class="btn btn-primary" type="button" @click="printPattern"><span class="mdi mdi-printer-outline text-lg" aria-hidden="true"></span>Print or Save as PDF</button>
          </div>
        </main>
      </div>

      <aside class="drawer-side z-40">
        <label for="editor-drawer" class="drawer-overlay" aria-label="Close editing tools"></label>
        <div class="min-h-full w-72 overflow-y-auto border-r border-base-300 bg-base-200 p-2 lg:w-72">
          <div class="mb-3 flex items-center justify-between lg:hidden">
            <h2 class="font-bold">Tools and settings</h2>
            <button class="btn btn-sm btn-ghost" type="button" @click="drawerOpen = false"><span class="mdi mdi-close" aria-hidden="true"></span>Close</button>
          </div>
          <SettingsPanel
            :color="pattern.selectedColor.value"
            :recent-colors="pattern.recentColors.value"
            :cell-size="pattern.project.value.cellSize"
            :horizontal="pattern.project.value.horizontalRepeats"
            :vertical="pattern.project.value.verticalRepeats"
            :selected-row="pattern.selectedRow.value"
            :row-count="pattern.rowCount.value"
            :selected-column="pattern.selectedColumn.value"
            :column-count="pattern.columnCount.value"
            @color="pattern.chooseColor($event)"
            @eyedropper="pattern.tool.value = 'eyedropper'"
            @cell-size="pattern.project.value.cellSize = $event"
            @horizontal="pattern.project.value.horizontalRepeats = $event"
            @vertical="pattern.project.value.verticalRepeats = $event"
            @row-before="pattern.insertRow(pattern.selectedRow.value)"
            @row-after="pattern.insertRow(pattern.selectedRow.value + 1)"
            @row-beginning="pattern.insertRow(0)"
            @row-end="pattern.insertRow(pattern.rowCount.value)"
            @row-remove="pattern.deleteSelectedRow"
            @column-before="pattern.insertColumn(pattern.selectedColumn.value)"
            @column-after="pattern.insertColumn(pattern.selectedColumn.value + 1)"
            @column-beginning="pattern.insertColumn(0)"
            @column-end="pattern.insertColumn(pattern.columnCount.value)"
            @column-remove="pattern.deleteSelectedColumn"
          />
        </div>
      </aside>
    </div>
  </div>

  <NewProjectModal :open="newModalOpen" @create="createProject" @cancel="newModalOpen = false" />
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
  <PrintView :project="pattern.project.value" />
</template>
