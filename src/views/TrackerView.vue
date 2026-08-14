<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { onBeforeRouteLeave, RouterLink } from 'vue-router'
import ConfirmModal from '../components/ConfirmModal.vue'
import NotificationToast from '../components/NotificationToast.vue'
import ThemeToggle from '../components/ThemeToggle.vue'
import TrackerGrid from '../components/TrackerGrid.vue'
import { useNotifications } from '../composables/useNotifications'
import { useTheme } from '../composables/useTheme'
import { useTracker } from '../composables/useTracker'
import { downloadTracker, readTrackerInput } from '../composables/useTrackerFiles'
import type { PatternProject } from '../types/pattern'
import type { TrackerDirection, TrackerProject, TrackerStartRow } from '../types/tracker'
import { renderGrid } from '../utils/grid'
import { MAX_TRACKER_STITCHES, renderedDimensions } from '../utils/tracker'

const state = useTracker()
const { theme, toggleTheme } = useTheme()
const { notifications, notify, dismiss } = useNotifications()
const fileInput = ref<HTMLInputElement | null>(null)
const pendingInput = ref<{ tracker?: TrackerProject; pattern?: PatternProject } | null>(null)
const replaceModalOpen = ref(false)
const resetModalOpen = ref(false)
const clearModalOpen = ref(false)
const cellSize = ref(Math.min(40, Math.max(18, state.tracker.value?.pattern.cellSize ?? 24)))

const dimensions = computed(() => state.tracker.value ? renderedDimensions(state.tracker.value.pattern) : null)
const tooLarge = computed(() => dimensions.value ? dimensions.value.rows * dimensions.value.columns > MAX_TRACKER_STITCHES : false)
const renderedPattern = computed(() => {
  if (!state.tracker.value || tooLarge.value) return null
  const pattern = state.tracker.value.pattern
  return renderGrid(pattern.cells, pattern.horizontalRepeats, pattern.verticalRepeats, pattern.repeatBoxes)
})
const percentage = computed(() => state.totalCount.value === 0 ? 0 : Math.round((state.completedCount.value / state.totalCount.value) * 100))

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
    notify(error instanceof Error ? error.message : 'The selected file could not be opened.', 'error', 7000)
  }
}

function applyInput(input: { tracker?: TrackerProject; pattern?: PatternProject }) {
  if (input.tracker) state.openTracker(input.tracker)
  else if (input.pattern) state.openPattern(input.pattern)
  cellSize.value = Math.min(40, Math.max(18, state.tracker.value?.pattern.cellSize ?? 24))
  pendingInput.value = null
  replaceModalOpen.value = false
  notify(input.tracker ? 'Tracker progress opened.' : 'Design opened. Choose the tracking order before starting.', 'success')
}

function cancelReplacement() {
  pendingInput.value = null
  replaceModalOpen.value = false
}

function saveTracker() {
  if (!state.tracker.value) return
  try {
    downloadTracker(state.tracker.value)
    state.markDownloaded()
    notify('Tracker saved to your downloads.', 'success')
  } catch (error) {
    notify(error instanceof Error ? error.message : 'The tracker could not be saved.', 'error')
  }
}

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

function selectStitch(row: number, column: number) {
  if (!renderedPattern.value) return
  state.selectStitch(row, column, renderedPattern.value.cells.length, renderedPattern.value.cells[0].length)
}

function confirmReset() {
  state.resetProgress()
  resetModalOpen.value = false
  notify('Tracker progress reset.', 'success')
}

function confirmClear() {
  if (state.clearTracker()) {
    clearModalOpen.value = false
    notify('Local tracker removed.', 'success')
  } else {
    notify('The browser recovery copy could not be removed.', 'error')
  }
}

function warnBeforeUnload(event: BeforeUnloadEvent) {
  state.flushAutosave()
  if (!state.backupNeeded.value) return
  event.preventDefault()
  event.returnValue = 'Download a tracker file before leaving.'
}

function flushHiddenTracker() {
  if (document.visibilityState === 'hidden') state.flushAutosave()
}

onBeforeRouteLeave(() => {
  state.flushAutosave()
  if (!state.backupNeeded.value) return true
  return window.confirm('Your progress is saved only in this browser. Leave without downloading a tracker file?')
})

let autosaveErrorNotified = false
watch(state.autosaveStatus, (status) => {
  if (status === 'error' && !autosaveErrorNotified) {
    autosaveErrorNotified = true
    notify('Browser autosave failed. Download the tracker now to avoid losing progress.', 'error', 8000)
  }
})

onMounted(() => {
  window.addEventListener('beforeunload', warnBeforeUnload)
  window.addEventListener('pagehide', state.flushAutosave)
  document.addEventListener('visibilitychange', flushHiddenTracker)
  if (state.restoredAutosave.value) notify('Recovered your tracker from this browser.', 'success')
})

