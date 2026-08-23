<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { hexToHsv, hsvToHex, normalizeColor, type HsvColor } from '../utils/colors'

type PickerMode = 'spectrum' | 'wheel' | 'harmony'
type HarmonyMode = 'complementary' | 'analogous' | 'triadic'

const MODE_KEY = 'stitch-color-picker-mode'
const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [color: string] }>()
const { t } = useI18n({ useScope: 'global' })
const initial = hexToHsv(props.modelValue) ?? { hue: 0, saturation: 0, value: 1 }
const hsv = ref<HsvColor>(initial)
const mode = ref<PickerMode>(readMode())
const harmonyMode = ref<HarmonyMode>('complementary')
const dragging = ref<'spectrum' | 'wheel' | null>(null)
const selectedColor = computed(() => hsvToHex(hsv.value.hue, hsv.value.saturation, hsv.value.value))
const hueColor = computed(() => hsvToHex(hsv.value.hue, 1, 1))
const fullValueColor = computed(() => hsvToHex(hsv.value.hue, hsv.value.saturation, 1))
const spectrumMarkerStyle = computed(() => ({
  left: `${hsv.value.saturation * 100}%`,
  top: `${(1 - hsv.value.value) * 100}%`,
}))
const wheelMarkerStyle = computed(() => wheelPosition(hsv.value.hue, hsv.value.saturation))
const harmonyOffsets = computed(() => harmonyMode.value === 'complementary'
  ? [0, 180]
  : harmonyMode.value === 'analogous' ? [-30, 0, 30] : [0, 120, 240])
const harmonyColors = computed(() => harmonyOffsets.value.map((offset) => ({
  color: hsvToHex(hsv.value.hue + offset, hsv.value.saturation, hsv.value.value),
  offset,
  style: wheelPosition(hsv.value.hue + offset, hsv.value.saturation),
})))

watch(() => props.modelValue, (color) => {
  const normalized = normalizeColor(color)
  if (!normalized || normalized === selectedColor.value) return
  const next = hexToHsv(normalized)
  if (next) hsv.value = next
})

function readMode(): PickerMode {
  try {
    const saved = localStorage.getItem(MODE_KEY)
    if (saved === 'spectrum' || saved === 'wheel' || saved === 'harmony') return saved
  } catch {
    // Storage can be unavailable in private browsing contexts.
  }
  return 'spectrum'
}

function setMode(next: PickerMode) {
  mode.value = next
  try {
    localStorage.setItem(MODE_KEY, next)
  } catch {
    // The picker remains usable without persisting the preference.
  }
}

function updateColor(updates: Partial<HsvColor>) {
  hsv.value = { ...hsv.value, ...updates }
  emit('update:modelValue', selectedColor.value)
}

function wheelPosition(hue: number, saturation: number) {
  const radians = (((hue % 360) + 360) % 360) * Math.PI / 180
  return {
    left: `${50 + Math.cos(radians) * saturation * 50}%`,
    top: `${50 + Math.sin(radians) * saturation * 50}%`,
  }
}

function updateSpectrum(event: PointerEvent) {
  const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect()
  updateColor({
    saturation: Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width)),
    value: Math.min(1, Math.max(0, 1 - (event.clientY - bounds.top) / bounds.height)),
  })
}

function updateWheel(event: PointerEvent) {
  const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const x = event.clientX - (bounds.left + bounds.width / 2)
  const y = event.clientY - (bounds.top + bounds.height / 2)
  const radius = Math.min(bounds.width, bounds.height) / 2
  updateColor({
    hue: ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360,
    saturation: Math.min(1, Math.hypot(x, y) / radius),
  })
}

function startDrag(kind: 'spectrum' | 'wheel', event: PointerEvent) {
  dragging.value = kind
  const control = event.currentTarget as HTMLElement
  try {
    control.setPointerCapture(event.pointerId)
  } catch {
    // Pointer capture is optional; dragging still works while the pointer stays over the control.
  }
  if (kind === 'spectrum') updateSpectrum(event)
  else updateWheel(event)
}

function drag(kind: 'spectrum' | 'wheel', event: PointerEvent) {
  if (dragging.value !== kind) return
  if (kind === 'spectrum') updateSpectrum(event)
  else updateWheel(event)
}

