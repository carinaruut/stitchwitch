<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import WorkspaceActions from '../../../../shell/components/WorkspaceActions.vue'
import type { TrackerController } from '../../composables/useTracker'
import type { PatternDisplay, PrintMode, WrittenInstructionFormat } from '../../../../types/pattern'
import type { TrackerCompletionMode, TrackerDirection, TrackerFocusStyle, TrackerStartRow } from '../../../../types/tracker'
import TrackerDisplayDropdown from '../settings/TrackerDisplayDropdown.vue'
import TrackerOrderDropdown from '../settings/TrackerOrderDropdown.vue'
import TrackerTimerControls from './TrackerTimerControls.vue'

const props = defineProps<{
  addingComment: boolean
  autoScroll: boolean
  cellSize: number
  display: PatternDisplay
  elapsedMilliseconds: number
  formattedTime: string
  fullscreen: boolean
  fullscreenSupported: boolean
  includeAnnotations: boolean
  keepAwake: boolean
  showAnnotations: boolean
  showSymbols: boolean
  state: TrackerController
  timerOpen: boolean
  timerRunning: boolean
  wakeLockSupported: boolean
  focusMode: boolean
  focusStyle: TrackerFocusStyle
  focusNeighborRows: number
}>()
const emit = defineEmits<{
  close: []
  png: []
  print: [mode: PrintMode]
  instructions: [format: WrittenInstructionFormat]
  reset: []
  save: []
  sessions: []
  tools: []
  'toggle-fullscreen': []
  'update:addingComment': [value: boolean]
  'update:autoScroll': [value: boolean]
  'update:cellSize': [value: number]
  'update:display': [value: PatternDisplay]
  'update:includeAnnotations': [value: boolean]
  'update:keepAwake': [value: boolean]
  'update:showAnnotations': [value: boolean]
  'update:showSymbols': [value: boolean]
  'update:timerOpen': [value: boolean]
  'update:focusMode': [value: boolean]
  'update:focusStyle': [value: TrackerFocusStyle]
  'update:focusNeighborRows': [value: number]
}>()
const { t } = useI18n({ useScope: 'global' })

function changeStartRow(value: TrackerStartRow) {
  const tracker = props.state.tracker.value
  if (tracker) props.state.setOrder(value, tracker.progress.firstRowDirection, tracker.progress.alternateRows)
}

function changeDirection(value: TrackerDirection) {
  const tracker = props.state.tracker.value
  if (tracker) props.state.setOrder(tracker.progress.startRow, value, tracker.progress.alternateRows)
}

function changeAlternation(value: boolean) {
  const tracker = props.state.tracker.value
  if (tracker) props.state.setOrder(tracker.progress.startRow, tracker.progress.firstRowDirection, value)
}

function changeCompletionMode(value: TrackerCompletionMode) {
  props.state.setCompletionMode(value)
}

function toggleAddingComment() {
  const value = !props.addingComment
  emit('update:addingComment', value)
  if (value) emit('update:showAnnotations', true)
}
</script>

