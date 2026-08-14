<script setup lang="ts">
import { computed } from 'vue'
import type { PatternProject } from '../types/pattern'
import { renderGrid } from '../utils/grid'

const props = defineProps<{ project: PatternProject }>()
const renderedPattern = computed(() => renderGrid(props.project.cells, props.project.horizontalRepeats, props.project.verticalRepeats, props.project.repeatBoxes))
const pattern = computed(() => renderedPattern.value.cells)
const columns = computed(() => pattern.value[0].length)
const rows = computed(() => pattern.value.length)
const chartCellSize = computed(() => Math.max(0.35, Math.min(5, 238 / columns.value, 160 / rows.value)))
const chartStyle = computed(() => ({
  gridTemplateColumns: `repeat(${columns.value + 1}, ${chartCellSize.value}mm)`,
  gridTemplateRows: `repeat(${rows.value + 1}, ${chartCellSize.value}mm)`,
}))
const repeatCharts = computed(() => props.project.repeatBoxes
  .filter((box) => box.enabled)
  .map((box, index) => {
    const top = box.top
    const left = box.left
    const bottom = box.direction === 'down' ? top + (box.bottom - top) / box.sections : box.bottom
    const right = box.direction === 'across' ? left + (box.right - left) / box.sections : box.right
    const repeatRows = bottom - top
    const repeatColumns = right - left
    const cellSize = Math.max(0.35, Math.min(8, 238 / (repeatColumns + 1), 160 / (repeatRows + 1)))
    return {
      id: box.id,
      title: `Repeat ${index + 1} source section`,
      description: `Rows ${top + 1}-${bottom}, columns ${left + 1}-${right} · ${box.direction === 'across' ? 'Across' : 'Down'}`,
      cells: renderedPattern.value.cells.slice(top, bottom).map((row) => row.slice(left, right)),
      rowHeaders: Array.from({ length: repeatRows }, (_, row) => top + row),
      columnHeaders: Array.from({ length: repeatColumns }, (_, column) => left + column),
      style: {
        gridTemplateColumns: `repeat(${repeatColumns + 1}, ${cellSize}mm)`,
        gridTemplateRows: `repeat(${repeatRows + 1}, ${cellSize}mm)`,
      },
    }
  }))
</script>

<template>
  <article class="print-only">
    <header class="print-header">
      <h1>{{ project.name }}</h1>
      <p>{{ columns }} columns by {{ rows }} rows</p>
    </header>

    <section class="print-chart-page">
      <h2>Full stitch chart</h2>
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

    <section v-for="repeat in repeatCharts" :key="repeat.id" class="print-repeat-page">
      <h2>{{ repeat.title }}</h2>
      <p>{{ repeat.description }}</p>
      <div class="print-chart" :style="repeat.style" :aria-label="repeat.title">
        <span class="print-chart-corner"></span>
        <span
          v-for="(column, columnIndex) in repeat.columnHeaders"
          :key="`repeat-column-${column}`"
          class="print-column-number"
          :class="{ 'print-section-column-end': (column + 1) % 5 === 0 && columnIndex < repeat.columnHeaders.length - 1 }"
        >{{ column + 1 }}</span>
        <template v-for="(row, rowIndex) in repeat.cells" :key="rowIndex">
          <span
            class="print-row-number"
            :class="{ 'print-section-row-end': (repeat.rowHeaders[rowIndex] + 1) % 5 === 0 && rowIndex < repeat.rowHeaders.length - 1 }"
          >{{ repeat.rowHeaders[rowIndex] + 1 }}</span>
          <span
            v-for="(color, columnIndex) in row"
            :key="columnIndex"
            class="print-chart-cell"
            :class="{
              'print-section-column-end': (repeat.columnHeaders[columnIndex] + 1) % 5 === 0 && columnIndex < repeat.columnHeaders.length - 1,
              'print-section-row-end': (repeat.rowHeaders[rowIndex] + 1) % 5 === 0 && rowIndex < repeat.rowHeaders.length - 1,
            }"
            :style="{ backgroundColor: color }"
          ></span>
        </template>
      </div>
    </section>
  </article>
</template>