function adjustSpectrum(event: KeyboardEvent) {
  const step = event.shiftKey ? 0.1 : 0.02
  if (event.key === 'ArrowLeft') updateColor({ saturation: hsv.value.saturation - step })
  else if (event.key === 'ArrowRight') updateColor({ saturation: hsv.value.saturation + step })
  else if (event.key === 'ArrowUp') updateColor({ value: hsv.value.value + step })
  else if (event.key === 'ArrowDown') updateColor({ value: hsv.value.value - step })
  else return
  event.preventDefault()
}

function adjustWheel(event: KeyboardEvent) {
  const hueStep = event.shiftKey ? 15 : 2
  const saturationStep = event.shiftKey ? 0.1 : 0.02
  if (event.key === 'ArrowLeft') updateColor({ hue: hsv.value.hue - hueStep })
  else if (event.key === 'ArrowRight') updateColor({ hue: hsv.value.hue + hueStep })
  else if (event.key === 'ArrowUp') updateColor({ saturation: hsv.value.saturation + saturationStep })
  else if (event.key === 'ArrowDown') updateColor({ saturation: hsv.value.saturation - saturationStep })
  else return
  event.preventDefault()
}
</script>

<template>
  <div class="visual-color-picker">
    <div
      class="grid grid-cols-3 gap-1 rounded-box bg-base-200 p-1"
      role="group"
      :aria-label="t('controls.color.pickerModes')"
    >
      <button
        v-for="pickerMode in (['spectrum', 'wheel', 'harmony'] as const)"
        :key="pickerMode"
        class="btn btn-sm min-h-9 border-0 px-2"
        :class="mode === pickerMode ? 'bg-base-100 shadow-sm' : 'btn-ghost text-base-content/65'"
        type="button"
        :aria-pressed="mode === pickerMode"
        @click="setMode(pickerMode)"
      >
        <span
          class="mdi"
          :class="pickerMode === 'spectrum' ? 'mdi-gradient-horizontal' : pickerMode === 'wheel' ? 'mdi-circle-slice-8' : 'mdi-palette-swatch-outline'"
          aria-hidden="true"
        />
        <span class="hidden min-[340px]:inline">{{ t(`controls.color.${pickerMode}`) }}</span>
      </button>
    </div>

    <div class="mt-3">
      <div
        v-if="mode === 'spectrum'"
        class="color-spectrum relative aspect-7/4 w-full cursor-crosshair touch-none overflow-hidden rounded-box border border-base-content/20 shadow-inner"
        :style="{ backgroundColor: hueColor }"
        role="slider"
        tabindex="0"
        :aria-label="t('controls.color.saturationValue')"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-valuenow="Math.round(hsv.saturation * 100)"
        :aria-valuetext="selectedColor.toUpperCase()"
        @pointerdown="startDrag('spectrum', $event)"
        @pointermove="drag('spectrum', $event)"
        @pointerup="dragging = null"
        @pointercancel="dragging = null"
        @keydown="adjustSpectrum"
      >
        <span
          class="picker-marker"
          :style="spectrumMarkerStyle"
          aria-hidden="true"
        />
      </div>

      <div
        v-else
        class="mx-auto w-[min(100%,15rem)]"
      >
        <div
          class="color-wheel relative aspect-square w-full cursor-crosshair touch-none rounded-full border border-base-content/20 shadow-inner"
          role="slider"
          tabindex="0"
          :aria-label="t('controls.color.hueSaturation')"
          aria-valuemin="0"
          aria-valuemax="360"
          :aria-valuenow="Math.round(hsv.hue)"
          :aria-valuetext="selectedColor.toUpperCase()"
          @pointerdown="startDrag('wheel', $event)"
          @pointermove="drag('wheel', $event)"
          @pointerup="dragging = null"
          @pointercancel="dragging = null"
          @keydown="adjustWheel"
        >
          <template v-if="mode === 'harmony'">
            <span
              v-for="(item, index) in harmonyColors"
              :key="item.offset"
              class="picker-marker"
              :class="index ? 'picker-marker-companion' : ''"
              :style="item.style"
              aria-hidden="true"
            />
          </template>
          <span
            v-else
            class="picker-marker"
            :style="wheelMarkerStyle"
            aria-hidden="true"
          />
        </div>
      </div>

      <div
        v-if="mode === 'harmony'"
        class="mt-3"
      >
        <div class="join flex">
          <button
            v-for="scheme in (['complementary', 'analogous', 'triadic'] as const)"
            :key="scheme"
            class="btn btn-xs join-item flex-1"
            :class="harmonyMode === scheme ? 'btn-neutral' : 'btn-outline'"
            type="button"
            @click="harmonyMode = scheme"
          >
            {{ t(`controls.color.${scheme}`) }}
          </button>
        </div>
        <div
          class="mt-2 grid gap-2"
          :class="harmonyColors.length === 2 ? 'grid-cols-2' : 'grid-cols-3'"
        >
          <button
            v-for="item in harmonyColors"
            :key="item.offset"
            class="h-10 rounded-box border border-base-content/25 shadow-sm focus-visible:outline-2 focus-visible:outline-primary"
            :style="{ backgroundColor: item.color }"
            type="button"
            :aria-label="t('controls.color.selectHarmony', { color: item.color.toUpperCase() })"
            @click="updateColor({ hue: hsv.hue + item.offset })"
          />
        </div>
      </div>

      <label class="mt-3 block">
        <span class="mb-1 flex justify-between text-xs font-semibold">
          <span>{{ t(mode === 'spectrum' ? 'controls.color.hue' : 'controls.color.brightness') }}</span>
          <span class="font-mono text-base-content/60">{{ mode === 'spectrum' ? `${Math.round(hsv.hue)}°` : `${Math.round(hsv.value * 100)}%` }}</span>
        </span>
        <input
          v-if="mode === 'spectrum'"
          class="color-range hue-range"
          type="range"
          min="0"
          max="359"
          :value="hsv.hue"
          :aria-label="t('controls.color.hue')"
          @input="updateColor({ hue: Number(($event.target as HTMLInputElement).value) })"
        >
        <input
          v-else
          class="color-range value-range"
          type="range"
          min="0"
          max="100"
          :value="Math.round(hsv.value * 100)"
          :style="{ '--value-color': fullValueColor }"
          :aria-label="t('controls.color.brightness')"
          @input="updateColor({ value: Number(($event.target as HTMLInputElement).value) / 100 })"
        >
      </label>
    </div>
  </div>