<template>
  <div
    class="app-toolbar rounded-box border border-base-300 bg-base-200/70"
    role="toolbar"
    :aria-label="t('tracker.actions.label')"
  >
    <TrackerOrderDropdown
      :completion-mode="state.tracker.value!.progress.completionMode"
      :start-row="state.tracker.value!.progress.startRow"
      :first-row-direction="state.tracker.value!.progress.firstRowDirection"
      :alternate-rows="state.tracker.value!.progress.alternateRows"
      :disabled="state.completedCount.value > 0"
      @update:completion-mode="changeCompletionMode"
      @update:start-row="changeStartRow"
      @update:first-row-direction="changeDirection"
      @update:alternate-rows="changeAlternation"
    />
    <div class="flex items-center gap-1">
      <div
        class="tooltip"
        :data-tip="t('tracker.actions.undo')"
      >
        <button
          class="btn btn-ghost btn-sm"
          type="button"
          :disabled="!state.canUndo.value"
          :aria-label="t('tracker.actions.undo')"
          aria-keyshortcuts="Control+Z Meta+Z"
          @click="state.undo"
        >
          <span
            class="mdi mdi-undo text-xl"
            aria-hidden="true"
          />
        </button>
      </div>
      <div
        class="tooltip"
        :data-tip="t('tracker.actions.redo')"
      >
        <button
          class="btn btn-ghost btn-sm"
          type="button"
          :disabled="!state.canRedo.value"
          :aria-label="t('tracker.actions.redo')"
          aria-keyshortcuts="Control+Y Control+Shift+Z Meta+Shift+Z"
          @click="state.redo"
        >
          <span
            class="mdi mdi-redo text-xl"
            aria-hidden="true"
          />
        </button>
      </div>
    </div>
    <div class="contents">
      <div
        class="tooltip"
        :data-tip="t('tracker.timer.toggle')"
      >
        <button
          class="btn btn-sm"
          :class="timerOpen ? 'btn-primary' : 'btn-ghost'"
          type="button"
          :aria-label="t('tracker.timer.toggle')"
          :aria-pressed="timerOpen"
          @click="emit('update:timerOpen', !timerOpen)"
        >
          <span
            class="mdi mdi-timer-outline text-xl"
            aria-hidden="true"
          />
        </button>
      </div>
      <div
        class="tooltip"
        :data-tip="t('tracker.sessions.title')"
      >
        <button
          class="btn btn-ghost btn-sm"
          type="button"
          :aria-label="t('tracker.sessions.title')"
          aria-haspopup="dialog"
          @click="emit('sessions')"
        >
          <span
            class="mdi mdi-history text-xl"
            aria-hidden="true"
          />
        </button>
      </div>
      <div
        class="tooltip"
        :data-tip="t('tracker.comments.add')"
      >
        <button
          class="btn btn-sm"
          :class="addingComment ? 'btn-primary' : 'btn-ghost'"
          type="button"
          :aria-label="t('tracker.comments.add')"
          :aria-pressed="addingComment"
          @click="toggleAddingComment"
        >
          <span
            class="mdi mdi-comment-plus-outline text-xl"
            aria-hidden="true"
          />
        </button>
      </div>
      <div
        class="tooltip"
        :data-tip="t('tracker.tools.title')"
      >
        <button
          class="btn btn-ghost btn-sm"
          type="button"
          :aria-label="t('tracker.tools.title')"
          aria-haspopup="dialog"
          @click="emit('tools')"
        >
          <span
            class="mdi mdi-notebook-edit-outline text-xl"
            aria-hidden="true"
          />
        </button>
      </div>
      <div
        v-if="fullscreenSupported"
        class="tooltip"
        :data-tip="t(fullscreen ? 'tracker.controls.exitFullscreen' : 'tracker.controls.fullscreen')"
      >
        <button
          class="btn btn-ghost btn-sm"
          type="button"
          :aria-label="t(fullscreen ? 'tracker.controls.exitFullscreen' : 'tracker.controls.fullscreen')"
          @click="emit('toggle-fullscreen')"
        >
          <span
            class="mdi text-xl"
            :class="fullscreen ? 'mdi-fullscreen-exit' : 'mdi-fullscreen'"
            aria-hidden="true"
          />
        </button>
      </div>
      <div
        class="tooltip"
        :data-tip="t('tracker.actions.reset')"
      >
        <button
          class="btn btn-ghost btn-sm text-error"
          type="button"
          :disabled="state.completedCount.value === 0"
          :aria-label="t('tracker.actions.reset')"
          @click="emit('reset')"
        >
          <span
            class="mdi mdi-restart text-xl"
            aria-hidden="true"
          />
        </button>
      </div>
      <WorkspaceActions
        context="tracker"
        :include-annotations="includeAnnotations"
        @update:include-annotations="emit('update:includeAnnotations', $event)"
        @switch="emit('close')"
        @save="emit('save')"
        @png="emit('png')"
        @print="emit('print', $event)"
        @instructions="emit('instructions', $event)"
      >
        <template #settings>
          <TrackerDisplayDropdown
            :display="display"
            :cell-size="cellSize"
            :auto-scroll="autoScroll"
            :show-symbols="showSymbols"
            :show-annotations="showAnnotations"
            :keep-awake="keepAwake"
            :wake-lock-supported="wakeLockSupported"
            :focus-mode="focusMode"
            :focus-style="focusStyle"
            :focus-neighbor-rows="focusNeighborRows"
            @update:display="emit('update:display', $event)"
            @update:cell-size="emit('update:cellSize', $event)"
            @update:auto-scroll="emit('update:autoScroll', $event)"
            @update:show-symbols="emit('update:showSymbols', $event)"
            @update:show-annotations="emit('update:showAnnotations', $event)"
            @update:keep-awake="emit('update:keepAwake', $event)"
            @update:focus-mode="emit('update:focusMode', $event)"
            @update:focus-style="emit('update:focusStyle', $event)"
            @update:focus-neighbor-rows="emit('update:focusNeighborRows', $event)"
          />
        </template>
      </WorkspaceActions>
    </div>
  </div>
  <TrackerTimerControls
    v-if="timerOpen"
    :elapsed-milliseconds="elapsedMilliseconds"
    :formatted-time="formattedTime"
    :running="timerRunning"
    @toggle="timerRunning ? state.pauseTimer() : state.startTimer()"
    @reset="state.resetTimer()"
  />
</template>
