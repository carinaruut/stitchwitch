<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import NotificationToast from '../../../shared/ui/NotificationToast.vue'
import ColorLegend from '../../palette/components/ColorLegend.vue'
import { useNotifications } from '../../../shared/composables/useNotifications'
import type { PatternState } from '../../editor/composables/usePattern'
import type { TrackerController } from '../composables/useTracker'
import type { PrintMode } from '../../../types/pattern'
import { colorSymbolMap } from '../../../utils/colors'
import { renderGrid } from '../../../utils/grid'
import { orderedColorCounts } from '../../../utils/palette'
import { isStitchCompleted, MAX_TRACKER_STITCHES, renderedDimensions } from '../../../utils/tracker'
import { useScreenWakeLock } from '../composables/useScreenWakeLock'
import { useTrackerClock } from '../composables/useTrackerClock'
import { useTrackerPreferences } from '../composables/useTrackerPreferences'
import TrackerCanvasPanel from './TrackerCanvasPanel.vue'
import TrackerProgressHeader from './TrackerProgressHeader.vue'
import TrackerCongratulations from './modals/TrackerCongratulations.vue'
import TrackerResetModal from './modals/TrackerResetModal.vue'
import TrackerSessionsModal from './modals/TrackerSessionsModal.vue'
import TrackerToolsModal from './modals/TrackerToolsModal.vue'
import TrackerToolbar from './toolbar/TrackerToolbar.vue'

const props = defineProps<{ includeAnnotations: boolean; pattern: PatternState; state: TrackerController }>()
const emit = defineEmits<{
  close: []
  save: []
  png: []
  print: [mode: PrintMode]
  'update:includeAnnotations': [value: boolean]
}>()

const pattern = props.pattern
const state = props.state
state.ensureTracker()

const activeTracker = computed(() => state.tracker.value!)
const { t } = useI18n({ useScope: 'global' })
const { notifications, notify, dismiss } = useNotifications()
const trackerCanvas = ref<InstanceType<typeof TrackerCanvasPanel> | null>(null)
const resetModalOpen = ref(false)
const addingComment = ref(false)
const timerOpen = ref(false)
const toolsModalOpen = ref(false)
const sessionsModalOpen = ref(false)
const selectedCommentId = ref<string | null>(null)
const trackerFullscreen = ref(false)
const focusedColor = ref<string | null>(null)
const fullscreenSupported = typeof document !== 'undefined' && document.fullscreenEnabled
const {
  autoScroll,
  cellSize,
  display,
  focusMode,
  focusNeighborRows,
  focusStyle,
  keepAwake,
  preferences,
  showAnnotations,
  showSymbols,
} = useTrackerPreferences(
  state.tracker.value?.preferences,
  Math.min(40, Math.max(18, pattern.project.value.cellSize)),
)
const { elapsedMilliseconds, formattedTime, now: timerNow, running: timerRunning } = useTrackerClock(() => state.tracker.value?.timer)
const { setKeepAwake, supported: wakeLockSupported } = useScreenWakeLock(keepAwake, () => {
  notify(t('tracker.notifications.keepAwakeFailed'), 'error')
})

const dimensions = computed(() => renderedDimensions(pattern.project.value))
const tooLarge = computed(() => dimensions.value ? dimensions.value.rows * dimensions.value.columns > MAX_TRACKER_STITCHES : false)
const renderedPattern = computed(() => {
  if (tooLarge.value) return null
  const project = pattern.project.value
  return renderGrid(project.cells, project.horizontalRepeats, project.verticalRepeats, project.repeatBoxes, project.rowIds, project.columnIds)
})
const trackerSymbolMap = computed(() => showSymbols.value && renderedPattern.value && state.tracker.value
  ? colorSymbolMap(orderedColorCounts(renderedPattern.value.cells, state.paletteEntries.value).map((entry) => entry.color), state.paletteEntries.value)
  : undefined)
const completedColorCounts = computed(() => {
  const rendered = renderedPattern.value
  const progress = state.tracker.value?.progress
  if (!rendered || !progress) return {}
  const counts: Record<string, number> = {}
  rendered.cells.forEach((row, rowIndex) => row.forEach((color, columnIndex) => {
    if (!isStitchCompleted(rendered.cellIds[rowIndex][columnIndex], progress)) return
    counts[color] = (counts[color] ?? 0) + 1
  }))
  return counts
})
const percentage = computed(() => state.totalCount.value === 0 ? 0 : Math.round((state.completedCount.value / state.totalCount.value) * 100))

watch(preferences, (value) => state.setPreferences(value))

async function toggleFullscreen() {
  try {
    if (trackerFullscreen.value) await trackerCanvas.value?.exitFullscreen()
    else await trackerCanvas.value?.enterFullscreen()
  } catch {
    notify(t('tracker.notifications.fullscreenFailed'), 'error')
  }
}

function selectStitch(row: number, column: number) {
  if (renderedPattern.value) state.selectStitch(row, column, renderedPattern.value.cellIds)
}

