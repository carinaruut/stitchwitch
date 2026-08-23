<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppDropdown from './AppDropdown.vue'
import ColorPicker from './ColorPicker.vue'

defineProps<{ color: string; recentColors: string[]; swatches: string[] }>()
defineEmits<{ select: [color: string]; screenPick: [color: string]; eyedropper: []; addSwatch: []; removeSwatch: [color: string] }>()
const { t } = useI18n({ useScope: 'global' })
</script>

<template>
  <AppDropdown
    :label="t('controls.color.controls')"
    align="right"
    width="md"
  >
    <template #trigger="{ open, panelId }">
      <button
        class="btn btn-sm"
        :class="open ? 'btn-primary' : 'btn-ghost'"
        type="button"
        :aria-label="t('controls.color.controls')"
        :title="t('controls.color.controls')"
        aria-haspopup="true"
        :aria-controls="panelId"
        :aria-expanded="open"
      >
        <span
          class="h-5 w-5 rounded-full border border-base-content/30 shadow-sm"
          :style="{ backgroundColor: color }"
          aria-hidden="true"
        />
      </button>
    </template>
    <ColorPicker
      :color="color"
      :recent-colors="recentColors"
      :swatches="swatches"
      @select="$emit('select', $event)"
      @screen-pick="$emit('screenPick', $event)"
      @eyedropper="$emit('eyedropper')"
      @add-swatch="$emit('addSwatch')"
      @remove-swatch="$emit('removeSwatch', $event)"
    />
  </AppDropdown>
</template>
