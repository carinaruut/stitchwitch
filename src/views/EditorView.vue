<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, toRaw, watch } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { useI18n } from 'vue-i18n'
import TopNavbar from '../shell/components/TopNavbar.vue'
import PatternEditorWorkspace from '../features/editor/components/PatternEditorWorkspace.vue'
import { useEditorPreferences } from '../features/editor/composables/useEditorPreferences'
import { useEditorShortcuts } from '../features/editor/composables/useEditorShortcuts'
import TrackerWorkspace from '../features/tracker/components/TrackerWorkspace.vue'
import ProjectTabs from '../features/projects/components/ProjectTabs.vue'
import NewProjectModal from '../features/projects/components/NewProjectModal.vue'
import NewTabModal from '../features/projects/components/NewTabModal.vue'
import PrintView from '../features/export/components/PrintView.vue'
import WrittenInstructionsPrintView from '../features/export/components/WrittenInstructionsPrintView.vue'
import { usePatternExport } from '../features/export/composables/usePatternExport'
import { buildWrittenInstructions, defaultWrittenInstructionOrder } from '../features/export/domain/buildWrittenInstructions'
import UserGuideModal from '../features/help/components/UserGuideModal.vue'
import ConfirmModal from '../shared/ui/ConfirmModal.vue'
import NotificationToast from '../shared/ui/NotificationToast.vue'
import { activePatternProxy, useProjects } from '../features/projects/composables/useProjects'
import { useTheme } from '../shared/composables/useTheme'
import { useNotifications } from '../shared/composables/useNotifications'
import { downloadProject, readProjectFile } from '../features/projects/composables/useProjectFiles'
import type { NewPatternProject, PrintMode, WrittenInstructionFormat } from '../types/pattern'
import { localizedErrorMessage } from '../utils/appError'
import { renderGrid } from '../utils/grid'
import { completeTrackerSession, reconcileTracker } from '../utils/tracker'

const projects = useProjects()
const pattern = activePatternProxy(projects)
const { t } = useI18n({ useScope: 'global' })
const { theme, toggleTheme } = useTheme()
const { notifications, notify, dismiss } = useNotifications()
const { canvasFullHeight, canvasSymbols, includeAnnotations } = useEditorPreferences()
const newModalOpen = ref(false)
const newTabModalOpen = ref(false)
const clearModalOpen = ref(false)
const guideOpen = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const pendingCloseId = ref<string | null>(null)
const printMode = ref<PrintMode>('color')
const printTarget = ref<'chart' | 'instructions'>('chart')
const editorWorkspace = ref<InstanceType<typeof PatternEditorWorkspace> | null>(null)
const workspace = computed({
  get: () => projects.activeSession.value.workspace.value,
  set: (value: 'editor' | 'tracker') => { projects.activeSession.value.workspace.value = value },
})
const downloadBackupNeeded = computed({
  get: () => projects.activeSession.value.downloadBackupNeeded.value,
  set: (value: boolean) => { projects.activeSession.value.downloadBackupNeeded.value = value },
})
const closingProjectName = computed(() => projects.sessions.value.find(session => session.id === pendingCloseId.value)?.pattern.project.value.name ?? '')
const renderedPattern = computed(() => renderGrid(
  pattern.project.value.cells,
  pattern.project.value.horizontalRepeats,
  pattern.project.value.verticalRepeats,
  pattern.project.value.repeatBoxes,
  pattern.project.value.rowIds,
  pattern.project.value.columnIds,
))
const writtenInstructions = computed(() => buildWrittenInstructions(
  pattern.project.value,
  renderedPattern.value,
  pattern.tracker.value?.progress ?? defaultWrittenInstructionOrder,
))

function localizeProjectError(error: unknown, fallbackKey: string) {
  return localizedErrorMessage(error, t) ?? t(fallbackKey)
}

function createProject(project: NewPatternProject) {
  projects.createProject(project)
  newModalOpen.value = false
  notify(t('editor.notifications.patternCreated'), 'success')
}

function chooseNewProject() {
  newTabModalOpen.value = false
  newModalOpen.value = true
}

