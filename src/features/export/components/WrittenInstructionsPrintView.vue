<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { WrittenInstructionDocument } from '../domain/buildWrittenInstructions'
import { writtenInstructionColorName } from '../domain/buildWrittenInstructions'

const props = defineProps<{ document: WrittenInstructionDocument }>()
const { n, t } = useI18n({ useScope: 'global' })
const legend = computed(() => new Map(props.document.legend.map(entry => [entry.color, entry])))

function stitchCount(count: number) {
  return t(count === 1 ? 'print.oneStitch' : 'print.stitches', { count: n(count, 'integer') })
}

function runLabel(color: string, count: number) {
  const entry = legend.value.get(color)
  return t('print.instructions.run', {
    count: n(count, 'integer'),
    name: entry ? writtenInstructionColorName(entry, t) : color.toUpperCase(),
    symbol: entry?.symbol ? t('print.instructions.runSymbol', { symbol: entry.symbol }) : '',
  }).trim()
}
</script>

<template>
  <div class="print-only print-instructions-page">
    <header class="print-instructions-header">
      <h1>{{ t('print.instructions.title', { name: document.projectName }) }}</h1>
      <p>{{ t('print.dimensions', { columns: n(document.columns, 'integer'), rows: n(document.rows, 'integer') }) }}</p>
      <p>{{ t('print.instructions.total', { count: stitchCount(document.totalStitches) }) }}</p>
      <p>
        {{ t('print.instructions.order', {
          start: t(`print.instructions.start.${document.order.startRow}`),
          direction: t(`print.instructions.direction.${document.order.firstRowDirection}`),
          alternating: t(document.order.alternateRows ? 'print.instructions.alternating.yes' : 'print.instructions.alternating.no'),
        }) }}
      </p>
      <p>
        {{ document.usesRepeatBoxes
          ? t('print.instructions.repeatBoxes', { count: n(document.repeatBoxCount, 'integer') })
          : t('print.instructions.wholeRepeats', {
            horizontal: n(document.horizontalRepeats, 'integer'),
            vertical: n(document.verticalRepeats, 'integer'),
          }) }}
      </p>
    </header>

    <section class="print-instructions-section">
      <h2>{{ t('print.instructions.legendTitle') }}</h2>
      <div class="print-instructions-legend">
        <div
          v-for="entry in document.legend"
          :key="entry.color"
          class="print-instructions-legend-entry"
        >
          <strong class="print-instructions-symbol">{{ entry.symbol || t('print.instructions.noSymbol') }}</strong>
          <span><strong>{{ writtenInstructionColorName(entry, t) }}</strong><br>{{ [entry.color.toUpperCase(), entry.details].filter(Boolean).join(' · ') }}</span>
          <span class="print-instructions-count">{{ stitchCount(entry.count) }}</span>
        </div>
      </div>
    </section>

    <section class="print-instructions-section">
      <h2>{{ t('print.instructions.rowsTitle') }}</h2>
      <ol class="print-instructions-rows">
        <li
          v-for="row in document.instructionRows"
          :key="row.number"
          class="print-instructions-row"
        >
          <strong>{{ t('print.instructions.rowTitle', {
            row: n(row.number, 'integer'),
            direction: t(`print.instructions.direction.${row.direction}`),
          }) }}</strong>
          <span>{{ row.runs.map(run => runLabel(run.color, run.count)).join(t('print.instructions.runSeparator')) }}</span>
        </li>
      </ol>
    </section>
  </div>
</template>
