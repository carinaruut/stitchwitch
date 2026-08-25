<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { onBeforeRouteLeave, RouterLink } from 'vue-router'
import LanguageSwitcher from '../components/LanguageSwitcher.vue'
import ThemeToggle from '../components/ThemeToggle.vue'
import ColorLegend from '../components/ColorLegend.vue'
import TrackerGrid from '../components/TrackerGrid.vue'
import AppDropdown from '../components/AppDropdown.vue'
import { useNotifications } from '../composables/useNotifications'
import { useTheme } from '../composables/useTheme'
import { useTracker } from '../composables/useTracker'
import { downloadTracker, readTrackerInput } from '../composables/useTrackerFiles'
import type { PatternDisplay, PatternProject } from '../types/pattern'
import type { TrackerCompletionMode, TrackerDirection, TrackerPreferences, TrackerProject, TrackerStartRow } from '../types/tracker'
import { localizedErrorMessage } from '../utils/appError'
import { colorSymbolMap } from '../utils/colors'
import { renderGrid } from '../utils/grid'
import { isStitchCompleted, MAX_TRACKER_STITCHES, renderedDimensions, trackerElapsedMilliseconds } from '../utils/tracker'
import { orderedColorCounts } from '../utils/palette'

const TRACKER_PREFERENCES_KEY = 'stitch-tracker-preferences'

function readTrackerPreferences(): Partial<TrackerPreferences> {
  try {
    const value = JSON.parse(localStorage.getItem(TRACKER_PREFERENCES_KEY) ?? 'null') as Partial<TrackerPreferences> | null
    if (!value || typeof value !== 'object') return {}
    return {
      display: value.display === 'canvas' || value.display === 'knit' || value.display === 'cross-stitch' || value.display === 'single-crochet' ? value.display : undefined,
      cellSize: Number.isInteger(value.cellSize) && value.cellSize! >= 16 && value.cellSize! <= 48 ? value.cellSize : undefined,
      autoScroll: typeof value.autoScroll === 'boolean' ? value.autoScroll : undefined,
      keepAwake: typeof value.keepAwake === 'boolean' ? value.keepAwake : undefined,
      showSymbols: typeof value.showSymbols === 'boolean' ? value.showSymbols : undefined,
      showAnnotations: typeof value.showAnnotations === 'boolean' ? value.showAnnotations : undefined,
    }
  } catch {
    return {}
  }
}

const state = useTracker()
const { d, n, t } = useI18n({ useScope: 'global' })
const { theme, toggleTheme } = useTheme()
const { notifications, notify, dismiss } = useNotifications()
const browserPreferences = readTrackerPreferences()
const savedPreferences = state.tracker.value?.preferences ?? browserPreferences
const fileInput = ref<HTMLInputElement | null>(null)
const trackerGrid = ref<{ enterFullscreen: () => Promise<void>; exitFullscreen: () => Promise<void> } | null>(null)
const pendingInput = ref<{ tracker?: TrackerProject; pattern?: PatternProject } | null>(null)
const replaceModalOpen = ref(false)
const resetModalOpen = ref(false)
const clearModalOpen = ref(false)
const cellSize = ref(savedPreferences.cellSize ?? Math.min(40, Math.max(18, state.tracker.value?.pattern.cellSize ?? 24)))
const display = ref<PatternDisplay>(savedPreferences.display ?? 'canvas')
const autoScroll = ref(savedPreferences.autoScroll ?? true)
const keepAwake = ref(savedPreferences.keepAwake ?? false)
const showSymbols = ref(savedPreferences.showSymbols ?? false)
const showAnnotations = ref(savedPreferences.showAnnotations ?? true)
const addingComment = ref(false)
const wakeLockSupported = typeof navigator !== 'undefined' && 'wakeLock' in navigator
const fullscreenSupported = typeof document !== 'undefined' && document.fullscreenEnabled
const trackerFullscreen = ref(false)
const focusedColor = ref<string | null>(null)
const timerNow = ref(Date.now())
let wakeLock: WakeLockSentinel | null = null
let wakeLockRequestPending = false
let hasCellSizePreference = state.tracker.value?.preferences?.cellSize !== undefined || browserPreferences.cellSize !== undefined
let timerFrame: number | null = null

