<script setup lang="ts">
import { computed } from 'vue'
import type { PatternProject } from '../types/pattern'
import { findUsedColors, renderGrid } from '../utils/grid'

const props = defineProps<{ project: PatternProject }>()
const renderedPattern = computed(() => renderGrid(props.project.cells, props.project.horizontalRepeats, props.project.verticalRepeats, props.project.repeatBoxes))
const pattern = computed(() => renderedPattern.value.cells)
const columns = computed(() => pattern.value[0].length)
const rows = computed(() => pattern.value.length)
const usedColors = computed(() => findUsedColors(pattern.value))
const previewCellSize = computed(() => Math.max(0.4, Math.min(6, 245 / columns.value, 135 / rows.value)))
const chartCellSize = computed(() => Math.max(0.35, Math.min(5, 238 / columns.value, 160 / rows.value)))
const previewStyle = computed(() => ({
  gridTemplateColumns: `repeat(${columns.value}, ${previewCellSize.value}mm)`,
  gridAutoRows: `${previewCellSize.value}mm`,
}))
const chartStyle = computed(() => ({
  gridTemplateColumns: `repeat(${columns.value + 1}, ${chartCellSize.value}mm)`,
  gridTemplateRows: `repeat(${rows.value + 1}, ${chartCellSize.value}mm)`,
}))
</script>

<template>
  <article class="print-only">
    <header class="print-header">
      <h1>{{ project.name }}</h1>
      <p>{{ columns }} columns by {{ rows }} rows</p>
    </header>

    <section class="print-preview-page">
      <h2>Pattern preview</h2>
      <div class="print-preview-grid" :style="previewStyle" aria-label="Pattern color preview">
        <template v-for="(row, rowIndex) in pattern" :key="rowIndex">
          <span v-for="(color, columnIndex) in row" :key="columnIndex" class="print-preview-cell" :style="{ backgroundColor: color }"></span>
        </template>
      </div>

      <div class="print-colors">
        <h2>Used colors</h2>
        <ul>
          <li v-for="color in usedColors" :key="color">
            <span class="print-swatch" :style="{ backgroundColor: color }"></span>{{ color }}
          </li>
        </ul>
      </div>
    </section>

    <section class="print-chart-page">
      <h2>Stitch chart</h2>
      <div class="print-chart" :style="chartStyle" aria-label="Numbered stitch chart">
        <span class="print-chart-corner"></span>
        <span
          v-for="(column, columnIndex) in renderedPattern.columnHeaders"
          :key="`column-${columnIndex}`"
          class="print-column-number"
          :class="{ 'print-section-column-end': (column + 1) % 5 === 0 && columnIndex < columns - 1 }"
        >{{ column + 1 }}</span>
        <template v-for="(row, rowIndex) in pattern" :key="rowIndex">
          <span
            class="print-row-number"
            :class="{ 'print-section-row-end': (renderedPattern.rowHeaders[rowIndex] + 1) % 5 === 0 && rowIndex < rows - 1 }"
          >{{ renderedPattern.rowHeaders[rowIndex] + 1 }}</span>
          <span
            v-for="(color, columnIndex) in row"
            :key="columnIndex"
            class="print-chart-cell"
            :class="{
              'print-section-column-end': (renderedPattern.columnHeaders[columnIndex] + 1) % 5 === 0 && columnIndex < columns - 1,
              'print-section-row-end': (renderedPattern.rowHeaders[rowIndex] + 1) % 5 === 0 && rowIndex < rows - 1,
            }"
            :style="{ backgroundColor: color }"
          ></span>
        </template>
      </div>
    </section>
  </article>
</template>
