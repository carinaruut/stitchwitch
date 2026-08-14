<script setup lang="ts">
import { computed, type CSSProperties } from 'vue'
import type { PatternGrid, PatternProject } from '../types/pattern'
import { renderGrid } from '../utils/grid'
import PrintChart from './PrintChart.vue'

const CHART_WIDTH_MM = 238
const OVERVIEW_HEIGHT_MM = 160
const REPEAT_CHART_HEIGHT_MM = 145
const REPEAT_PAGE_HEIGHT_MM = 170
const READABLE_CELL_MM = 4
const MAX_CELL_MM = 5
const TILE_COLUMNS = 55
const TILE_ROWS = 35
const REPEAT_GAP_MM = 6

interface PrintableChart {
  id: string
  title: string
  description: string
  cells: PatternGrid
  rowHeaders: number[]
  columnHeaders: number[]
  cellSize: number
  style: CSSProperties
  width: number
  height: number
}

interface RepeatPageRow {
  charts: PrintableChart[]
  width: number
  height: number
}

interface RepeatPage {
  rows: RepeatPageRow[]
  height: number
}

const props = defineProps<{ project: PatternProject }>()
const renderedPattern = computed(() => renderGrid(props.project.cells, props.project.horizontalRepeats, props.project.verticalRepeats, props.project.repeatBoxes))
const pattern = computed(() => renderedPattern.value.cells)
const columns = computed(() => pattern.value[0].length)
const rows = computed(() => pattern.value.length)
const chartCellSize = computed(() => Math.min(MAX_CELL_MM, CHART_WIDTH_MM / (columns.value + 1), OVERVIEW_HEIGHT_MM / (rows.value + 1)))
const chartStyle = computed(() => ({
  gridTemplateColumns: `repeat(${columns.value + 1}, ${chartCellSize.value}mm)`,
  gridTemplateRows: `repeat(${rows.value + 1}, ${chartCellSize.value}mm)`,
}))

function makeChart(
  id: string,
  title: string,
  description: string,
  cells: PatternGrid,
  rowHeaders: number[],
  columnHeaders: number[],
  cellSize: number,
): PrintableChart {
  const width = (columnHeaders.length + 1) * cellSize
  const chartHeight = (rowHeaders.length + 1) * cellSize
  return {
    id,
    title,
    description,
    cells,
    rowHeaders,
    columnHeaders,
    cellSize,
    style: {
      gridTemplateColumns: `repeat(${columnHeaders.length + 1}, ${cellSize}mm)`,
      gridTemplateRows: `repeat(${rowHeaders.length + 1}, ${cellSize}mm)`,
    },
    width: Math.max(width, 55),
    height: chartHeight + 18,
  }
}

function tileChart(
  id: string,
  title: string,
  description: string,
  cells: PatternGrid,
  rowHeaders: number[],
  columnHeaders: number[],
): PrintableChart[] {
  const rowStarts = Array.from({ length: Math.ceil(cells.length / TILE_ROWS) }, (_, index) => index * TILE_ROWS)
  const columnStarts = Array.from({ length: Math.ceil(columnHeaders.length / TILE_COLUMNS) }, (_, index) => index * TILE_COLUMNS)
  const total = rowStarts.length * columnStarts.length
  let tileNumber = 0

  return rowStarts.flatMap((coreTop) => columnStarts.map((coreLeft) => {
    tileNumber += 1
    const top = coreTop === 0 ? 0 : coreTop - 1
    const left = coreLeft === 0 ? 0 : coreLeft - 1
    const bottom = Math.min(cells.length, coreTop + TILE_ROWS)
    const right = Math.min(columnHeaders.length, coreLeft + TILE_COLUMNS)
    return makeChart(
      `${id}-${tileNumber}`,
      `${title} · Part ${tileNumber} of ${total}`,
      `${description} · Chart rows ${top + 1}-${bottom}, columns ${left + 1}-${right}`,
      cells.slice(top, bottom).map((row) => row.slice(left, right)),
      rowHeaders.slice(top, bottom),
      columnHeaders.slice(left, right),
      READABLE_CELL_MM,
    )
  }))
}

const detailCharts = computed(() => {
  if (chartCellSize.value >= READABLE_CELL_MM) return []
  return tileChart(
    'full-chart',
    'Full stitch chart detail',
    'Adjacent pages overlap by one stitch',
    pattern.value,
    renderedPattern.value.rowHeaders,
    renderedPattern.value.columnHeaders,
  )
})