const dimensions = computed(() => state.tracker.value ? renderedDimensions(state.tracker.value.pattern) : null)
const tooLarge = computed(() => dimensions.value ? dimensions.value.rows * dimensions.value.columns > MAX_TRACKER_STITCHES : false)
const renderedPattern = computed(() => {
  if (!state.tracker.value || tooLarge.value) return null
  const pattern = state.tracker.value.pattern
  return renderGrid(pattern.cells, pattern.horizontalRepeats, pattern.verticalRepeats, pattern.repeatBoxes)
})
const trackerSymbolMap = computed(() => showSymbols.value && renderedPattern.value && state.tracker.value
  ? colorSymbolMap(orderedColorCounts(renderedPattern.value.cells, state.paletteEntries.value).map((entry) => entry.color), state.paletteEntries.value)
  : undefined)
const completedColorCounts = computed(() => {
  const pattern = renderedPattern.value
  const progress = state.tracker.value?.progress
  if (!pattern || !progress) return {}
  const counts: Record<string, number> = {}
  const rows = pattern.cells.length
  const columns = pattern.cells[0].length
  pattern.cells.forEach((row, rowIndex) => row.forEach((color, columnIndex) => {
    if (!isStitchCompleted(rowIndex, columnIndex, rows, columns, progress)) return
    counts[color] = (counts[color] ?? 0) + 1
  }))
  return counts
})
const percentage = computed(() => state.totalCount.value === 0 ? 0 : Math.round((state.completedCount.value / state.totalCount.value) * 100))
const timerRunning = computed(() => state.tracker.value?.timer.startedAt != null)
const elapsedMilliseconds = computed(() => state.tracker.value ? trackerElapsedMilliseconds(state.tracker.value.timer, timerNow.value) : 0)
const formattedTime = computed(() => {
  const milliseconds = Math.max(0, Math.floor(elapsedMilliseconds.value))
  const hours = Math.floor(milliseconds / 3_600_000)
  const minutes = Math.floor(milliseconds / 60_000) % 60
  const seconds = Math.floor(milliseconds / 1_000) % 60
  const centiseconds = Math.floor(milliseconds / 10) % 100
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`
})
const alertClasses = {
  success: 'alert-success',
  error: 'alert-error',
  info: 'alert-info',
  warning: 'alert-warning',
} as const

const confirmation = computed(() => {
  if (replaceModalOpen.value) return { title: t('tracker.confirm.replace.title'), message: t('tracker.confirm.replace.message'), label: t('tracker.confirm.replace.action') }
  if (resetModalOpen.value) return { title: t('tracker.confirm.reset.title'), message: t('tracker.confirm.reset.message'), label: t('tracker.confirm.reset.action') }
  if (clearModalOpen.value) return { title: t('tracker.confirm.close.title'), message: t('tracker.confirm.close.message'), label: t('tracker.confirm.close.action') }
  return null
})

function localizedFileError(error: unknown, fallback = 'open') {
  return localizedErrorMessage(error, t) ?? t(`tracker.errors.${fallback}`)
}

async function selectFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  try {
    const result = await readTrackerInput(file)
    if (state.tracker.value && state.backupNeeded.value) {
      pendingInput.value = result
      replaceModalOpen.value = true
    } else {
      applyInput(result)
    }
  } catch (error) {
    notify(localizedFileError(error), 'error', 7000)
  }
}

function applyInput(input: { tracker?: TrackerProject; pattern?: PatternProject }) {
  focusedColor.value = null
  addingComment.value = false
  if (!hasCellSizePreference) {
    const pattern = input.tracker?.pattern ?? input.pattern
    if (pattern) cellSize.value = Math.min(40, Math.max(18, pattern.cellSize))
  }
  const preferences = { display: display.value, cellSize: cellSize.value, autoScroll: autoScroll.value, keepAwake: keepAwake.value, showSymbols: showSymbols.value, showAnnotations: showAnnotations.value }
  if (input.tracker) {
    state.openTracker(input.tracker, preferences)
    const trackerPreferences = state.tracker.value?.preferences
    if (trackerPreferences) {
      display.value = trackerPreferences.display
      cellSize.value = trackerPreferences.cellSize
      autoScroll.value = trackerPreferences.autoScroll
      keepAwake.value = trackerPreferences.keepAwake
      showSymbols.value = trackerPreferences.showSymbols
      showAnnotations.value = trackerPreferences.showAnnotations
      if (keepAwake.value) void requestWakeLock()
      else releaseWakeLock()
    }
  } else if (input.pattern) {
    state.openPattern(input.pattern, preferences)
  }
  pendingInput.value = null
  replaceModalOpen.value = false
  notify(input.tracker ? t('tracker.notifications.trackerOpened') : t('tracker.notifications.designOpened'), 'success')
}

function cancelReplacement() {
  pendingInput.value = null
  replaceModalOpen.value = false
}

function saveTracker() {
  if (!state.tracker.value) return
  try {
    downloadTracker(state.downloadSnapshot())
    state.markDownloaded()
    notify(t('tracker.notifications.saved'), 'success')
  } catch (error) {
    notify(localizedFileError(error, 'save'), 'error')
  }
}

function updateTimer() {
  timerNow.value = Date.now()
  timerFrame = requestAnimationFrame(updateTimer)
}

watch(timerRunning, (running) => {
  if (timerFrame !== null) cancelAnimationFrame(timerFrame)
  timerFrame = null
  timerNow.value = Date.now()
  if (running) timerFrame = requestAnimationFrame(updateTimer)
}, { immediate: true })

function changeStartRow(event: Event) {
  if (!state.tracker.value) return
  state.setOrder((event.target as HTMLSelectElement).value as TrackerStartRow, state.tracker.value.progress.firstRowDirection, state.tracker.value.progress.alternateRows)
}

function changeDirection(event: Event) {
  if (!state.tracker.value) return
  state.setOrder(state.tracker.value.progress.startRow, (event.target as HTMLSelectElement).value as TrackerDirection, state.tracker.value.progress.alternateRows)
}

function changeAlternation(event: Event) {
  if (!state.tracker.value) return
  state.setOrder(state.tracker.value.progress.startRow, state.tracker.value.progress.firstRowDirection, (event.target as HTMLInputElement).checked)
}

function changeCompletionMode(event: Event) {
  state.setCompletionMode((event.target as HTMLSelectElement).value as TrackerCompletionMode)
}

async function requestWakeLock() {
  if (!wakeLockSupported || !keepAwake.value || document.visibilityState !== 'visible' || wakeLock || wakeLockRequestPending) return
  wakeLockRequestPending = true
  try {
    const sentinel = await navigator.wakeLock.request('screen')
    if (!keepAwake.value) {
      await sentinel.release()
      return
    }
    wakeLock = sentinel
    sentinel.addEventListener('release', () => {
      if (wakeLock === sentinel) wakeLock = null
    }, { once: true })
  } catch {
    keepAwake.value = false
    notify(t('tracker.notifications.keepAwakeFailed'), 'error')
  } finally {
    wakeLockRequestPending = false
  }
}

function releaseWakeLock() {
  const sentinel = wakeLock
  wakeLock = null
  if (sentinel && !sentinel.released) void sentinel.release()
}

function changeKeepAwake(event: Event) {
  keepAwake.value = (event.target as HTMLInputElement).checked
  if (keepAwake.value) void requestWakeLock()
  else releaseWakeLock()
}

async function toggleFullscreen() {
  try {
    if (trackerFullscreen.value) await trackerGrid.value?.exitFullscreen()
    else await trackerGrid.value?.enterFullscreen()
  } catch {
    notify(t('tracker.notifications.fullscreenFailed'), 'error')
  }
}

function selectStitch(row: number, column: number) {
  if (!renderedPattern.value) return
  state.selectStitch(row, column, renderedPattern.value.cells.length, renderedPattern.value.cells[0].length)
}

function selectStitches(cells: Array<[row: number, column: number]>, completed: boolean) {
  if (!renderedPattern.value) return
  state.selectStitches(cells, renderedPattern.value.cells[0].length, completed)
}

function toggleFocusedColor(color: string) {
  focusedColor.value = focusedColor.value === color ? null : color
}

function addTrackerComment(row: number, column: number) {
  state.addComment(row, column, t('tracker.comments.defaultText'))
  showAnnotations.value = true
  addingComment.value = false
}

function confirmReset() {
  state.resetProgress()
  resetModalOpen.value = false
  notify(t('tracker.notifications.reset'), 'success')
}

function confirmClear() {
  if (state.clearTracker()) {
    keepAwake.value = false
    releaseWakeLock()
    clearModalOpen.value = false
    notify(t('tracker.notifications.removed'), 'success')
  } else {
    notify(t('tracker.notifications.removeFailed'), 'error')
  }
}

function warnBeforeUnload(event: BeforeUnloadEvent) {
  state.flushAutosave()
  if (!state.backupNeeded.value) return
  event.preventDefault()
  event.returnValue = t('tracker.warnings.beforeUnload')
}

function handleVisibilityChange() {
  if (document.visibilityState === 'hidden') {
    state.flushAutosave()
    return
  }
  if (keepAwake.value) void requestWakeLock()
}

function handleKeyboardShortcuts(event: KeyboardEvent) {
  const target = event.target as HTMLElement | null
  if (target?.closest('input, textarea, select, [contenteditable="true"]')) return
  if (event.key === 'Escape' && addingComment.value) {
    addingComment.value = false
    return
  }
  if (confirmation.value || event.altKey || (!event.metaKey && !event.ctrlKey)) return
  const key = event.key.toLowerCase()
  if (key === 'z') {
    event.preventDefault()
    if (event.shiftKey) state.redo()
    else state.undo()
  } else if (key === 'y' && !event.shiftKey) {
    event.preventDefault()
    state.redo()
  }
}

onBeforeRouteLeave(() => {
  state.flushAutosave()
  if (!state.backupNeeded.value) return true
  return window.confirm(t('tracker.confirm.leave'))
})

let autosaveErrorNotified = false
watch(state.autosaveStatus, (status) => {
  if (status === 'error' && !autosaveErrorNotified) {
    autosaveErrorNotified = true
    notify(t('tracker.notifications.autosaveFailed'), 'error', 8000)
  }
})
watch([display, cellSize, autoScroll, keepAwake, showSymbols, showAnnotations], () => {
  hasCellSizePreference = true
  const preferences = {
    display: display.value,
    cellSize: cellSize.value,
    autoScroll: autoScroll.value,
    keepAwake: keepAwake.value,
    showSymbols: showSymbols.value,
    showAnnotations: showAnnotations.value,
  } satisfies TrackerPreferences
  try {
    localStorage.setItem(TRACKER_PREFERENCES_KEY, JSON.stringify(preferences))
  } catch {
    // Display preferences are optional when browser storage is unavailable.
  }
  state.setPreferences(preferences)
})

onMounted(() => {
  window.addEventListener('keydown', handleKeyboardShortcuts)
  window.addEventListener('beforeunload', warnBeforeUnload)
  window.addEventListener('pagehide', state.flushAutosave)
  document.addEventListener('visibilitychange', handleVisibilityChange)
  if (keepAwake.value) void requestWakeLock()
  if (state.restoredAutosave.value) notify(t('tracker.notifications.recovered'), 'success')
})

onBeforeUnmount(() => {
  if (timerFrame !== null) cancelAnimationFrame(timerFrame)
  state.flushAutosave()
  keepAwake.value = false
  releaseWakeLock()
  window.removeEventListener('keydown', handleKeyboardShortcuts)
  window.removeEventListener('beforeunload', warnBeforeUnload)
  window.removeEventListener('pagehide', state.flushAutosave)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})

function confirmActiveModal() {
  if (replaceModalOpen.value) {
    if (pendingInput.value) applyInput(pendingInput.value)
  } else if (resetModalOpen.value) {
    confirmReset()
  } else if (clearModalOpen.value) {
    confirmClear()
  }
}

function cancelActiveModal() {
  if (replaceModalOpen.value) cancelReplacement()
  else if (resetModalOpen.value) resetModalOpen.value = false
  else if (clearModalOpen.value) clearModalOpen.value = false
}
</script>

<template>
  <div class="min-h-screen bg-base-200 text-base-content">
    <header class="navbar min-h-14 border-b border-base-300 bg-base-100 px-2 sm:px-4">
      <div class="navbar-start gap-2">
        <span class="text-lg font-semibold tracking-tight">{{ t('tracker.brand') }}</span>
      </div>
      <nav
        class="navbar-center hidden gap-1 sm:flex"
        :aria-label="t('tracker.actions.label')"
      >
        <RouterLink
          class="btn btn-ghost btn-sm"
          to="/"
        >
          <span
            class="mdi mdi-pencil-ruler text-lg"
            aria-hidden="true"
          />{{ t('tracker.actions.editor') }}
        </RouterLink>
        <button
          class="btn btn-ghost btn-sm"
          type="button"
          @click="fileInput?.click()"
        >
          <span
            class="mdi mdi-folder-open-outline text-lg"
            aria-hidden="true"
          />{{ t('tracker.actions.open') }}
        </button>
        <button
          class="btn btn-ghost btn-sm"
          type="button"
          :disabled="!state.tracker.value"
          @click="saveTracker"
        >
          <span
            class="mdi mdi-content-save-outline text-lg"
            aria-hidden="true"
          />{{ t('tracker.actions.save') }}
        </button>
      </nav>
      <div class="navbar-end gap-1">
        <RouterLink
          class="btn btn-ghost btn-square btn-sm sm:hidden"
          to="/"
          :aria-label="t('tracker.actions.openEditor')"
        >
          <span
            class="mdi mdi-pencil-ruler text-lg"
            aria-hidden="true"
          />
        </RouterLink>
        <button
          class="btn btn-ghost btn-square btn-sm sm:hidden"
          type="button"
          :aria-label="t('tracker.actions.openDesignOrTracker')"
          @click="fileInput?.click()"
        >
          <span
            class="mdi mdi-folder-open-outline text-lg"
            aria-hidden="true"
          />
        </button>
        <button
          class="btn btn-primary btn-square btn-sm sm:hidden"
          type="button"
          :disabled="!state.tracker.value"
          :aria-label="t('tracker.actions.saveAria')"
          @click="saveTracker"
        >
          <span
            class="mdi mdi-content-save-outline text-lg"
            aria-hidden="true"
          />
        </button>
        <LanguageSwitcher />
        <ThemeToggle
          :theme="theme"
          @toggle="toggleTheme"
        />
      </div>
    </header>
    <input
      ref="fileInput"
      class="sr-only"
      type="file"
      tabindex="-1"
      :aria-label="t('tracker.actions.openDesignOrTracker')"
      @change="selectFile"
    >

    <main class="mx-auto max-w-360 space-y-4 p-3 sm:p-5">
      <section
        v-if="!state.tracker.value"
        class="grid min-h-[calc(100dvh-7rem)] place-items-center"
      >
        <div class="card w-full max-w-2xl border border-base-300 bg-base-100 shadow-sm">
          <div class="card-body items-start gap-5 p-6 sm:p-10">
            <div class="grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary-content">
              <span
                class="mdi mdi-progress-check text-3xl"
                aria-hidden="true"
              />
            </div>
            <div>
              <h1 class="text-3xl font-bold tracking-tight">
                {{ t('tracker.empty.title') }}
              </h1>
              <p class="mt-2 max-w-xl text-base-content/70">
                {{ t('tracker.empty.description') }}
              </p>
            </div>
            <button
              class="btn btn-primary"
              type="button"
              @click="fileInput?.click()"
            >
              <span
                class="mdi mdi-folder-open-outline text-lg"
                aria-hidden="true"
              />{{ t('tracker.actions.openDesignOrTracker') }}
            </button>
            <div class="alert alert-warning text-sm">
              <span
                class="mdi mdi-alert-outline text-xl"
                aria-hidden="true"
              />
              <span>{{ t('tracker.warnings.localOnly') }}</span>
            </div>
          </div>
        </div>
      </section>

      <template v-else>
        <section class="card border border-base-300 bg-base-100">
          <div class="card-body gap-4 p-4 sm:p-5">
            <div class="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p class="text-xs font-semibold uppercase tracking-widest text-primary-content">
                  {{ t('tracker.progress.heading') }}
                </p>
                <h1 class="mt-1 text-2xl font-bold">
                  {{ state.tracker.value.pattern.name }}
                </h1>
                <p class="mt-1 text-sm text-base-content/65">
                  {{ t('tracker.progress.completed', { completed: n(state.completedCount.value, 'integer'), total: n(state.totalCount.value, 'integer') }) }}
                </p>
              </div>
              <div class="flex flex-wrap items-center justify-end gap-2">
                <span
                  class="badge"
                  :class="state.autosaveStatus.value === 'error' ? 'badge-error' : state.autosaveStatus.value === 'saving' ? 'badge-ghost' : 'badge-success badge-outline'"
                >
                  <span
                    class="mdi"
                    :class="state.autosaveStatus.value === 'error' ? 'mdi-alert-circle-outline' : state.autosaveStatus.value === 'saving' ? 'mdi-loading mdi-spin' : 'mdi-content-save-check-outline'"
                    aria-hidden="true"
                  />
                  {{ state.autosaveStatus.value === 'error' ? t('tracker.autosave.failed') : state.autosaveStatus.value === 'saving' ? t('tracker.autosave.saving') : t('tracker.autosave.saved') }}
                </span>
                <span
                  v-if="state.backupNeeded.value"
                  class="badge badge-warning badge-outline"
                >{{ t('tracker.autosave.changed') }}</span>
                <button
                  class="btn btn-primary btn-sm"
                  type="button"
                  @click="saveTracker"
                >
                  <span
                    class="mdi mdi-download text-base"
                    aria-hidden="true"
                  />{{ t('tracker.actions.save') }}
                </button>
              </div>
            </div>
            <progress
              class="progress progress-primary w-full"
              :value="state.completedCount.value"
              :max="state.totalCount.value"
            />
            <div class="flex items-center justify-between text-xs text-base-content/60">
              <span>{{ t('tracker.progress.percentComplete', { percentage: n(percentage / 100, 'percent') }) }}</span><span>{{ t('tracker.progress.updated', { date: d(new Date(state.tracker.value.progress.updatedAt), 'short') }) }}</span>
            </div>
            <div class="alert alert-warning py-3 text-sm">
              <span
                class="mdi mdi-shield-download-outline text-xl"
                aria-hidden="true"
              />
              <span>{{ t('tracker.warnings.recovery') }}</span>
            </div>
          </div>
        </section>

        <section class="card border border-base-300 bg-base-100">
          <div class="card-body gap-4 p-3 sm:p-5">
            <div class="flex flex-wrap items-end justify-between gap-3">
              <div class="flex flex-wrap items-end gap-3">
                <label class="form-control w-48">
                  <span class="label py-1 text-xs font-semibold">{{ t('tracker.mode.label') }}</span>
                  <select
                    class="select select-bordered select-sm"
                    :value="state.tracker.value.progress.completionMode"
                    :disabled="state.completedCount.value > 0"
                    @change="changeCompletionMode"
                  >
                    <option value="sequential">{{ t('tracker.mode.sequential') }}</option>
                    <option value="individual">{{ t('tracker.mode.individual') }}</option>
                  </select>
                </label>
                <label class="form-control w-40">
                  <span class="label py-1 text-xs font-semibold">{{ t('tracker.order.startRow') }}</span>
                  <select
                    class="select select-bordered select-sm"
                    :value="state.tracker.value.progress.startRow"
                    :disabled="state.completedCount.value > 0"
                    @change="changeStartRow"
                  >
                    <option value="top">{{ t('tracker.order.top') }}</option><option value="bottom">{{ t('tracker.order.bottom') }}</option>
                  </select>
                </label>
                <label class="form-control w-44">
                  <span class="label py-1 text-xs font-semibold">{{ t('tracker.order.firstRowDirection') }}</span>
                  <select
                    class="select select-bordered select-sm"
                    :value="state.tracker.value.progress.firstRowDirection"
                    :disabled="state.completedCount.value > 0"
                    @change="changeDirection"
                  >
                    <option value="left-to-right">{{ t('tracker.order.leftToRight') }}</option><option value="right-to-left">{{ t('tracker.order.rightToLeft') }}</option>
                  </select>
                </label>
                <label class="flex h-8 items-center gap-2 pb-1 text-sm">
                  <input
                    class="checkbox checkbox-primary checkbox-sm"
                    type="checkbox"
                    :checked="state.tracker.value.progress.alternateRows"
                    :disabled="state.completedCount.value > 0"
                    @change="changeAlternation"
                  >{{ t('tracker.order.alternate') }}
                </label>
              </div>
              <div class="flex flex-wrap items-center gap-2">
                <div class="flex items-center gap-1">
                  <button
                    class="btn btn-ghost btn-square btn-sm"
                    type="button"
                    :disabled="!state.canUndo.value"
                    :aria-label="t('tracker.actions.undo')"
                    :title="t('tracker.actions.undo')"
                    aria-keyshortcuts="Control+Z Meta+Z"
                    @click="state.undo"
                  >
                    <span
                      class="mdi mdi-undo text-lg"
                      aria-hidden="true"
                    />
                  </button>
                  <button
                    class="btn btn-ghost btn-square btn-sm"
                    type="button"
                    :disabled="!state.canRedo.value"
                    :aria-label="t('tracker.actions.redo')"
                    :title="t('tracker.actions.redo')"
                    aria-keyshortcuts="Control+Y Control+Shift+Z Meta+Shift+Z"
                    @click="state.redo"
                  >
                    <span
                      class="mdi mdi-redo text-lg"
                      aria-hidden="true"
                    />
                  </button>
                </div>
                <div class="flex items-center gap-1 rounded-box border border-base-300 bg-base-200/60 p-1 pl-2">
                  <time
                    class="font-mono text-sm font-semibold tabular-nums"
                    :aria-label="t('tracker.timer.elapsed', { time: formattedTime })"
                  >{{ formattedTime }}</time>
                  <button
                    class="btn btn-primary btn-square btn-sm"
                    type="button"
                    :aria-label="t(timerRunning ? 'tracker.timer.pause' : 'tracker.timer.start')"
                    :title="t(timerRunning ? 'tracker.timer.pause' : 'tracker.timer.start')"
                    @click="timerRunning ? state.pauseTimer() : state.startTimer()"
                  >
                    <span
                      class="mdi text-lg"
                      :class="timerRunning ? 'mdi-pause' : 'mdi-play'"
                      aria-hidden="true"
                    />
                  </button>
                  <button
                    class="btn btn-ghost btn-square btn-sm"
                    type="button"
                    :disabled="elapsedMilliseconds === 0"
                    :aria-label="t('tracker.timer.reset')"
                    :title="t('tracker.timer.reset')"
                    @click="state.resetTimer()"
                  >
                    <span
                      class="mdi mdi-restart text-lg"
                      aria-hidden="true"
                    />
                  </button>
                </div>
                <div
                  class="tooltip"
                  :data-tip="t('tracker.comments.add')"
                >
                  <button
                    class="btn btn-square btn-sm"
                    :class="addingComment ? 'btn-primary' : 'btn-ghost'"
                    type="button"
                    :aria-label="t('tracker.comments.add')"
                    :aria-pressed="addingComment"
                    @click="addingComment = !addingComment; if (addingComment) showAnnotations = true"
                  >
                    <span
                      class="mdi mdi-comment-plus-outline text-lg"
                      aria-hidden="true"
                    />
                  </button>
                </div>
                <AppDropdown
                  :label="t('tracker.controls.settings')"
                  align="right"
                >
                  <template #trigger="{ open, panelId }">
                    <button
                      class="btn btn-ghost btn-square btn-sm"
                      type="button"
                      :aria-label="t('tracker.controls.settings')"
                      :title="t('tracker.controls.settings')"
                      aria-haspopup="true"
                      :aria-controls="panelId"
                      :aria-expanded="open"
                    >
                      <span
                        class="mdi mdi-cog-outline text-xl"
                        aria-hidden="true"
                      />
                    </button>
                  </template>
                  <div class="w-72 p-4">
                    <div class="flex flex-col gap-6">
                      <label class="form-control gap-1">
                        <span class="text-xs font-semibold">{{ t('tracker.controls.display') }}</span>
                        <select
                          v-model="display"
                          class="select select-bordered select-sm w-full"
                          :aria-label="t('tracker.controls.displayAria')"
                        >
                          <option value="canvas">{{ t('tracker.controls.canvas') }}</option>
                          <option value="knit">{{ t('tracker.controls.knit') }}</option>
                          <option value="cross-stitch">{{ t('tracker.controls.crossStitch') }}</option>
                          <option value="single-crochet">{{ t('tracker.controls.singleCrochet') }}</option>
                        </select>
                      </label>
                      <label class="form-control gap-2">
                        <span class="flex items-center justify-between gap-3 text-xs font-semibold"><span>{{ t('tracker.controls.cellSize') }}</span><span class="font-mono font-normal tabular-nums">{{ cellSize }} px</span></span>
                        <input
                          v-model.number="cellSize"
                          class="range range-xs w-full"
                          type="range"
                          min="16"
                          max="48"
                          :aria-label="t('tracker.controls.cellSize')"
                        >
                      </label>
                      <label class="flex items-center justify-between gap-3 text-sm"><span>{{ t('tracker.controls.autoScroll') }}</span><input
                        v-model="autoScroll"
                        class="toggle toggle-primary toggle-sm"
                        type="checkbox"
                      ></label>
                      <label class="flex items-center justify-between gap-3 text-sm"><span>{{ t('tracker.controls.showSymbols') }}</span><input
                        v-model="showSymbols"
                        class="toggle toggle-primary toggle-sm"
                        type="checkbox"
                      ></label>
                      <label class="flex items-center justify-between gap-3 text-sm"><span>{{ t('tracker.controls.showAnnotations') }}</span><input
                        v-model="showAnnotations"
                        class="toggle toggle-primary toggle-sm"
                        type="checkbox"
                      ></label>
                      <label
                        v-if="wakeLockSupported"
                        class="flex items-center justify-between gap-3 text-sm"
                      ><span>{{ t('tracker.controls.keepAwake') }}</span><input
                        class="toggle toggle-primary toggle-sm"
                        type="checkbox"
                        :checked="keepAwake"
                        @change="changeKeepAwake"
                      ></label>
                    </div>
                  </div>
                </AppDropdown>
                <div
                  v-if="fullscreenSupported"
                  class="tooltip"
                  :data-tip="t(trackerFullscreen ? 'tracker.controls.exitFullscreen' : 'tracker.controls.fullscreen')"
                >
                  <button
                    class="btn btn-ghost btn-square btn-sm"
                    type="button"
                    :aria-label="t(trackerFullscreen ? 'tracker.controls.exitFullscreen' : 'tracker.controls.fullscreen')"
                    @click="toggleFullscreen"
                  >
                    <span
                      class="mdi text-lg"
                      :class="trackerFullscreen ? 'mdi-fullscreen-exit' : 'mdi-fullscreen'"
                      aria-hidden="true"
                    />
                  </button>
                </div>
                <div
                  class="tooltip"
                  :data-tip="t('tracker.actions.reset')"
                >
                  <button
                    class="btn btn-ghost btn-square btn-sm text-error"
                    type="button"
                    :disabled="state.completedCount.value === 0"
                    :aria-label="t('tracker.actions.reset')"
                    @click="resetModalOpen = true"
                  >
                    <span
                      class="mdi mdi-restart text-lg"
                      aria-hidden="true"
                    />
                  </button>
                </div>
                <div
                  class="tooltip"
                  :data-tip="t('tracker.actions.close')"
                >
                  <button
                    class="btn btn-ghost btn-square btn-sm"
                    type="button"
                    :aria-label="t('tracker.actions.close')"
                    @click="clearModalOpen = true"
                  >
                    <span
                      class="mdi mdi-close-circle-outline text-lg"
                      aria-hidden="true"
                    />
                  </button>
                </div>
              </div>
            </div>
            <p
              v-if="state.completedCount.value > 0"
              class="text-xs text-base-content/55"
            >
              {{ t('tracker.instructions.resetOrder') }}
            </p>
            <p class="text-sm text-base-content/65">
              {{ t(addingComment ? 'tracker.comments.addInstruction' : state.tracker.value.progress.completionMode === 'individual' ? 'tracker.instructions.individualUsage' : 'tracker.instructions.usage') }}
            </p>

            <div
              v-if="tooLarge"
              class="alert alert-error"
            >
              <span
                class="mdi mdi-grid-off text-xl"
                aria-hidden="true"
              />
              <span>{{ t('tracker.errors.oversized', { total: n(state.totalCount.value, 'integer') }) }}</span>
            </div>
            <TrackerGrid
              v-else-if="renderedPattern"
              ref="trackerGrid"
              :cells="renderedPattern.cells"
              :row-headers="renderedPattern.rowHeaders"
              :column-headers="renderedPattern.columnHeaders"
              :repeat-flags="renderedPattern.repeatFlags"
              :repeat-color-indices="renderedPattern.repeatColorIndices"
              :cell-size="cellSize"
              :display="display"
              :progress="state.tracker.value.progress"
              :auto-scroll="autoScroll"
              :symbols="trackerSymbolMap"
              :focused-color="focusedColor"
              :annotations="state.tracker.value.pattern.annotations"
              :cell-source-rows="renderedPattern.sourceRows"
              :cell-source-columns="renderedPattern.sourceColumns"
              :show-annotations="showAnnotations"
              :adding-comment="addingComment"
              @stitch="selectStitch"
              @stitches="selectStitches"
              @add-comment="addTrackerComment"
              @update-comment="state.updateComment"
              @remove-comment="state.removeComment"
              @row="state.selectRow($event, renderedPattern.cells.length, renderedPattern.cells[0].length)"
              @fullscreen-change="trackerFullscreen = $event"
            />
          </div>
        </section>
        <ColorLegend
          v-if="renderedPattern"
          :cells="renderedPattern.cells"
          :completed-counts="completedColorCounts"
          :symbols="trackerSymbolMap"
          :palette="state.paletteEntries.value"
          editable
          allow-color-switch
          selectable
          :selected-color="focusedColor"
          @update="state.updatePaletteEntry"
          @move="state.movePaletteEntry"
          @switch-color="state.switchPaletteColor"
          @reorder="state.reorderPaletteEntry"
          @select-color="toggleFocusedColor"
        />
      </template>
    </main>
  </div>

  <div
    v-if="confirmation"
    class="modal modal-open"
    role="dialog"
    aria-modal="true"
    :aria-label="confirmation.title"
    @keydown.esc="cancelActiveModal"
  >
    <div class="modal-box">
      <h2 class="text-lg font-bold">
        {{ confirmation.title }}
      </h2>
      <p class="py-4">
        {{ confirmation.message }}
      </p>
      <div class="modal-action">
        <button
          class="btn"
          type="button"
          @click="cancelActiveModal"
        >
          {{ t('tracker.confirm.cancel') }}
        </button>
        <button
          class="btn btn-error"
          type="button"
          autofocus
          @click="confirmActiveModal"
        >
          {{ confirmation.label }}
        </button>
      </div>
    </div>
    <button
      class="modal-backdrop"
      type="button"
      :aria-label="t('tracker.confirm.closeDialog')"
      @click="cancelActiveModal"
    >
      {{ t('tracker.confirm.closeBackdrop') }}
    </button>
  </div>
  <div
    class="toast toast-end toast-top z-100 mt-14"
    aria-live="polite"
  >
    <div
      v-for="item in notifications"
      :key="item.id"
      class="alert max-w-sm"
      :class="alertClasses[item.kind]"
    >
      <span>{{ item.message }}</span>
      <button
        class="btn btn-ghost btn-xs"
        type="button"
        :aria-label="t('tracker.notifications.dismissAria', { message: item.message })"
        @click="dismiss(item.id)"
      >
        {{ t('tracker.notifications.close') }}
      </button>
    </div>
  </div>
</template>
