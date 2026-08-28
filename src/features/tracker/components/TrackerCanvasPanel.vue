<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { PatternAnnotation, PatternDisplay } from '../../../types/pattern'
import type { TrackerFocusStyle, TrackerProgress } from '../../../types/tracker'
import type { RenderedGrid } from '../../../utils/grid'
import TrackerGrid from './TrackerGrid.vue'

defineProps<{
  addingComment: boolean
  annotations: PatternAnnotation[]
  autoScroll: boolean
  cellSize: number
  completedCount: number
  display: PatternDisplay
  focusedColor: string | null
  progress: TrackerProgress
  renderedPattern: RenderedGrid | null
  selectedCommentId: string | null
  showAnnotations: boolean
  symbols?: Record<string, string>
  tooLarge: boolean
  totalCount: number
  focusMode: boolean
  focusStyle: TrackerFocusStyle
  focusNeighborRows: number
}>()
const emit = defineEmits<{
  'add-comment': [row: number, column: number]
  'fullscreen-change': [active: boolean]
  'remove-comment': [id: string]
  row: [row: number]
  stitch: [row: number, column: number]
  stitches: [cells: Array<[row: number, column: number]>, completed: boolean]
  'update-comment': [id: string, text: string]
}>()
const { n, t } = useI18n({ useScope: 'global' })
const trackerGrid = ref<InstanceType<typeof TrackerGrid> | null>(null)

function handleStitch(row: number, column: number) {
  emit('stitch', row, column)
}

function handleStitches(cells: Array<[row: number, column: number]>, completed: boolean) {
  emit('stitches', cells, completed)
}

function handleAddComment(row: number, column: number) {
  emit('add-comment', row, column)
}

function handleUpdateComment(id: string, text: string) {
  emit('update-comment', id, text)
}

async function enterFullscreen() {
  await trackerGrid.value?.enterFullscreen()
}

async function exitFullscreen() {
  await trackerGrid.value?.exitFullscreen()
}

defineExpose({ enterFullscreen, exitFullscreen })
</script>

<template>
  <section class="card border border-base-300 bg-base-100">
    <div class="card-body app-card-body">
      <slot name="toolbar" />
      <p
        v-if="completedCount > 0"
        class="text-xs text-base-content/55"
      >
        {{ t('tracker.instructions.resetOrder') }}
      </p>
      <p class="text-sm text-base-content/65">
        {{ t(addingComment ? 'tracker.comments.addInstruction' : progress.completionMode === 'individual' ? 'tracker.instructions.individualUsage' : 'tracker.instructions.usage') }}
      </p>

      <div
        v-if="tooLarge"
        class="alert alert-error"
      >
        <span
          class="mdi mdi-grid-off text-xl"
          aria-hidden="true"
        />
        <span>{{ t('tracker.errors.oversized', { total: n(totalCount, 'integer') }) }}</span>
      </div>
      <TrackerGrid
        v-else-if="renderedPattern"
        ref="trackerGrid"
        :cells="renderedPattern.cells"
        :cell-ids="renderedPattern.cellIds"
        :row-headers="renderedPattern.rowHeaders"
        :column-headers="renderedPattern.columnHeaders"
        :repeat-flags="renderedPattern.repeatFlags"
        :repeat-color-indices="renderedPattern.repeatColorIndices"
        :cell-size="cellSize"
        :display="display"
        :progress="progress"
        :auto-scroll="autoScroll"
        :symbols="symbols"
        :focused-color="focusedColor"
        :annotations="annotations"
        :cell-source-rows="renderedPattern.sourceRows"
        :cell-source-columns="renderedPattern.sourceColumns"
        :show-annotations="showAnnotations"
        :adding-comment="addingComment"
        :selected-comment-id="selectedCommentId"
        :focus-mode="focusMode"
        :focus-style="focusStyle"
        :focus-neighbor-rows="focusNeighborRows"
        @stitch="handleStitch"
        @stitches="handleStitches"
        @add-comment="handleAddComment"
        @update-comment="handleUpdateComment"
        @remove-comment="emit('remove-comment', $event)"
        @row="emit('row', $event)"
        @fullscreen-change="emit('fullscreen-change', $event)"
      />
    </div>
  </section>
</template>