async function chooseProjectFile() {
  newTabModalOpen.value = false
  await nextTick()
  fileInput.value?.click()
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
    const tracker = pattern.tracker.value
    const downloadedTracker = tracker ? structuredClone(toRaw(tracker)) : undefined
    if (downloadedTracker) completeTrackerSession(downloadedTracker, downloadedTracker.progress.completedCells)
    downloadProject({
      format: 'stitch-project',
      version: 1,
      pattern: pattern.project.value,
      ...(downloadedTracker ? { tracker: downloadedTracker } : {}),
    })
    downloadBackupNeeded.value = tracker?.timer.startedAt != null
    void nextTick(() => { downloadBackupNeeded.value = tracker?.timer.startedAt != null })
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
    projects.openProject(await readProjectFile(file))
    notify(t('editor.notifications.projectImported'), 'success')
  } catch (error) {
    notify(localizeProjectError(error, 'editor.errors.invalidProjectFile'), 'error', 6000)
  }
}

function requestCloseProject(id: string) {
  const session = projects.sessions.value.find(candidate => candidate.id === id)
  if (!session) return
  if (session.downloadBackupNeeded.value) pendingCloseId.value = id
  else projects.closeProject(id)
}

function confirmCloseProject() {
  if (pendingCloseId.value) projects.closeProject(pendingCloseId.value)
  pendingCloseId.value = null
}

async function printPattern(mode: PrintMode = printMode.value) {
  printTarget.value = 'chart'
  printMode.value = mode
  await nextTick()
  window.print()
}

async function exportWrittenInstructions(format: WrittenInstructionFormat) {
  if (format === 'text') {
    downloadWrittenInstructions()
    return
  }
  printTarget.value = 'instructions'
  await nextTick()
  window.print()
}

function restoreChartPrintTarget() {
  printTarget.value = 'chart'
}

const { downloadCanvasPng, downloadWrittenInstructions } = usePatternExport({
  project: () => pattern.project.value,
  renderedPattern,
  writtenInstructions,
  includeAnnotations,
  onPngSuccess: () => notify(t('editor.notifications.pngDownloaded'), 'success'),
  onPngError: () => notify(t('editor.errors.pngFailed'), 'error'),
  onInstructionsSuccess: () => notify(t('editor.notifications.instructionsDownloaded'), 'success'),
  onInstructionsError: () => notify(t('editor.errors.instructionsFailed'), 'error'),
})

const modalOpen = computed(() => newModalOpen.value || newTabModalOpen.value || clearModalOpen.value || pendingCloseId.value !== null || guideOpen.value)
useEditorShortcuts({
  blocked: modalOpen,
  editorActive: () => workspace.value === 'editor',
  onSave: () => {
    editorWorkspace.value?.prepareSave()
    saveProject()
  },
  onEditorKey: event => editorWorkspace.value?.handleKeyboardShortcut(event),
})

function flushHiddenProject() {
  if (document.visibilityState === 'hidden') projects.flushAll()
}

function warnBeforeUnload(event: BeforeUnloadEvent) {
  projects.flushAll()
  if (!projects.sessions.value.some(session => session.downloadBackupNeeded.value)) return
  event.preventDefault()
  event.returnValue = t('editor.confirmations.beforeUnload')
}

let autosaveErrorNotified = false
watch(() => pattern.autosaveStatus.value, status => {
  if (status === 'error' && !autosaveErrorNotified) {
    autosaveErrorNotified = true
    notify(t('editor.notifications.backupFailed'), 'error', 7000)
  }
})
watch(() => projects.activeProjectId.value, async () => {
  await nextTick()
  editorWorkspace.value?.resetInteraction()
})
watch([() => projects.activeProjectId.value, renderedPattern], ([projectId, current], [previousProjectId, previous]) => {
  if (projectId === previousProjectId && previous) reconcileTracker(pattern.tracker.value, previous, current)
})

onBeforeRouteLeave(() => {
  projects.flushAll()
  if (!projects.sessions.value.some(session => session.downloadBackupNeeded.value)) return true
  return window.confirm(t('editor.confirmations.leavePage'))
})

