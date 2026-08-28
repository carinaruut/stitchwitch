<script setup lang="ts">
import { computed, type CSSProperties } from 'vue'
import type { PatternAnnotation, PatternGrid } from '../../../types/pattern'
import { identitySourceMaps, renderAnnotations } from '../../../utils/annotations'
import AnnotationLayer from '../../annotations/components/AnnotationLayer.vue'

const props = defineProps<{
  cells: PatternGrid
  rowHeaders: number[]
  columnHeaders: number[]
  chartStyle: CSSProperties
  label: string
  symbols?: Record<string, string>
  annotations?: PatternAnnotation[]
  sourceRows?: number[][]
  sourceColumns?: number[][]
  cellSize: number
}>()
const renderedAnnotations = computed(() => {
  if (!props.annotations?.length) return []
  const maps = props.sourceRows && props.sourceColumns
    ? { sourceRows: props.sourceRows, sourceColumns: props.sourceColumns }
    : identitySourceMaps(props.rowHeaders, props.columnHeaders)
  return renderAnnotations(props.annotations, maps.sourceRows, maps.sourceColumns)
})
</script>

<template>
  <div
    class="print-chart"
    :style="chartStyle"
    :aria-label="label"
  >
    <span class="print-chart-corner" />
    <span
      v-for="(column, columnIndex) in columnHeaders"
      :key="`column-${columnIndex}`"
      class="print-column-number"
      :class="{ 'print-section-column-end': (column + 1) % 5 === 0 && columnIndex < columnHeaders.length - 1 }"
    >{{ column + 1 }}</span>
    <template
      v-for="(row, rowIndex) in cells"
      :key="rowIndex"
    >
      <span
        class="print-row-number"
        :class="{ 'print-section-row-end': (rowHeaders[rowIndex] + 1) % 5 === 0 && rowIndex < cells.length - 1 }"
      >{{ rowHeaders[rowIndex] + 1 }}</span>
      <span
        v-for="(color, columnIndex) in row"
        :key="columnIndex"
        class="print-chart-cell"
        :class="{
          'print-symbol-cell': symbols,
          'print-section-column-end': (columnHeaders[columnIndex] + 1) % 5 === 0 && columnIndex < columnHeaders.length - 1,
          'print-section-row-end': (rowHeaders[rowIndex] + 1) % 5 === 0 && rowIndex < cells.length - 1,
        }"
        :style="symbols ? undefined : { backgroundColor: color }"
      >{{ symbols?.[color] }}</span>
    </template>
    <AnnotationLayer
      v-if="renderedAnnotations.length"
      :annotations="renderedAnnotations"
      :rows="cells.length"
      :columns="cells[0].length"
      :header-size="cellSize"
      header-unit="mm"
    />
  </div>
</template>
