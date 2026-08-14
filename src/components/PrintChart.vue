<script setup lang="ts">
import type { CSSProperties } from 'vue'
import type { PatternGrid } from '../types/pattern'

defineProps<{
  cells: PatternGrid
  rowHeaders: number[]
  columnHeaders: number[]
  chartStyle: CSSProperties
  label: string
  symbols?: Record<string, string>
}>()
</script>

<template>
  <div class="print-chart" :style="chartStyle" :aria-label="label">
    <span class="print-chart-corner"></span>
    <span
      v-for="(column, columnIndex) in columnHeaders"
      :key="`column-${columnIndex}`"
      class="print-column-number"
      :class="{ 'print-section-column-end': (column + 1) % 5 === 0 && columnIndex < columnHeaders.length - 1 }"
    >{{ column + 1 }}</span>
    <template v-for="(row, rowIndex) in cells" :key="rowIndex">
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
  </div>
</template>