function selectStitches(cells: Array<[row: number, column: number]>, completed: boolean) {
  if (renderedPattern.value) state.selectStitches(cells, renderedPattern.value.cellIds, completed)
}

function selectRow(row: number) {
  if (renderedPattern.value) state.selectRow(row, renderedPattern.value.cellIds)
}

function toggleFocusedColor(color: string) {
  focusedColor.value = focusedColor.value === color ? null : color
}

function addTrackerComment(row: number, column: number) {
  selectedCommentId.value = state.addComment(row, column, t('tracker.comments.defaultText'))
  showAnnotations.value = true
  addingComment.value = false
}

function confirmReset() {
  state.resetProgress()
  notify(t('tracker.notifications.reset'), 'success')
}

function handleKeyboardShortcuts(event: KeyboardEvent) {
  const target = event.target as HTMLElement | null
  if (target?.closest('input, textarea, select, [contenteditable="true"]')) return
  if (event.key === 'Escape' && addingComment.value) {
    addingComment.value = false
    return
  }
  if (resetModalOpen.value || event.altKey || (!event.metaKey && !event.ctrlKey)) return
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

onMounted(() => window.addEventListener('keydown', handleKeyboardShortcuts))
onBeforeUnmount(() => window.removeEventListener('keydown', handleKeyboardShortcuts))
</script>

<template>
  <div class="space-y-4 text-base-content">
    <div class="mx-auto max-w-360 space-y-4 p-3 sm:p-5">
      <TrackerProgressHeader
        :autosave-status="pattern.autosaveStatus.value"
        :completed-count="state.completedCount.value"
        :name="pattern.project.value.name"
        :percentage="percentage"
        :total-count="state.totalCount.value"
        :updated-at="activeTracker.progress.updatedAt"
      />

      <TrackerCanvasPanel
        ref="trackerCanvas"
        :adding-comment="addingComment"
        :annotations="pattern.project.value.annotations"
        :auto-scroll="autoScroll"
        :cell-size="cellSize"
        :completed-count="state.completedCount.value"
        :display="display"
        :focused-color="focusedColor"
        :focus-mode="focusMode"
        :focus-style="focusStyle"
        :focus-neighbor-rows="focusNeighborRows"
        :progress="activeTracker.progress"
        :rendered-pattern="renderedPattern"
        :selected-comment-id="selectedCommentId"
        :show-annotations="showAnnotations"
        :symbols="trackerSymbolMap"
        :too-large="tooLarge"
        :total-count="state.totalCount.value"
        @stitch="selectStitch"
        @stitches="selectStitches"
        @add-comment="addTrackerComment"
        @update-comment="state.updateComment"
        @remove-comment="state.removeComment"
        @row="selectRow"
        @fullscreen-change="trackerFullscreen = $event"
      >
        <template #toolbar>
          <TrackerToolbar
            v-model:adding-comment="addingComment"
            v-model:auto-scroll="autoScroll"
            v-model:cell-size="cellSize"
            v-model:display="display"
            v-model:focus-mode="focusMode"
            v-model:focus-style="focusStyle"
            v-model:focus-neighbor-rows="focusNeighborRows"
            v-model:show-annotations="showAnnotations"
            v-model:show-symbols="showSymbols"
            v-model:timer-open="timerOpen"
            :elapsed-milliseconds="elapsedMilliseconds"
            :formatted-time="formattedTime"
            :fullscreen="trackerFullscreen"
            :fullscreen-supported="fullscreenSupported"
            :include-annotations="includeAnnotations"
            :keep-awake="keepAwake"
            :state="state"
            :timer-running="timerRunning"
            :wake-lock-supported="wakeLockSupported"
            @update:keep-awake="setKeepAwake"
            @update:include-annotations="emit('update:includeAnnotations', $event)"
            @close="emit('close')"
            @save="emit('save')"
            @png="emit('png')"
            @print="emit('print', $event)"
            @sessions="sessionsModalOpen = true"
            @tools="toolsModalOpen = true"
            @reset="resetModalOpen = true"
            @toggle-fullscreen="toggleFullscreen"
          />
        </template>
      </TrackerCanvasPanel>

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
    </div>
  </div>

  <TrackerToolsModal
    v-model:open="toolsModalOpen"
    :row-ids="pattern.project.value.rowIds"
    :state="state"
  />
  <TrackerSessionsModal
    v-model:open="sessionsModalOpen"
    :now="timerNow"
    :state="state"
  />
  <TrackerCongratulations
    :name="pattern.project.value.name"
    :state="state"
  />
  <TrackerResetModal
    v-model:open="resetModalOpen"
    @confirm="confirmReset"
  />
  <NotificationToast
    close-label-key="tracker.notifications.close"
    dismiss-aria-key="tracker.notifications.dismissAria"
    :notifications="notifications"
    @dismiss="dismiss"
  />
</template>
