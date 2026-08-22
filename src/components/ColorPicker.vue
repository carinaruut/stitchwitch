<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { hexToRgb, normalizeColor, rgbToHex } from '../utils/colors'
import { MAX_PROJECT_SWATCHES } from '../types/pattern'
import VisualColorPicker from './VisualColorPicker.vue'

const props = defineProps<{ color: string; recentColors: string[]; swatches: string[] }>()
const emit = defineEmits<{ select: [color: string]; eyedropper: []; addSwatch: []; removeSwatch: [color: string] }>()
const { t } = useI18n({ useScope: 'global' })
const hexValue = ref(props.color)
const initialRgb = hexToRgb(props.color)!
const rgbValues = ref({ red: String(initialRgb.red), green: String(initialRgb.green), blue: String(initialRgb.blue) })
const hexError = computed(() => hexValue.value.length > 0 && !normalizeColor(hexValue.value))
const rgbColor = computed(() => {
  const channels = [rgbValues.value.red, rgbValues.value.green, rgbValues.value.blue]
  if (channels.some((channel) => !/^\d{1,3}$/.test(channel))) return null
  return rgbToHex(Number(channels[0]), Number(channels[1]), Number(channels[2]))
})
const rgbError = computed(() => !rgbColor.value)
const canAddSwatch = computed(() => !props.swatches.includes(props.color) && props.swatches.length < MAX_PROJECT_SWATCHES)

watch(() => props.color, syncInputs)

function syncInputs(color: string) {
  const rgb = hexToRgb(color)
  if (!rgb) return
  hexValue.value = color
  rgbValues.value = { red: String(rgb.red), green: String(rgb.green), blue: String(rgb.blue) }
}

function selectColor(color: string) {
  const normalized = normalizeColor(color)
  if (!normalized) return
  syncInputs(normalized)
  emit('select', normalized)
}

function submitHex() {
  const color = normalizeColor(hexValue.value)
  if (color) selectColor(color)
}

function submitRgb() {
  if (rgbColor.value) selectColor(rgbColor.value)
}
</script>

<template>
  <section class="card border border-base-300 bg-base-100">
    <div class="card-body gap-3 p-4">
      <h2 class="card-title text-base">
        {{ t('controls.color.title') }}
      </h2>
      <div class="flex items-center gap-3">
        <span
          class="h-11 w-11 shrink-0 rounded-box border-2 border-base-content shadow-sm"
          :style="{ backgroundColor: color }"
          aria-hidden="true"
        />
        <strong class="font-mono text-sm">{{ color.toUpperCase() }}</strong>
        <button
          class="btn btn-sm btn-outline ml-auto"
          type="button"
          @click="$emit('eyedropper')"
        >
          <span
            class="mdi mdi-eyedropper"
            aria-hidden="true"
          />{{ t('controls.color.eyedropper') }}
        </button>
      </div>
      <VisualColorPicker
        :model-value="color"
        @update:model-value="selectColor"
      />
      <label class="form-control">
        <span class="label-text mb-1">{{ t('controls.color.hex') }}</span>
        <input
          v-model="hexValue"
          class="input input-bordered input-sm w-full font-mono"
          :class="{ 'input-error': hexError }"
          maxlength="7"
          @change="submitHex"
          @keyup.enter="submitHex"
        >
        <span
          v-if="hexError"
          class="mt-1 text-xs text-error"
        >{{ t('controls.color.invalid') }}</span>
      </label>
      <fieldset>
        <legend class="mb-1 text-sm">
          {{ t('controls.color.rgb') }}
        </legend>
        <div class="grid grid-cols-3 gap-2">
          <label
            v-for="channel in (['red', 'green', 'blue'] as const)"
            :key="channel"
            class="form-control"
          >
            <span class="label-text mb-1">{{ t(`controls.color.${channel}`) }}</span>
            <input
              v-model="rgbValues[channel]"
              class="input input-bordered input-sm min-w-0 w-full font-mono"
              :class="{ 'input-error': rgbError }"
              type="number"
              min="0"
              max="255"
              inputmode="numeric"
              @change="submitRgb"
              @keyup.enter="submitRgb"
            >
          </label>
        </div>
        <span
          v-if="rgbError"
          class="mt-1 block text-xs text-error"
        >{{ t('controls.color.rgbInvalid') }}</span>
      </fieldset>
      <div class="border-t border-base-300 pt-3">
        <div class="mb-2 flex items-center justify-between gap-3">
          <div>
            <p class="text-sm font-medium">
              {{ t('controls.color.swatches') }}
            </p>
            <p class="text-xs text-base-content/60">
              {{ t('controls.color.swatchesHelp') }}
            </p>
          </div>
          <button
            class="btn btn-primary btn-xs shrink-0"
            type="button"
            :disabled="!canAddSwatch"
            @click="$emit('addSwatch')"
          >
            <span
              class="mdi mdi-plus"
              aria-hidden="true"
            />{{ t('controls.color.saveSwatch') }}
          </button>
        </div>
        <div
          v-if="swatches.length"
          class="flex flex-wrap gap-2"
        >
          <div
            v-for="swatch in swatches"
            :key="swatch"
            class="join"
          >
            <button
              class="btn join-item h-9 min-h-9 gap-2 px-2 font-mono text-xs"
              type="button"
              :aria-label="t('controls.color.selectSwatch', { color: swatch })"
              :aria-pressed="swatch === color"
              @click="$emit('select', swatch)"
            >
              <span
                class="h-5 w-5 rounded border border-base-content/30"
                :style="{ backgroundColor: swatch }"
                aria-hidden="true"
              />{{ swatch.toUpperCase() }}
            </button>
            <button
              class="btn btn-ghost join-item h-9 min-h-9 px-2"
              type="button"
              :aria-label="t('controls.color.removeSwatch', { color: swatch })"
              @click="$emit('removeSwatch', swatch)"
            >
              <span
                class="mdi mdi-close"
                aria-hidden="true"
              />
            </button>
          </div>
        </div>
        <p
          v-else
          class="text-xs text-base-content/60"
        >
          {{ t('controls.color.noSwatches') }}
        </p>
      </div>
      <div v-if="recentColors.length">
        <p class="mb-2 text-sm font-medium">
          {{ t('controls.color.recent') }}
        </p>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="swatch in recentColors"
            :key="swatch"
            class="h-8 w-8 rounded border border-base-content focus:outline-2 focus:outline-offset-2"
            :class="{ 'ring-2 ring-primary ring-offset-2 ring-offset-base-100': swatch === color }"
            :style="{ backgroundColor: swatch }"
            type="button"
            :aria-label="t('controls.color.selectRecent', { color: swatch })"
            :aria-pressed="swatch === color"
            @click="$emit('select', swatch)"
          />
        </div>
      </div>
    </div>
  </section>
</template>
