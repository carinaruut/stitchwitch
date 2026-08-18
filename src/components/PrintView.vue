<script setup lang="ts">
import { computed, type CSSProperties } from 'vue'
import { useI18n } from 'vue-i18n'
import type { PatternGrid, PatternProject, PrintMode } from '../types/pattern'
import { countColors, renderGrid } from '../utils/grid'
import { colorSymbolMap, describeColor } from '../utils/colors'
import PrintChart from './PrintChart.vue'

const CHART_WIDTH_MM = 238
const OVERVIEW_HEIGHT_MM = 150
const REPEAT_CHART_HEIGHT_MM = 145
const PAGE_CONTENT_HEIGHT_MM = 170
const READABLE_CELL_MM = 4
const MAX_CELL_MM = 5
const TILE_COLUMNS = 55
const TILE_ROWS = 35
const REPEAT_GAP_MM = 6
const KEY_ENTRIES_PER_PAGE = 52

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

interface PrintPageRow {
  charts: PrintableChart[]
  width: number
  height: number
}

interface PrintPage {
  rows: PrintPageRow[]
  height: number
}

const props = defineProps<{ project: PatternProject; mode: PrintMode }>()
const { n, t } = useI18n({ useScope: 'global' })
const renderedPattern = computed(() => renderGrid(props.project.cells, props.project.horizontalRepeats, props.project.verticalRepeats, props.project.repeatBoxes))
const pattern = computed(() => renderedPattern.value.cells)
const columns = computed(() => pattern.value[0].length)
const rows = computed(() => pattern.value.length)
const chartCellSize = computed(() => Math.min(MAX_CELL_MM, CHART_WIDTH_MM / (columns.value + 1), OVERVIEW_HEIGHT_MM / (rows.value + 1)))
const chartStyle = computed(() => ({
  gridTemplateColumns: `repeat(${columns.value + 1}, ${chartCellSize.value}mm)`,
  gridTemplateRows: `repeat(${rows.value + 1}, ${chartCellSize.value}mm)`,
}))
const legendEntries = computed(() => countColors(pattern.value))
const legendPages = computed(() => props.mode === 'color'
  ? Array.from(
      { length: Math.ceil(legendEntries.value.length / KEY_ENTRIES_PER_PAGE) },
      (_, index) => legendEntries.value.slice(index * KEY_ENTRIES_PER_PAGE, (index + 1) * KEY_ENTRIES_PER_PAGE),
    )
  : [])
const printSymbolMap = computed(() => colorSymbolMap(legendEntries.value.map(({ color }) => color)))
const symbolEntries = computed(() => legendEntries.value.filter(({ color }) => color.toLowerCase() !== '#ffffff').map((entry) => ({
  ...entry,
  symbol: printSymbolMap.value[entry.color],
})))
const symbolMap = computed(() => props.mode === 'symbols'
  ? Object.fromEntries(symbolEntries.value.map(({ color, symbol }) => [color, symbol]))
  : undefined)
const symbolKeyPages = computed(() => {
  if (props.mode !== 'symbols') return []
  return Array.from(
    { length: Math.ceil(symbolEntries.value.length / KEY_ENTRIES_PER_PAGE) },
    (_, index) => symbolEntries.value.slice(index * KEY_ENTRIES_PER_PAGE, (index + 1) * KEY_ENTRIES_PER_PAGE),
  )
})

function stitchCount(count: number) {
  return t(count === 1 ? 'print.oneStitch' : 'print.stitches', { count: n(count, 'integer') })
}

function colorName(color: string) {
  const description = describeColor(color)
  const name = t(`print.colors.${description.name}`)
  return description.tone
    ? t('print.colorWithTone', { tone: t(`print.tones.${description.tone}`), color: name })
    : name
}

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
    const top = coreTop
    const left = coreLeft
    const bottom = Math.min(cells.length, coreTop + TILE_ROWS)
    const right = Math.min(columnHeaders.length, coreLeft + TILE_COLUMNS)
    return makeChart(
      `${id}-${tileNumber}`,
      t('print.partTitle', { title, part: tileNumber, total }),
      t('print.tileDescription', {
        description,
        firstRow: top + 1,
        lastRow: bottom,
        firstColumn: left + 1,
        lastColumn: right,
      }),
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
    t('print.fullChartDetail'),
    t('print.detailDescription'),
    pattern.value,
    renderedPattern.value.rowHeaders,
    renderedPattern.value.columnHeaders,
  )
})

function packCharts(charts: PrintableChart[]): PrintPage[] {
  const pages: PrintPage[] = []

  for (const chart of charts) {
    let page = pages.at(-1)
    let row = page?.rows.at(-1)
    const widthWithGap = row ? row.width + REPEAT_GAP_MM + chart.width : chart.width
    const rowHeightIncrease = row ? Math.max(row.height, chart.height) - row.height : chart.height

    if (page && row && widthWithGap <= CHART_WIDTH_MM && page.height + rowHeightIncrease <= PAGE_CONTENT_HEIGHT_MM) {
      row.charts.push(chart)
      row.width = widthWithGap
      row.height = Math.max(row.height, chart.height)
      page.height += rowHeightIncrease
      continue
    }

    const nextRowHeight = (page?.rows.length ? REPEAT_GAP_MM : 0) + chart.height
    if (!page || page.height + nextRowHeight > PAGE_CONTENT_HEIGHT_MM) {
      page = { rows: [], height: 0 }
      pages.push(page)
    }

    row = { charts: [chart], width: chart.width, height: chart.height }
    page.rows.push(row)
    page.height += (page.rows.length > 1 ? REPEAT_GAP_MM : 0) + chart.height
  }

  return pages
}

