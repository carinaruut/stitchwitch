<script setup lang="ts">
import { computed } from 'vue'
import type { PatternProject } from '../types/pattern'
import { findUsedColors, renderGrid } from '../utils/grid'

const props = defineProps<{ project: PatternProject }>()
const pattern = computed(() => renderGrid(props.project.cells, props.project.horizontalRepeats, props.project.verticalRepeats, props.project.repeatBoxes).cells)
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
  gridTemplateColumns: `7mm repeat(${columns.value}, ${chartCellSize.value}mm)`,
  gridTemplateRows: `7mm repeat(${rows.value}, ${chartCellSize.value}mm)`,
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
        <span v-for="column in columns" :key="`column-${column}`" class="print-column-number">{{ column }}</span>
        <template v-for="(row, rowIndex) in pattern" :key="rowIndex">
          <span class="print-row-number">{{ rowIndex + 1 }}</span>
          <span v-for="(color, columnIndex) in row" :key="columnIndex" class="print-chart-cell" :style="{ backgroundColor: color }"></span>
        </template>
      </div>
    </section>
  </article>
</template>
