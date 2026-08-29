<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, toRaw, watch } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import TopNavbar from '../shell/components/TopNavbar.vue'
import PatternEditorWorkspace from '../features/editor/components/PatternEditorWorkspace.vue'
import { createPattern, type PatternState } from '../features/editor/composables/usePattern'
import { useEditorPreferences } from '../features/editor/composables/useEditorPreferences'
import { useEditorShortcuts } from '../features/editor/composables/useEditorShortcuts'
import TrackerWorkspace from '../features/tracker/components/TrackerWorkspace.vue'
import { useTracker, type TrackerController } from '../features/tracker/composables/useTracker'
import PrintView from '../features/export/components/PrintView.vue'
import WrittenInstructionsPrintView from '../features/export/components/WrittenInstructionsPrintView.vue'
import { usePatternExport } from '../features/export/composables/usePatternExport'
import { buildWrittenInstructions, defaultWrittenInstructionOrder } from '../features/export/domain/buildWrittenInstructions'
import ShareProjectModal from '../features/share/components/ShareProjectModal.vue'
import { decodeSharedProject, encodeSharedProject, MAX_SHARE_URL_LENGTH, validateSharedProject } from '../features/share/domain/patternShareCodec'
import { setPendingSharedProject } from '../features/share/domain/shareEditorHandoff'
import UserGuideModal from '../features/help/components/UserGuideModal.vue'
import ConfirmModal from '../shared/ui/ConfirmModal.vue'
import NotificationToast from '../shared/ui/NotificationToast.vue'
import { useTheme } from '../shared/composables/useTheme'
import { useNotifications } from '../shared/composables/useNotifications'
import { downloadProject } from '../features/projects/composables/useProjectFiles'
import type { PrintMode, WrittenInstructionFormat } from '../types/pattern'
import type { StitchProject } from '../types/tracker'
import { localizedErrorMessage } from '../utils/appError'
import { renderGrid } from '../utils/grid'
import { completeTrackerSession, reconcileTracker } from '../utils/tracker'

const DRAFT_KEY_PREFIX = 'stitch-share-draft:'
const DRAFT_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const route = useRoute()
const router = useRouter()
const { t } = useI18n({ useScope: 'global' })
const { theme, toggleTheme } = useTheme()
const { notifications, notify, dismiss } = useNotifications()
const shareStorage = sessionStorage
const { canvasFullHeight, canvasSymbols, includeAnnotations } = useEditorPreferences(shareStorage)
const status = ref<'loading' | 'ready' | 'error'>('loading')
const errorMessage = ref('')
const pattern = shallowRef<PatternState | null>(null)
const tracker = shallowRef<TrackerController | null>(null)
const workspace = ref<'editor' | 'tracker'>('editor')
const dirty = ref(false)
const guideOpen = ref(false)
const clearModalOpen = ref(false)
const openChoiceOpen = ref(false)
const shareOpen = ref(false)
const shareProject = ref<StitchProject | null>(null)
const printMode = ref<PrintMode>('color')
const printTarget = ref<'chart' | 'instructions'>('chart')
const editorWorkspace = ref<InstanceType<typeof PatternEditorWorkspace> | null>(null)
let allowNavigation = false
let stopDirtyWatch: (() => void) | null = null

const renderedPattern = computed(() => {
  const project = pattern.value!.project.value
  return renderGrid(project.cells, project.horizontalRepeats, project.verticalRepeats, project.repeatBoxes, project.rowIds, project.columnIds)
})
const writtenInstructions = computed(() => buildWrittenInstructions(
  pattern.value!.project.value,
  renderedPattern.value,
  pattern.value!.tracker.value?.progress ?? defaultWrittenInstructionOrder,
))
const modalOpen = computed(() => openChoiceOpen.value || clearModalOpen.value || guideOpen.value || shareOpen.value)

function localizeError(error: unknown, fallback: string) {
  return localizedErrorMessage(error, t) ?? t(fallback)
}

function snapshotProject() {
  const current = pattern.value!
  const sharedTracker = current.tracker.value ? structuredClone(toRaw(current.tracker.value)) : undefined
  if (sharedTracker) completeTrackerSession(sharedTracker, sharedTracker.progress.completedCells)
  return validateSharedProject({
    format: 'stitch-project',
    version: 1,
    pattern: structuredClone(toRaw(current.project.value)),
    ...(sharedTracker ? { tracker: sharedTracker } : {}),
  })
}

function openShare() {
  editorWorkspace.value?.prepareSave()
  try {
    shareProject.value = snapshotProject()
    shareOpen.value = true
  } catch (error) {
    notify(localizeError(error, 'share.errors.prepare'), 'error')
  }
}

function saveProject() {
  editorWorkspace.value?.prepareSave()
  try {
    pattern.value!.flushAutosave()
    downloadProject(snapshotProject())
    dirty.value = pattern.value!.tracker.value?.timer.startedAt != null
    notify(t('editor.notifications.projectSaved'), 'success')
  } catch (error) {
    notify(localizeError(error, 'editor.errors.saveFailed'), 'error')
  }
}