</template>

<style scoped>
.color-spectrum {
  background-image: linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent);
}

.color-wheel {
  background-image: radial-gradient(circle closest-side, #fff 0%, transparent 100%), conic-gradient(from 90deg, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00);
}

.picker-marker {
  position: absolute;
  width: 1.125rem;
  height: 1.125rem;
  transform: translate(-50%, -50%);
  border: 2px solid white;
  border-radius: 999px;
  box-shadow: 0 0 0 1.5px #16213d, 0 2px 5px rgb(0 0 0 / 35%);
}

.picker-marker-companion {
  width: 0.875rem;
  height: 0.875rem;
  border-style: dashed;
}

.color-range {
  display: block;
  width: 100%;
  height: 0.75rem;
  margin: 0;
  appearance: none;
  border: 1px solid color-mix(in oklab, var(--color-base-content) 20%, transparent);
  border-radius: 999px;
  cursor: pointer;
}

.hue-range {
  background: linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00);
}

.value-range {
  background: linear-gradient(to right, #000, var(--value-color));
}

.color-range::-webkit-slider-thumb {
  width: 1.125rem;
  height: 1.125rem;
  appearance: none;
  border: 2px solid white;
  border-radius: 999px;
  background: var(--color-base-content);
  box-shadow: 0 0 0 1px var(--color-base-content), 0 2px 5px rgb(0 0 0 / 25%);
}

.color-range::-moz-range-thumb {
  width: 0.875rem;
  height: 0.875rem;
  border: 2px solid white;
  border-radius: 999px;
  background: var(--color-base-content);
  box-shadow: 0 0 0 1px var(--color-base-content), 0 2px 5px rgb(0 0 0 / 25%);
}
</style>
