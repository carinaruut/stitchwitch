<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { PatternState } from '../composables/usePattern'
import type { DrawingTool } from '../../../types/pattern'
import type { RenderedGrid } from '../../../utils/grid'
import AnnotationEditor from '../../annotations/components/AnnotationEditor.vue'
import ReferenceImage from '../../reference-image/components/ReferenceImage.vue'
import PatternGrid from './grid/PatternGrid.vue'

type SelectionAction = 'move' | 'copy' | 'paste' | 'flip-horizontal' | 'flip-vertical' | 'rotate-clockwise' | 'rotate-counterclockwise' | 'fill' | 'erase'

const props = defineProps<{
  pattern: PatternState
  renderedPattern: RenderedGrid
  canvasFullHeight: boolean
  symbols?: Record<string, string>
  placingSelection: boolean
  referenceOpen: boolean
}>()
const emit = defineEmits<{
  selectTool: [tool: DrawingTool]
  'update:placingSelection': [value: boolean]
  'update:referenceOpen': [value: boolean]
  notify: [message: string, kind: 'success' | 'error']
}>()
const { t } = useI18n({ useScope: 'global' })
const pattern = props.pattern
const selectedCommentId = ref<string | null>(null)
const selectedAnnotation = computed(() => pattern.project.value.annotations.find(annotation => annotation.id === pattern.selectedAnnotationId.value) ?? null)

