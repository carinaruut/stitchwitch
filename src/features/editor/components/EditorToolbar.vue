<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { PatternState } from '../composables/usePattern'
import type { DrawingTool, PrintMode, RepeatBoxInput } from '../../../types/pattern'
import ColorMenu from '../../palette/components/ColorMenu.vue'
import RepeatMenu from '../../repeats/components/RepeatMenu.vue'
import WorkspaceActions from '../../../shell/components/WorkspaceActions.vue'
import ColumnMenu from './toolbar/ColumnMenu.vue'
import DrawingTools from './toolbar/DrawingTools.vue'
import GridMenu from './toolbar/GridMenu.vue'
import RowMenu from './toolbar/RowMenu.vue'

const props = defineProps<{
  pattern: PatternState
  placingSelection: boolean
  referenceOpen: boolean
  canvasFullHeight: boolean
  canvasSymbols: boolean
  includeAnnotations: boolean
}>()
const emit = defineEmits<{
  selectTool: [tool: DrawingTool]
  clear: []
  cancelPlacement: []
  toggleReference: []
  switchWorkspace: []
  save: []
  png: []
  print: [mode?: PrintMode]
  repeatSaved: [updated: boolean]
  'update:canvasFullHeight': [value: boolean]
  'update:canvasSymbols': [value: boolean]
  'update:includeAnnotations': [value: boolean]
}>()
const { t } = useI18n({ useScope: 'global' })
const pattern = props.pattern

function deleteRows(value: string) {
  if (pattern.selectRows(value)) pattern.deleteSelectedRows()
}

function deleteColumns(value: string) {
  if (pattern.selectColumns(value)) pattern.deleteSelectedColumns()
}

function saveRepeatBox(input: RepeatBoxInput, id: string | null, complete: (error: string | null) => void) {
  const error = pattern.saveRepeatBox(input, id)
  complete(error)
  if (!error) emit('repeatSaved', Boolean(id))
}
</script>

<template>
  <DrawingTools
    :tool="pattern.tool.value"
    :placing-selection="placingSelection"
    :mirror-horizontal="pattern.mirrorHorizontal.value"
    :mirror-vertical="pattern.mirrorVertical.value"
    :reference-open="referenceOpen"
    @select="$emit('selectTool', $event)"
    @toggle-mirror-horizontal="pattern.mirrorHorizontal.value = !pattern.mirrorHorizontal.value"
    @toggle-mirror-vertical="pattern.mirrorVertical.value = !pattern.mirrorVertical.value"
    @toggle-reference="$emit('toggleReference')"
    @cancel-placement="$emit('cancelPlacement')"
    @clear="$emit('clear')"
  >
    <template #color>
      <ColorMenu
        :color="pattern.selectedColor.value"
        :recent-colors="pattern.recentColors.value"
        :swatches="pattern.project.value.swatches"
        @select="pattern.chooseColor($event)"
        @screen-pick="pattern.chooseColor($event, true)"
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
    <template #actions>
      <WorkspaceActions
        context="editor"
        :include-annotations="includeAnnotations"
        @update:include-annotations="$emit('update:includeAnnotations', $event)"
        @switch="$emit('switchWorkspace')"
        @save="$emit('save')"
        @png="$emit('png')"
        @print="$emit('print', $event)"
      >
        <template #settings>
          <GridMenu
            :cell-size="pattern.project.value.cellSize"
            :full-height="canvasFullHeight"
            :show-symbols="canvasSymbols"
            @cell-size="pattern.project.value.cellSize = $event"
            @full-height="$emit('update:canvasFullHeight', $event)"
            @show-symbols="$emit('update:canvasSymbols', $event)"
          />
        </template>
      </WorkspaceActions>
    </template>
  </DrawingTools>
</template>
