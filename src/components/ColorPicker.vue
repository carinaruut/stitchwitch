<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { normalizeColor } from '../utils/colors'

const props = defineProps<{ color: string; recentColors: string[] }>()
const emit = defineEmits<{ select: [color: string]; eyedropper: [] }>()
const { t } = useI18n({ useScope: 'global' })
const hexValue = ref(props.color)
const error = computed(() => hexValue.value.length > 0 && !normalizeColor(hexValue.value))

watch(() => props.color, (value) => { hexValue.value = value })

function submitHex() {
  const color = normalizeColor(hexValue.value)
  if (color) emit('select', color)
}
</script>

<template>
  <section class="card border border-base-300 bg-base-100">
    <div class="card-body gap-3 p-4">
      <h2 class="card-title text-base">{{ t('controls.color.title') }}</h2>
      <div class="flex items-center gap-3">
        <label class="relative h-11 w-11 shrink-0 cursor-pointer rounded border-2 border-base-content" :style="{ backgroundColor: color }">
          <span class="sr-only">{{ t('controls.color.choose') }}</span>
          <input class="absolute inset-0 h-full w-full cursor-pointer opacity-0" type="color" :value="color" :aria-label="t('controls.color.choose')" @input="$emit('select', ($event.target as HTMLInputElement).value)" />
        </label>
        <button class="btn btn-sm btn-outline" type="button" @click="$emit('eyedropper')"><span class="mdi mdi-eyedropper" aria-hidden="true"></span>{{ t('controls.color.eyedropper') }}</button>
      </div>
      <label class="form-control">
        <span class="label-text mb-1">{{ t('controls.color.hex') }}</span>
        <input v-model="hexValue" class="input input-bordered input-sm w-full" :class="{ 'input-error': error }" maxlength="7" @change="submitHex" @keyup.enter="submitHex" />
        <span v-if="error" class="mt-1 text-xs text-error">{{ t('controls.color.invalid') }}</span>
      </label>
      <div v-if="recentColors.length">
        <p class="mb-2 text-sm font-medium">{{ t('controls.color.recent') }}</p>
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
          ></button>
        </div>
      </div>
    </div>
  </section>
</template>