onMounted(() => {
  window.addEventListener('beforeunload', warnBeforeUnload)
  window.addEventListener('afterprint', restoreChartPrintTarget)
  window.addEventListener('pagehide', projects.flushAll)
  document.addEventListener('visibilitychange', flushHiddenProject)
  if (projects.restoredCount > 0) notify(t('editor.notifications.patternRecovered'), 'success')
})
onBeforeUnmount(() => {
  projects.flushAll()
  window.removeEventListener('beforeunload', warnBeforeUnload)
  window.removeEventListener('afterprint', restoreChartPrintTarget)
  window.removeEventListener('pagehide', projects.flushAll)
  document.removeEventListener('visibilitychange', flushHiddenProject)
})
</script>

<template>
  <div class="screen-only min-h-screen bg-base-200 text-base-content">
    <TopNavbar
      :theme="theme"
      :include-annotations="includeAnnotations"
      @update:include-annotations="includeAnnotations = $event"
      @new="newTabModalOpen = true"
      @open="fileInput?.click()"
      @save="saveProject"
      @png="downloadCanvasPng"
      @print="printPattern"
      @instructions="exportWrittenInstructions"
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

    <ProjectTabs
      :sessions="projects.sessions.value"
      :active-project-id="projects.activeProjectId.value"
      @activate="projects.activate"
      @close="requestCloseProject"
      @create="newTabModalOpen = true"
    />

    <div
      id="project-workspace"
      class="app-page min-w-0"
      role="tabpanel"
      :aria-labelledby="`project-tab-${projects.activeProjectId.value}`"
    >
      <main class="app-page-stack mx-auto max-w-360">
        <PatternEditorWorkspace
          v-if="workspace === 'editor'"
          ref="editorWorkspace"
          :pattern="pattern"
          :rendered-pattern="renderedPattern"
          :download-backup-needed="downloadBackupNeeded"
          :canvas-full-height="canvasFullHeight"
          :canvas-symbols="canvasSymbols"
          :include-annotations="includeAnnotations"
          @clear="requestClear"
          @switch-workspace="workspace = 'tracker'"
          @save="saveProject"
          @png="downloadCanvasPng"
          @print="printPattern"
          @instructions="exportWrittenInstructions"
          @notify="notify"
          @update:canvas-full-height="canvasFullHeight = $event"
          @update:canvas-symbols="canvasSymbols = $event"
          @update:include-annotations="includeAnnotations = $event"
        />

        <TrackerWorkspace
          v-else
          :key="projects.activeProjectId.value"
          :pattern="projects.activeSession.value.pattern"
          :state="projects.activeSession.value.tracker"
          :include-annotations="includeAnnotations"
          @update:include-annotations="includeAnnotations = $event"
          @close="workspace = 'editor'"
          @save="saveProject"
          @png="downloadCanvasPng"
          @print="printPattern"
          @instructions="exportWrittenInstructions"
        />
      </main>
    </div>
  </div>

  <NewProjectModal
    :open="newModalOpen"
    @create="createProject"
    @cancel="newModalOpen = false"
  />
  <NewTabModal
    :open="newTabModalOpen"
    @create="chooseNewProject"
    @load="chooseProjectFile"
    @cancel="newTabModalOpen = false"
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
    :open="pendingCloseId !== null"
    :title="t('editor.confirmations.closeProjectTitle')"
    :message="t('editor.confirmations.closeProjectMessage', { name: closingProjectName })"
    :confirm-label="t('editor.confirmations.closeProjectConfirm')"
    destructive
    @confirm="confirmCloseProject"
    @cancel="pendingCloseId = null"
  />
  <NotificationToast
    :notifications="notifications"
    @dismiss="dismiss"
  />
  <PrintView
    v-if="printTarget === 'chart'"
    :project="pattern.project.value"
    :mode="printMode"
    :include-annotations="includeAnnotations"
  />
  <WrittenInstructionsPrintView
    v-else
    :document="writtenInstructions"
  />
</template>
