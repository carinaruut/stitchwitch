<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { PatternGrid, PreviewStitch } from '../types/pattern'

const props = defineProps<{ cells: PatternGrid }>()
const stitch = defineModel<PreviewStitch>('stitch', { required: true })
const { t } = useI18n({ useScope: 'global' })
const columns = computed(() => props.cells[0].length)
const previewArea = ref<HTMLElement | null>(null)
const availableWidth = ref(0)
const fitWidth = ref(false)
let resizeObserver: ResizeObserver | null = null

const stitchDimensions = computed(() => {
  if (stitch.value === 'single-crochet') return { column: 16, row: 16, width: 28, height: 28, paddingRight: 12, paddingBottom: 12 }
  if (stitch.value === 'cross-stitch') return { column: 24, row: 24, width: 28, height: 28, paddingRight: 4, paddingBottom: 4 }
  return { column: 26, row: 22, width: 27, height: 32, paddingRight: 1, paddingBottom: 4 }
})

const previewScale = computed(() => {
  if (!fitWidth.value || !availableWidth.value) return 1
  const dimensions = stitchDimensions.value
  const naturalWidth = columns.value * dimensions.column + dimensions.paddingRight
  return Math.min(1, availableWidth.value / naturalWidth)
})

const previewStyle = computed(() => {
  const dimensions = stitchDimensions.value
  const scale = previewScale.value
  return {
    gridTemplateColumns: `repeat(${columns.value}, ${dimensions.column * scale}px)`,
    gridAutoRows: `${dimensions.row * scale}px`,
    paddingRight: `${dimensions.paddingRight * scale}px`,
    paddingBottom: `${dimensions.paddingBottom * scale}px`,
    '--stitch-width': `${dimensions.width * scale}px`,
    '--stitch-height': `${dimensions.height * scale}px`,
  }
})

onMounted(() => {
  resizeObserver = new ResizeObserver(([entry]) => {
    availableWidth.value = entry.contentRect.width
  })
  if (previewArea.value) resizeObserver.observe(previewArea.value)
})

onBeforeUnmount(() => resizeObserver?.disconnect())
</script>

<template>
  <section class="card min-w-0 border border-base-300 bg-base-100">
    <div class="card-body min-w-0 gap-3 p-4">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 class="card-title text-base">{{ t('controls.preview.title') }}</h2>
        <div class="flex flex-wrap items-center justify-end gap-2">
          <button class="btn btn-sm gap-1.5" :class="fitWidth ? 'btn-primary' : 'btn-ghost'" type="button" :aria-pressed="fitWidth" @click="fitWidth = !fitWidth">
            <span class="mdi mdi-fit-to-screen-outline text-lg" aria-hidden="true"></span>
            {{ t('controls.preview.fitWidth') }}
          </button>
          <label class="flex items-center gap-2 text-sm font-medium">
            {{ t('controls.preview.stitch') }}
            <select v-model="stitch" class="select select-bordered select-sm" :aria-label="t('controls.preview.stitchLabel')">
              <option value="knit">{{ t('controls.preview.knit') }}</option>
              <option value="cross-stitch">{{ t('controls.preview.crossStitch') }}</option>
              <option value="single-crochet">{{ t('controls.preview.singleCrochet') }}</option>
            </select>
          </label>
          <span class="badge badge-primary">{{ t('controls.preview.columns', columns) }}</span>
          <span class="badge badge-secondary">{{ t('controls.preview.rows', cells.length) }}</span>
        </div>
      </div>
      <div class="w-full min-w-0 overflow-x-auto overflow-y-hidden rounded-xl bg-base-200/30 p-4">
        <div ref="previewArea" class="min-w-0">
          <div
            class="stitch-grid grid w-max"
            :class="`stitch-grid-${stitch}`"
            :style="previewStyle"
            :aria-label="t('controls.preview.ariaLabel')"
          >
            <template v-for="(row, rowIndex) in cells" :key="rowIndex">
              <span v-for="(color, columnIndex) in row" :key="columnIndex" class="stitch" :class="`stitch-${stitch}`" :style="{ '--stitch-color': color, zIndex: stitch === 'single-crochet' ? (cells.length - rowIndex) * (columns + 1) + columns - columnIndex : stitch === 'knit' ? cells.length - rowIndex : undefined }" aria-hidden="true"></span>
            </template>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.stitch {
  position: relative;
  z-index: 1;
  background: var(--stitch-color);
}

.stitch-knit {
  width: var(--stitch-width);
  height: var(--stitch-height);
  mask: url('/assets/stitch_1.png') center / 100% 100% no-repeat;
  -webkit-mask: url('/assets/stitch_1.png') center / 100% 100% no-repeat;
}

.stitch-cross-stitch {
  width: var(--stitch-width);
  height: var(--stitch-height);
  mask: url('/assets/stitch_2.png') center / 100% 100% no-repeat;
  -webkit-mask: url('/assets/stitch_2.png') center / 100% 100% no-repeat;
}

.stitch-single-crochet {
  width: var(--stitch-width);
  height: var(--stitch-height);
  mask: url('/assets/stitch_3.png') center / 100% 100% no-repeat;
  -webkit-mask: url('/assets/stitch_3.png') center / 100% 100% no-repeat;
}

.stitch::after {
  position: absolute;
  inset: 0;
  content: '';
  mix-blend-mode: multiply;
}

.stitch-knit::after {
  background: url('/assets/stitch_1.png') center / 100% 100% no-repeat;
}

.stitch-cross-stitch::after {
  background: url('/assets/stitch_2.png') center / 100% 100% no-repeat;
}

.stitch-single-crochet::after {
  background: url('/assets/stitch_3.png') center / 100% 100% no-repeat;
}
</style>
