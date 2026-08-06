<script setup lang="ts">
import ClickPopover from './ClickPopover.vue'
import ColorPicker from './ColorPicker.vue'

defineProps<{ color: string; recentColors: string[] }>()
defineEmits<{ select: [color: string]; eyedropper: [] }>()
</script>

<template>
  <ClickPopover label="Color controls" align="right">
    <template #trigger="{ open, panelId }">
      <button class="btn btn-sm gap-2" :class="open ? 'btn-primary' : 'btn-ghost'" type="button" aria-label="Color controls" aria-haspopup="true" :aria-controls="panelId" :aria-expanded="open">
        <span class="h-4 w-4 rounded-full border border-base-content/30 shadow-sm" :style="{ backgroundColor: color }" aria-hidden="true"></span>
        <span class="hidden xl:inline">Color</span>
      </button>
    </template>
    <ColorPicker :color="color" :recent-colors="recentColors" @select="$emit('select', $event)" @eyedropper="$emit('eyedropper')" />
  </ClickPopover>
</template>