const repeatCharts = computed(() => props.project.repeatBoxes
  .filter((box) => box.enabled)
  .flatMap((box, index) => {
    const top = box.top
    const left = box.left
    const bottom = box.direction === 'down' ? top + (box.bottom - top) / box.sections : box.bottom
    const right = box.direction === 'across' ? left + (box.right - left) / box.sections : box.right
    const cells = renderedPattern.value.cells.slice(top, bottom).map((row) => row.slice(left, right))
    const rowHeaders = Array.from({ length: bottom - top }, (_, row) => top + row)
    const columnHeaders = Array.from({ length: right - left }, (_, column) => left + column)
    const title = `Repeat ${index + 1} source section`
    const description = `Rows ${top + 1}-${bottom}, columns ${left + 1}-${right} · ${box.direction === 'across' ? 'Across' : 'Down'}`
    const fittedCellSize = Math.min(MAX_CELL_MM, CHART_WIDTH_MM / (columnHeaders.length + 1), REPEAT_CHART_HEIGHT_MM / (rowHeaders.length + 1))

    if (fittedCellSize < READABLE_CELL_MM) {
      return tileChart(box.id, title, description, cells, rowHeaders, columnHeaders)
    }
    return [makeChart(box.id, title, description, cells, rowHeaders, columnHeaders, fittedCellSize)]
  }))

const repeatPages = computed(() => {
  const pages: RepeatPage[] = []

  for (const chart of repeatCharts.value) {
    let page = pages.at(-1)
    let row = page?.rows.at(-1)
    const widthWithGap = row ? row.width + REPEAT_GAP_MM + chart.width : chart.width
    const rowHeightIncrease = row ? Math.max(row.height, chart.height) - row.height : chart.height

    if (page && row && widthWithGap <= CHART_WIDTH_MM && page.height + rowHeightIncrease <= REPEAT_PAGE_HEIGHT_MM) {
      row.charts.push(chart)
      row.width = widthWithGap
      row.height = Math.max(row.height, chart.height)
      page.height += rowHeightIncrease
      continue
    }

    const nextRowHeight = (page?.rows.length ? REPEAT_GAP_MM : 0) + chart.height
    if (!page || page.height + nextRowHeight > REPEAT_PAGE_HEIGHT_MM) {
      page = { rows: [], height: 0 }
      pages.push(page)
    }

    row = { charts: [chart], width: chart.width, height: chart.height }
    page.rows.push(row)
    page.height += (page.rows.length > 1 ? REPEAT_GAP_MM : 0) + chart.height
  }

  return pages
})
</script>

<template>
  <article class="print-only">
    <header class="print-header">
      <h1>{{ project.name }}</h1>
      <p>{{ columns }} columns by {{ rows }} rows</p>
    </header>

    <section class="print-chart-page">
      <h2>Full stitch chart</h2>
      <PrintChart
        :cells="pattern"
        :row-headers="renderedPattern.rowHeaders"
        :column-headers="renderedPattern.columnHeaders"
        :chart-style="chartStyle"
        label="Numbered full stitch chart overview"
      />
    </section>

    <section v-for="detail in detailCharts" :key="detail.id" class="print-detail-page">
      <h2>{{ detail.title }}</h2>
      <p>{{ detail.description }}</p>
      <PrintChart
        :cells="detail.cells"
        :row-headers="detail.rowHeaders"
        :column-headers="detail.columnHeaders"
        :chart-style="detail.style"
        :label="detail.title"
      />
    </section>

    <section v-for="(page, pageIndex) in repeatPages" :key="pageIndex" class="print-repeat-page">
      <h2>Repeat source charts · Page {{ pageIndex + 1 }} of {{ repeatPages.length }}</h2>
      <div v-for="(row, rowIndex) in page.rows" :key="rowIndex" class="print-repeat-row">
        <article v-for="repeat in row.charts" :key="repeat.id" class="print-repeat-chart" :style="{ width: `${repeat.width}mm` }">
          <h3>{{ repeat.title }}</h3>
          <p>{{ repeat.description }}</p>
          <PrintChart
            :cells="repeat.cells"
            :row-headers="repeat.rowHeaders"
            :column-headers="repeat.columnHeaders"
            :chart-style="repeat.style"
            :label="repeat.title"
          />
        </article>
      </div>
    </section>
  </article>
</template>