function beginStroke() {
  if (pattern.tool.value !== 'eyedropper') pattern.beginGridChange()
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

function selectRowHeader(row: number, extend: boolean, toggle: boolean) {
  if (toggle) pattern.clearRowSelection()
  else pattern.selectRow(row, extend, true)
  if (pattern.setHeaderSelection('row')) emit('selectTool', 'select')
}

function selectColumnHeader(column: number, extend: boolean, toggle: boolean) {
  if (toggle) pattern.clearColumnSelection()
  else pattern.selectColumn(column, extend, true)
  if (pattern.setHeaderSelection('column')) emit('selectTool', 'select')
}

function selectionResult(success: boolean, successKey: string) {
  emit('notify', t(success ? successKey : 'editor.errors.selectionLimit'), success ? 'success' : 'error')
}

function handleSelectionAction(action: SelectionAction) {
  if (action === 'move') emit('update:placingSelection', pattern.hasSelection.value)
  if (action === 'copy' && pattern.copySelection()) emit('notify', t('editor.notifications.selectionCopied'), 'success')
  if (action === 'paste') selectionResult(pattern.pasteSelection(), 'editor.notifications.selectionPasted')
  if (action === 'flip-horizontal' || action === 'flip-vertical') {
    const direction = action === 'flip-horizontal' ? 'horizontal' : 'vertical'
    if (pattern.mirrorSelection(direction)) emit('notify', t('editor.notifications.selectionFlipped', { direction: t(`editor.directions.${direction}`) }), 'success')
  }
  if (action === 'rotate-clockwise' || action === 'rotate-counterclockwise') {
    const direction = action === 'rotate-clockwise' ? 'clockwise' : 'counterclockwise'
    if (pattern.rotateSelection(direction)) emit('notify', t('editor.notifications.selectionRotated', { direction: t(`editor.directions.${direction}`) }), 'success')
    else emit('notify', t('editor.errors.selectionLimit'), 'error')
  }
  if (action === 'fill') pattern.fillSelection(pattern.selectedColor.value)
  if (action === 'erase') pattern.eraseSelection()
}

function placeSelection(row: number, column: number) {
  if (!props.placingSelection) return
  selectionResult(pattern.moveSelectionTo(row, column), 'editor.notifications.selectionMoved')
  emit('update:placingSelection', false)
}

function createAnnotation(type: 'text' | 'marker' | 'arrow', row: number, column: number, endRow: number, endColumn: number) {
  const id = pattern.addAnnotation(type, row, column, endRow, endColumn, t('controls.annotations.defaultText'))
  if (type === 'text') selectedCommentId.value = id
}

function moveAnnotationEndpoint(id: string, rowDelta: number, columnDelta: number) {
  const annotation = pattern.project.value.annotations.find(candidate => candidate.id === id)
  if (annotation?.type === 'arrow') pattern.updateAnnotation(id, { endRow: annotation.endRow + rowDelta, endColumn: annotation.endColumn + columnDelta })
}

function pickReferenceColor(color: string) {
  pattern.chooseColor(color, true)
  pattern.tool.value = 'pencil'
  emit('notify', t('editor.notifications.referenceColorPicked', { color: color.toUpperCase() }), 'success')
}

function moveSelectionDirectly(row: number, column: number) {
  selectionResult(pattern.moveSelectionTo(row, column), 'editor.notifications.selectionMoved')
}

function updateAnnotationText(id: string, text: string) {
  pattern.updateAnnotation(id, { text })
}

defineExpose({ reset: () => { selectedCommentId.value = null } })
</script>

<template>
  <AnnotationEditor
    v-if="selectedAnnotation && selectedAnnotation.type !== 'text'"
    :annotation="selectedAnnotation"
    :selected-color="pattern.selectedColor.value"
    @update="pattern.updateAnnotation(selectedAnnotation.id, $event)"
    @delete="pattern.removeAnnotation(selectedAnnotation.id)"
  />
  <div
    class="grid min-w-0"
    :class="referenceOpen ? 'gap-3 lg:grid-cols-[minmax(0,1fr)_22rem]' : 'grid-cols-1'"
  >
    <div
      v-show="referenceOpen"
      class="min-w-0 lg:order-2 lg:sticky lg:top-3 lg:self-start"
    >
      <ReferenceImage
        :picking="pattern.tool.value === 'eyedropper'"
        @pick="pickReferenceColor"
        @request-pick="$emit('selectTool', 'eyedropper')"
        @close="$emit('update:referenceOpen', false)"
        @error="$emit('notify', $event, 'error')"
      />
    </div>
    <div class="min-w-0 lg:order-1">
      <PatternGrid
        :cells="renderedPattern.cells"
        :cell-source-rows="renderedPattern.sourceRows"
        :cell-source-columns="renderedPattern.sourceColumns"
        :row-headers="renderedPattern.rowHeaders"
        :column-headers="renderedPattern.columnHeaders"
        :row-copies="renderedPattern.rowCopies"
        :column-copies="renderedPattern.columnCopies"
        :repeat-flags="renderedPattern.repeatFlags"
        :repeat-color-indices="renderedPattern.repeatColorIndices"
        :source-rows="pattern.rowCount.value"
        :source-columns="pattern.columnCount.value"
        :cell-size="pattern.project.value.cellSize"
        :full-height="canvasFullHeight"
        :selected-row="pattern.selectedRow.value"
        :selected-column="pattern.selectedColumn.value"
        :selected-rows="pattern.selectedRows.value"
        :selected-columns="pattern.selectedColumns.value"
        :tool="pattern.tool.value"
        :selection="pattern.selection.value"
        :placing-selection="placingSelection"
        :can-paste="pattern.hasClipboard.value"
        :mirror-horizontal="pattern.mirrorHorizontal.value"
        :mirror-vertical="pattern.mirrorVertical.value"
        :symbols="symbols"
        :annotations="pattern.project.value.annotations"
        :selected-annotation-id="pattern.selectedAnnotationId.value"
        :selected-comment-id="selectedCommentId"
        @stroke-start="beginStroke"
        @paint="pattern.paintCell"
        @stroke-end="pattern.commitColor"
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
        @create-annotation="createAnnotation"
        @select-annotation="pattern.selectedAnnotationId.value = $event"
        @update-annotation="updateAnnotationText"
        @remove-annotation="pattern.removeAnnotation"
        @move-annotation="pattern.moveAnnotation"
        @move-annotation-endpoint="moveAnnotationEndpoint"
      />
    </div>
  </div>
</template>
