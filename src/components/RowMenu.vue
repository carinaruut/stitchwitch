<script setup lang="ts">
import ClickPopover from './ClickPopover.vue'
import RowControls from './RowControls.vue'

defineProps<{ selected: number; count: number }>()
defineEmits<{ before: []; after: []; beginning: []; end: []; fill: []; erase: []; removeCurrent: []; removeRows: [value: string] }>()
</script>

<template>
  <ClickPopover label="Row controls" align="right">
    <template #trigger="{ open, panelId }">
      <button class="btn btn-sm gap-1.5" :class="open ? 'btn-primary' : 'btn-ghost'" type="button" aria-label="Row controls" aria-haspopup="true" :aria-controls="panelId" :aria-expanded="open">
        <span class="mdi mdi-table-row-plus-before text-lg" aria-hidden="true"></span>
        <span class="hidden 2xl:inline">Rows</span>
        <span class="badge badge-sm hidden sm:inline-flex" :class="open ? 'badge-primary-content' : 'badge-ghost'">{{ selected + 1 }}</span>
      </button>
    </template>
    <RowControls :selected="selected" :count="count" @before="$emit('before')" @after="$emit('after')" @beginning="$emit('beginning')" @end="$emit('end')" @fill="$emit('fill')" @erase="$emit('erase')" @remove-current="$emit('removeCurrent')" @remove-rows="$emit('removeRows', $event)" />
  </ClickPopover>
</template>