onBeforeUnmount(() => {
  state.flushAutosave()
  window.removeEventListener('beforeunload', warnBeforeUnload)
  window.removeEventListener('pagehide', state.flushAutosave)
  document.removeEventListener('visibilitychange', flushHiddenTracker)
})
</script>

<template>
  <div class="min-h-screen bg-base-200 text-base-content">
    <header class="navbar min-h-14 border-b border-base-300 bg-base-100 px-2 sm:px-4">
      <div class="navbar-start gap-2">
        <span class="text-lg font-semibold tracking-tight">Stitch Witch</span>
        <span class="badge badge-primary badge-outline">Tracker</span>
      </div>
      <nav class="navbar-center hidden gap-1 sm:flex" aria-label="Tracker actions">
        <RouterLink class="btn btn-ghost btn-sm" to="/"><span class="mdi mdi-pencil-ruler text-lg" aria-hidden="true"></span>Editor</RouterLink>
        <button class="btn btn-ghost btn-sm" type="button" @click="fileInput?.click()"><span class="mdi mdi-folder-open-outline text-lg" aria-hidden="true"></span>Open</button>
        <button class="btn btn-ghost btn-sm" type="button" :disabled="!state.tracker.value" @click="saveTracker"><span class="mdi mdi-content-save-outline text-lg" aria-hidden="true"></span>Save Tracker</button>
      </nav>
      <div class="navbar-end gap-1">
        <RouterLink class="btn btn-ghost btn-square btn-sm sm:hidden" to="/" aria-label="Open editor"><span class="mdi mdi-pencil-ruler text-lg" aria-hidden="true"></span></RouterLink>
        <button class="btn btn-ghost btn-square btn-sm sm:hidden" type="button" aria-label="Open design or tracker" @click="fileInput?.click()"><span class="mdi mdi-folder-open-outline text-lg" aria-hidden="true"></span></button>
        <button class="btn btn-primary btn-square btn-sm sm:hidden" type="button" :disabled="!state.tracker.value" aria-label="Save tracker" @click="saveTracker"><span class="mdi mdi-content-save-outline text-lg" aria-hidden="true"></span></button>
        <ThemeToggle :theme="theme" @toggle="toggleTheme" />
      </div>
    </header>
    <input ref="fileInput" class="hidden" type="file" accept=".stitch-pattern,.stitch-tracker,application/json" @change="selectFile" />

    <main class="mx-auto max-w-[90rem] space-y-4 p-3 sm:p-5">
      <section v-if="!state.tracker.value" class="grid min-h-[calc(100dvh-7rem)] place-items-center">
        <div class="card w-full max-w-2xl border border-base-300 bg-base-100 shadow-sm">
          <div class="card-body items-start gap-5 p-6 sm:p-10">
            <div class="grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary"><span class="mdi mdi-progress-check text-3xl" aria-hidden="true"></span></div>
            <div>
              <h1 class="text-3xl font-bold tracking-tight">Keep your place, stitch by stitch</h1>
              <p class="mt-2 max-w-xl text-base-content/70">Open a saved design to begin, or open a tracker file to continue where you stopped.</p>
            </div>
            <button class="btn btn-primary" type="button" @click="fileInput?.click()"><span class="mdi mdi-folder-open-outline text-lg" aria-hidden="true"></span>Open design or tracker</button>
            <div class="alert alert-warning text-sm">
              <span class="mdi mdi-alert-outline text-xl" aria-hidden="true"></span>
              <span>Progress is recovered only in this browser until you download a tracker file.</span>
            </div>
          </div>
        </div>
      </section>

      <template v-else>
        <section class="card border border-base-300 bg-base-100">
          <div class="card-body gap-4 p-4 sm:p-5">
            <div class="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p class="text-xs font-semibold uppercase tracking-widest text-primary">Tracking progress</p>
                <h1 class="mt-1 text-2xl font-bold">{{ state.tracker.value.pattern.name }}</h1>
                <p class="mt-1 text-sm text-base-content/65">{{ state.completedCount.value.toLocaleString() }} of {{ state.totalCount.value.toLocaleString() }} stitches completed</p>
              </div>
              <div class="flex flex-wrap items-center justify-end gap-2">
                <span class="badge" :class="state.autosaveStatus.value === 'error' ? 'badge-error' : state.autosaveStatus.value === 'saving' ? 'badge-ghost' : 'badge-success badge-outline'">
                  <span class="mdi" :class="state.autosaveStatus.value === 'error' ? 'mdi-alert-circle-outline' : state.autosaveStatus.value === 'saving' ? 'mdi-loading mdi-spin' : 'mdi-content-save-check-outline'" aria-hidden="true"></span>
                  {{ state.autosaveStatus.value === 'error' ? 'Autosave failed' : state.autosaveStatus.value === 'saving' ? 'Saving in browser' : 'Saved in browser' }}
                </span>
                <span v-if="state.backupNeeded.value" class="badge badge-warning badge-outline">Changes since download</span>
                <button class="btn btn-primary btn-sm" type="button" @click="saveTracker"><span class="mdi mdi-download text-base" aria-hidden="true"></span>Save Tracker</button>
              </div>
            </div>
            <progress class="progress progress-primary w-full" :value="state.completedCount.value" :max="state.totalCount.value"></progress>
            <div class="flex items-center justify-between text-xs text-base-content/60"><span>{{ percentage }}% complete</span><span>Updated {{ new Date(state.tracker.value.progress.updatedAt).toLocaleString() }}</span></div>
            <div class="alert alert-warning py-3 text-sm">
              <span class="mdi mdi-shield-download-outline text-xl" aria-hidden="true"></span>
              <span>Browser recovery can be lost if site data is cleared or you change browser or device. Download a tracker file regularly.</span>
            </div>
          </div>
        </section>

        <section class="card border border-base-300 bg-base-100">
          <div class="card-body gap-4 p-3 sm:p-5">
            <div class="flex flex-wrap items-end justify-between gap-3">
              <div class="flex flex-wrap items-end gap-3">
                <label class="form-control w-40">
                  <span class="label py-1 text-xs font-semibold">Start row</span>
                  <select class="select select-bordered select-sm" :value="state.tracker.value.progress.startRow" :disabled="state.completedCount.value > 0" @change="changeStartRow">
                    <option value="top">Top</option><option value="bottom">Bottom</option>
                  </select>
                </label>
                <label class="form-control w-44">
                  <span class="label py-1 text-xs font-semibold">First row direction</span>
                  <select class="select select-bordered select-sm" :value="state.tracker.value.progress.firstRowDirection" :disabled="state.completedCount.value > 0" @change="changeDirection">
                    <option value="left-to-right">Left to right</option><option value="right-to-left">Right to left</option>
                  </select>
                </label>
                <label class="flex h-8 items-center gap-2 pb-1 text-sm">
                  <input class="checkbox checkbox-primary checkbox-sm" type="checkbox" :checked="state.tracker.value.progress.alternateRows" :disabled="state.completedCount.value > 0" @change="changeAlternation" />Alternate direction each row
                </label>
              </div>
              <div class="flex flex-wrap items-center gap-2">
                <label class="flex items-center gap-2 text-xs">Cell size <input v-model.number="cellSize" class="range range-xs w-24" type="range" min="16" max="48" /></label>
                <button class="btn btn-ghost btn-sm text-error" type="button" :disabled="state.completedCount.value === 0" @click="resetModalOpen = true">Reset progress</button>
                <button class="btn btn-ghost btn-sm" type="button" @click="clearModalOpen = true">Close tracker</button>
              </div>
            </div>
            <p v-if="state.completedCount.value > 0" class="text-xs text-base-content/55">Reset progress to change the tracking order.</p>
            <p class="text-sm text-base-content/65">Click a stitch to complete everything through it. Click a row number to complete or reopen that entire row.</p>

            <div v-if="tooLarge" class="alert alert-error">
              <span class="mdi mdi-grid-off text-xl" aria-hidden="true"></span>
              <span>This repeated design expands to {{ state.totalCount.value.toLocaleString() }} stitches, which is too large for the tracker. Reduce its whole-pattern repeats in the editor.</span>
            </div>
            <TrackerGrid
              v-else-if="renderedPattern"
              :cells="renderedPattern.cells"
              :row-headers="renderedPattern.rowHeaders"
              :column-headers="renderedPattern.columnHeaders"
              :repeat-flags="renderedPattern.repeatFlags"
              :cell-size="cellSize"
              :progress="state.tracker.value.progress"
              @stitch="selectStitch"
              @row="state.selectRow($event, renderedPattern.cells.length, renderedPattern.cells[0].length)"
            />
          </div>
        </section>
      </template>
    </main>
  </div>

  <ConfirmModal
    :open="replaceModalOpen"
    title="Replace this tracker?"
    message="Your current progress has changes since its last downloaded tracker file. Save it first if you want to keep it."
    confirm-label="Replace tracker"
    destructive
    @confirm="pendingInput && applyInput(pendingInput)"
    @cancel="cancelReplacement"
  />
  <ConfirmModal
    :open="resetModalOpen"
    title="Reset all progress?"
    message="Every completed stitch will be reopened. The design itself will not change."
    confirm-label="Reset progress"
    destructive
    @confirm="confirmReset"
    @cancel="resetModalOpen = false"
  />
  <ConfirmModal
    :open="clearModalOpen"
    title="Close this tracker?"
    message="This removes its browser recovery copy. Download a tracker file first if you want to continue later."
    confirm-label="Close tracker"
    destructive
    @confirm="confirmClear"
    @cancel="clearModalOpen = false"
  />
  <NotificationToast :notifications="notifications" @dismiss="dismiss" />
</template>