function requestClear() {
  if (!pattern.value!.hasColoredCells.value) {
    notify(t('editor.notifications.gridAlreadyClear'), 'info')
    return
  }
  clearModalOpen.value = true
}

function confirmClear() {
  pattern.value!.clearGrid()
  clearModalOpen.value = false
  notify(t('editor.notifications.gridCleared'), 'success')
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
  project: () => pattern.value!.project.value,
  renderedPattern,
  writtenInstructions,
  includeAnnotations,
  onPngSuccess: () => notify(t('editor.notifications.pngDownloaded'), 'success'),
  onPngError: () => notify(t('editor.errors.pngFailed'), 'error'),
  onInstructionsSuccess: () => notify(t('editor.notifications.instructionsDownloaded'), 'success'),
  onInstructionsError: () => notify(t('editor.errors.instructionsFailed'), 'error'),
})

async function openEditorCopy() {
  editorWorkspace.value?.prepareSave()
  try {
    setPendingSharedProject(snapshotProject())
    allowNavigation = true
    await router.push({ name: 'editor' })
  } catch (error) {
    notify(localizeError(error, 'share.errors.openEditor'), 'error')
  }
}

async function openNewTab() {
  editorWorkspace.value?.prepareSave()
  try {
    const encoded = await encodeSharedProject(snapshotProject())
    const href = router.resolve({ name: 'share', query: { data: encoded.token } }).href
    const url = new URL(href, window.location.href).href
    if (url.length > MAX_SHARE_URL_LENGTH) {
      openShare()
      notify(t('share.notifications.newTabFileFallback'), 'warning')
      return
    }
    const link = document.createElement('a')
    link.href = url
    link.target = '_blank'
    link.rel = 'noopener'
    link.click()
  } catch (error) {
    const key = error instanceof Error && error.name === 'AppError' ? error.message : ''
    if (key === 'errors.share.compressedTooLarge' || key === 'errors.share.decompressedTooLarge' || key === 'errors.share.linkTooLong') {
      openShare()
      notify(t('share.notifications.newTabFileFallback'), 'warning')
      return
    }
    notify(localizeError(error, 'share.errors.openNewTab'), 'error')
  }
}

function flushDraft() {
  pattern.value?.flushAutosave()
}

function flushHiddenDraft() {
  if (document.visibilityState === 'hidden') flushDraft()
}

function warnBeforeUnload(event: BeforeUnloadEvent) {
  flushDraft()
  if (!dirty.value) return
  event.preventDefault()
  event.returnValue = t('share.confirmLeave')
}

function readDraft(key: string) {
  try {
    const value = sessionStorage.getItem(key)
    return value ? validateSharedProject(JSON.parse(value)) : null
  } catch {
    return null
  }
}

async function initialize() {
  const token = typeof route.query.data === 'string' ? route.query.data : ''
  if (!token) {
    errorMessage.value = t('errors.share.missing')
    status.value = 'error'
    return
  }
  try {
    const requestedDraft = typeof route.query.draft === 'string' && DRAFT_ID_PATTERN.test(route.query.draft) ? route.query.draft : null
    const draftId = requestedDraft ?? crypto.randomUUID()
    const autosaveKey = `${DRAFT_KEY_PREFIX}${draftId}`
    const restored = readDraft(autosaveKey)
    const document = restored ?? await decodeSharedProject(token)
    if (!requestedDraft) await router.replace({ name: 'share', query: { data: token, draft: draftId } })
    const state = createPattern(document, {
      autosaveKey,
      autosaveStorage: sessionStorage,
      preferenceStorage: sessionStorage,
      recovered: Boolean(restored),
    })
    pattern.value = state
    tracker.value = useTracker(state.project, state.tracker, state.scheduleAutosave)
    stopDirtyWatch = watch([state.project, state.tracker], () => { dirty.value = true }, { deep: true })
    status.value = 'ready'
    openChoiceOpen.value = !restored
  } catch (error) {
    errorMessage.value = localizeError(error, 'share.errors.invalid')
    status.value = 'error'
  }
}

useEditorShortcuts({
  blocked: modalOpen,
  editorActive: () => status.value === 'ready' && workspace.value === 'editor',
  onSave: saveProject,
  onEditorKey: event => editorWorkspace.value?.handleKeyboardShortcut(event),
})

watch(() => pattern.value ? renderedPattern.value : null, (current, previous) => {
  if (pattern.value && previous && current) reconcileTracker(pattern.value.tracker.value, previous, current)
})

onBeforeRouteLeave(() => {
  flushDraft()
  if (allowNavigation || !dirty.value) return true
  return window.confirm(t('share.confirmLeave'))
})

onMounted(() => {
  window.addEventListener('beforeunload', warnBeforeUnload)
  window.addEventListener('afterprint', restoreChartPrintTarget)
  window.addEventListener('pagehide', flushDraft)
  document.addEventListener('visibilitychange', flushHiddenDraft)
  void initialize()
})

