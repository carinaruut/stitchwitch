<script setup lang="ts">
import { computed } from 'vue'
import type { PatternGrid, PreviewStitch } from '../types/pattern'

const props = defineProps<{ cells: PatternGrid }>()
const stitch = defineModel<PreviewStitch>('stitch', { required: true })
const columns = computed(() => props.cells[0].length)
</script>

<template>
  <section class="card min-w-0 border border-base-300 bg-base-100">
    <div class="card-body min-w-0 gap-3 p-4">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 class="card-title text-base">Complete pattern preview</h2>
        <div class="flex flex-wrap items-center justify-end gap-2">
          <label class="flex items-center gap-2 text-sm font-medium">
            Stitch
            <select v-model="stitch" class="select select-bordered select-sm" aria-label="Preview stitch">
              <option value="knit">Knit</option>
              <option value="cross-stitch">Cross stitch</option>
            </select>
          </label>
          <span class="badge badge-primary">{{ columns }} columns</span>
          <span class="badge badge-secondary">{{ cells.length }} rows</span>
        </div>
      </div>
      <div class="w-full min-w-0 overflow-x-auto overflow-y-hidden rounded-xl bg-base-200/30 p-4">
        <div
          class="stitch-grid grid w-max"
          :class="`stitch-grid-${stitch}`"
          :style="{ gridTemplateColumns: `repeat(${columns}, ${stitch === 'cross-stitch' ? 24 : 27}px)` }"
          aria-label="Repeated stitch pattern preview"
        >
          <template v-for="(row, rowIndex) in cells" :key="rowIndex">
            <span v-for="(color, columnIndex) in row" :key="columnIndex" class="stitch" :class="`stitch-${stitch}`" :style="{ '--stitch-color': color }" aria-hidden="true"></span>
          </template>
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
  width: 27px;
  height: 32px;
  mask: url('/assets/stitch_1.png') center / 100% 100% no-repeat;
  -webkit-mask: url('/assets/stitch_1.png') center / 100% 100% no-repeat;
}

.stitch-cross-stitch {
  width: 28px;
  height: 28px;
  mask: url('/assets/stitch_2.png') center / 100% 100% no-repeat;
  -webkit-mask: url('/assets/stitch_2.png') center / 100% 100% no-repeat;
}

.stitch-grid-knit {
  grid-auto-rows: 24px;
  padding-bottom: 2px;
}

.stitch-grid-cross-stitch {
  grid-auto-rows: 24px;
  padding-right: 4px;
  padding-bottom: 4px;
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
</style>
