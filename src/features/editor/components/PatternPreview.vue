<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { PatternGrid, PreviewStitch } from '../../../types/pattern'

const props = defineProps<{ cells: PatternGrid }>()
const stitch = defineModel<PreviewStitch>('stitch', { required: true })
const { t } = useI18n({ useScope: 'global' })
const columns = computed(() => props.cells[0].length)
const previewArea = ref<HTMLElement | null>(null)
const availableWidth = ref(0)
const fitWidth = ref(false)
let resizeObserver: ResizeObserver | null = null
const stitchOptions = computed<Array<{ value: PreviewStitch; label: string }>>(() => [
  { value: 'knit', label: t('controls.preview.knit') },
  { value: 'cross-stitch', label: t('controls.preview.crossStitch') },
  { value: 'single-crochet', label: t('controls.preview.singleCrochet') },
])

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
  <section class="card isolate min-w-0 border border-base-300 bg-base-100">
    <div class="card-body app-card-body min-w-0">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 class="card-title text-base">
          {{ t('controls.preview.title') }}
        </h2>
        <div class="flex flex-wrap items-center justify-end gap-2">
          <button
            class="btn btn-sm gap-1.5"
            :class="fitWidth ? 'btn-primary' : 'btn-ghost'"
            type="button"
            :aria-pressed="fitWidth"
            @click="fitWidth = !fitWidth"
          >
            <span
              class="mdi mdi-fit-to-screen-outline text-lg"
              aria-hidden="true"
            />
            {{ t('controls.preview.fitWidth') }}
          </button>
          <div
            class="flex flex-wrap gap-1"
            role="group"
            :aria-label="t('controls.preview.stitchLabel')"
          >
            <button
              v-for="option in stitchOptions"
              :key="option.value"
              class="btn btn-sm"
              :class="stitch === option.value ? 'btn-primary' : 'btn-ghost'"
              type="button"
              :aria-pressed="stitch === option.value"
              :aria-label="option.label"
              :title="option.label"
              @click="stitch = option.value"
            >
              {{ option.label }}
            </button>
          </div>
          <span class="badge badge-primary">{{ t('controls.preview.columns', columns) }}</span>
          <span class="badge badge-secondary">{{ t('controls.preview.rows', cells.length) }}</span>
        </div>
      </div>
      <div class="app-inset-panel w-full min-w-0 overflow-x-auto overflow-y-hidden">
        <div
          ref="previewArea"
          class="min-w-0"
        >
          <div
            class="stitch-grid grid w-max"
            :class="`stitch-grid-${stitch}`"
            :style="previewStyle"
            :aria-label="t('controls.preview.ariaLabel')"
          >
            <template
              v-for="(row, rowIndex) in cells"
              :key="rowIndex"
            >
              <span
                v-for="(color, columnIndex) in row"
                :key="`${rowIndex}-${columnIndex}`"
                class="stitch"
                :style="{ '--stitch-color': color, '--row-stack': cells.length - rowIndex, '--single-stack': (cells.length - rowIndex) * (columns + 1) + columns - columnIndex }"
                aria-hidden="true"
              />
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
  width: var(--stitch-width);
  height: var(--stitch-height);
  background: var(--stitch-color);
  mask: var(--stitch-image) center / 100% 100% no-repeat;
  -webkit-mask: var(--stitch-image) center / 100% 100% no-repeat;
}

.stitch-grid-knit {
  --stitch-image: url('/assets/stitch_1.webp');
}

.stitch-grid-cross-stitch {
  --stitch-image: url('/assets/stitch_2.webp');
}

.stitch-grid-single-crochet {
  --stitch-image: url('/assets/stitch_3.webp');
}

.stitch-grid-knit .stitch {
  z-index: var(--row-stack);
}

.stitch-grid-single-crochet .stitch {
  z-index: var(--single-stack);
}

.stitch::after {
  position: absolute;
  inset: 0;
  content: '';
  background: var(--stitch-image) center / 100% 100% no-repeat;
  mix-blend-mode: multiply;
}

</style>