onBeforeUnmount(() => {
  flushDraft()
  stopDirtyWatch?.()
  pattern.value?.dispose()
  window.removeEventListener('beforeunload', warnBeforeUnload)
  window.removeEventListener('afterprint', restoreChartPrintTarget)
  window.removeEventListener('pagehide', flushDraft)
  document.removeEventListener('visibilitychange', flushHiddenDraft)
})
</script>

<template>
  <div class="screen-only min-h-screen bg-base-200 text-base-content">
    <TopNavbar
      :theme="theme"
      :include-annotations="includeAnnotations"
      :actions-available="status === 'ready'"
      shared
      @update:include-annotations="includeAnnotations = $event"
      @save="saveProject"
      @share="openShare"
      @png="downloadCanvasPng"
      @print="printPattern"
      @instructions="exportWrittenInstructions"
      @theme="toggleTheme"
      @guide="guideOpen = true"
    />

    <div
      v-if="status === 'loading'"
      class="grid min-h-[70vh] place-items-center p-6"
      role="status"
    >
      <div class="text-center">
        <span class="loading loading-spinner loading-lg text-primary-content" />
        <p class="mt-3 font-medium">
          {{ t('share.loading') }}
        </p>
      </div>
    </div>

    <main
      v-else-if="status === 'error'"
      class="app-page mx-auto max-w-2xl py-12"
    >
      <section class="card border border-error/40 bg-base-100">
        <div class="card-body">
          <span
            class="mdi mdi-link-variant-off text-4xl text-error"
            aria-hidden="true"
          />
          <h1 class="card-title">
            {{ t('share.invalidTitle') }}
          </h1>
          <p>{{ errorMessage }}</p>
          <div class="card-actions mt-2">
            <RouterLink
              class="btn btn-primary"
              :to="{ name: 'editor' }"
            >
              {{ t('share.returnEditor') }}
            </RouterLink>
          </div>
        </div>
      </section>
    </main>

    <template v-else-if="pattern && tracker">
      <aside
        class="border-b border-info/30 bg-info/10 px-3 py-3 sm:px-5"
        aria-label="Shared project"
      >
        <div class="mx-auto flex max-w-360 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p class="font-semibold">
              {{ t('share.editingCopy') }}
            </p>
            <p class="text-sm text-base-content/70">
              {{ t('share.temporaryAutosave') }}
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <button
              class="btn btn-outline btn-sm"
              type="button"
              @click="openNewTab"
            >
              <span
                class="mdi mdi-open-in-new"
                aria-hidden="true"
              />{{ t('share.editNewTab') }}
            </button>
            <button
              class="btn btn-primary btn-sm"
              type="button"
              @click="openEditorCopy"
            >
              <span
                class="mdi mdi-file-import-outline"
                aria-hidden="true"
              />{{ t('share.addToEditor') }}
            </button>
          </div>
        </div>
      </aside>

      <div
        id="project-workspace"
        class="app-page min-w-0"
      >
        <main class="app-page-stack mx-auto max-w-360">
          <PatternEditorWorkspace
            v-if="workspace === 'editor'"
            ref="editorWorkspace"
            :pattern="pattern"
            :rendered-pattern="renderedPattern"
            :download-backup-needed="dirty"
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
            :pattern="pattern"
            :state="tracker"
            :include-annotations="includeAnnotations"
            :preference-storage="shareStorage"
            @update:include-annotations="includeAnnotations = $event"
            @close="workspace = 'editor'"
            @save="saveProject"
            @png="downloadCanvasPng"
            @print="printPattern"
            @instructions="exportWrittenInstructions"
          />
        </main>
      </div>
    </template>
  </div>

  <UserGuideModal
    :open="guideOpen"
    @close="guideOpen = false"
  />
  <ConfirmModal
    :open="openChoiceOpen"
    :title="t('share.openChoiceTitle')"
    :message="t('share.openChoiceMessage', { name: pattern?.project.value.name ?? '' })"
    :confirm-label="t('share.openInEditor')"
    :cancel-label="t('share.editTemporary')"
    :close-on-backdrop="false"
    @confirm="openEditorCopy"
    @cancel="openChoiceOpen = false"
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
  <ShareProjectModal
    :open="shareOpen"
    :project="shareProject"
    @close="shareOpen = false"
    @copied="notify(t('share.notifications.copied'), 'success')"
    @shared="notify(t('share.notifications.shared'), 'success')"
    @downloaded="notify(t('share.notifications.fileDownloaded'), 'success')"
    @error="notify($event, 'error')"
  />
  <NotificationToast
    :notifications="notifications"
    @dismiss="dismiss"
  />
  <PrintView
    v-if="status === 'ready' && pattern && printTarget === 'chart'"
    :project="pattern.project.value"
    :mode="printMode"
    :include-annotations="includeAnnotations"
  />
  <WrittenInstructionsPrintView
    v-else-if="status === 'ready' && printTarget === 'instructions'"
    :document="writtenInstructions"
  />
</template>