const detailPages = computed(() => packCharts(detailCharts.value))

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
    const title = t('print.repeatSourceTitle', { number: index + 1 })
    const description = t('print.repeatSourceDescription', {
      firstRow: top + 1,
      lastRow: bottom,
      firstColumn: left + 1,
      lastColumn: right,
      direction: t(`print.direction.${box.direction}`),
    })
    const fittedCellSize = Math.min(MAX_CELL_MM, CHART_WIDTH_MM / (columnHeaders.length + 1), REPEAT_CHART_HEIGHT_MM / (rowHeaders.length + 1))

    if (fittedCellSize < READABLE_CELL_MM) {
      return tileChart(box.id, title, description, cells, rowHeaders, columnHeaders)
    }
    return [makeChart(box.id, title, description, cells, rowHeaders, columnHeaders, fittedCellSize)]
  }))

const repeatPages = computed(() => packCharts(repeatCharts.value))
</script>

<template>
  <article class="print-only">
    <section class="print-chart-page">
      <header class="print-header">
        <h1>{{ project.name }}</h1>
        <p>{{ t('print.dimensions', { columns, rows }) }}</p>
      </header>
      <h2>{{ t('print.fullChart') }}</h2>
      <PrintChart
        :cells="pattern"
        :row-headers="renderedPattern.rowHeaders"
        :column-headers="renderedPattern.columnHeaders"
        :chart-style="chartStyle"
        :label="t(`print.overviewLabel.${mode === 'symbols' ? 'symbols' : 'color'}`)"
        :symbols="symbolMap"
      />
    </section>

    <div
      v-if="symbolKeyPages.length"
      class="print-page-group"
      :class="{ 'print-page-group-multiple': symbolKeyPages.length > 1 }"
    >
      <section
        v-for="(entries, pageIndex) in symbolKeyPages"
        :key="`symbol-${pageIndex}`"
        class="print-symbol-key-page"
        :class="{ 'print-start-page': pageIndex > 0 }"
      >
        <h2>{{ t('print.symbolKeyTitle', { page: pageIndex + 1, total: symbolKeyPages.length }) }}</h2>
        <p>{{ t('print.symbolKeyDescription') }}</p>
        <div class="print-symbol-key">
          <div
            v-for="entry in entries"
            :key="entry.color"
            class="print-symbol-key-entry"
          >
            <span class="print-symbol-key-mark">{{ entry.symbol }}</span>
            <span>{{ colorName(entry.color) }}</span>
            <strong class="print-key-count">{{ stitchCount(entry.count) }}</strong>
          </div>
        </div>
      </section>
    </div>

    <div
      v-if="legendPages.length"
      class="print-page-group"
      :class="{ 'print-page-group-multiple': legendPages.length > 1 }"
    >
      <section
        v-for="(entries, pageIndex) in legendPages"
        :key="`color-${pageIndex}`"
        class="print-color-key-page"
        :class="{ 'print-start-page': pageIndex > 0 }"
      >
        <h2>{{ t('print.colorLegendTitle', { page: pageIndex + 1, total: legendPages.length }) }}</h2>
        <p>{{ t('print.colorLegendDescription') }}</p>
        <div class="print-symbol-key">
          <div
            v-for="entry in entries"
            :key="entry.color"
            class="print-symbol-key-entry"
          >
            <span
              class="print-color-key-mark"
              :style="{ backgroundColor: entry.color }"
            />
            <span>{{ entry.color.toUpperCase() }}</span>
            <strong class="print-key-count">{{ stitchCount(entry.count) }}</strong>
          </div>
        </div>
      </section>
    </div>

    <section
      v-for="(page, pageIndex) in detailPages"
      :key="`detail-${pageIndex}`"
      class="print-detail-page"
    >
      <div
        v-for="(row, rowIndex) in page.rows"
        :key="rowIndex"
        class="print-repeat-row"
      >
        <article
          v-for="detail in row.charts"
          :key="detail.id"
          class="print-repeat-chart"
          :style="{ width: `${detail.width}mm` }"
        >
          <h2>{{ detail.title }}</h2>
          <p>{{ detail.description }}</p>
          <PrintChart
            :cells="detail.cells"
            :row-headers="detail.rowHeaders"
            :column-headers="detail.columnHeaders"
            :chart-style="detail.style"
            :label="detail.title"
            :symbols="symbolMap"
          />
        </article>
      </div>
    </section>

    <div
      v-if="repeatPages.length"
      class="print-page-group"
      :class="{ 'print-page-group-multiple': repeatPages.length > 1 }"
    >
      <section
        v-for="(page, pageIndex) in repeatPages"
        :key="`repeat-${pageIndex}`"
        class="print-repeat-page"
        :class="{ 'print-start-page': pageIndex > 0 }"
      >
        <h2>{{ t('print.repeatChartsTitle', { page: pageIndex + 1, total: repeatPages.length }) }}</h2>
        <div
          v-for="(row, rowIndex) in page.rows"
          :key="rowIndex"
          class="print-repeat-row"
        >
          <article
            v-for="repeat in row.charts"
            :key="repeat.id"
            class="print-repeat-chart"
            :style="{ width: `${repeat.width}mm` }"
          >
            <h3>{{ repeat.title }}</h3>
            <p>{{ repeat.description }}</p>
            <PrintChart
              :cells="repeat.cells"
              :row-headers="repeat.rowHeaders"
              :column-headers="repeat.columnHeaders"
              :chart-style="repeat.style"
              :label="repeat.title"
              :symbols="symbolMap"
            />
          </article>
        </div>
      </section>
    </div>
  </article>
</template>
