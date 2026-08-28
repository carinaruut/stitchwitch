<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { SelectionAction } from '../../composables/useGridContextMenus'

defineProps<{ x: number; y: number; canPaste: boolean }>()
const emit = defineEmits<{ action: [action: SelectionAction] }>()
const { t } = useI18n({ useScope: 'global' })

const actions: Array<{ action: SelectionAction; icon: string; label: string }> = [
  { action: 'move', icon: 'mdi-cursor-move', label: 'controls.patternGrid.moveSelection' },
  { action: 'copy', icon: 'mdi-content-copy', label: 'controls.patternGrid.copySelection' },
  { action: 'paste', icon: 'mdi-content-paste', label: 'controls.patternGrid.pasteSelection' },
  { action: 'flip-horizontal', icon: 'mdi-flip-horizontal', label: 'controls.patternGrid.flipHorizontal' },
  { action: 'flip-vertical', icon: 'mdi-flip-vertical', label: 'controls.patternGrid.flipVertical' },
  { action: 'rotate-clockwise', icon: 'mdi-rotate-right', label: 'controls.patternGrid.rotateClockwise' },
  { action: 'rotate-counterclockwise', icon: 'mdi-rotate-left', label: 'controls.patternGrid.rotateCounterclockwise' },
  { action: 'fill', icon: 'mdi-format-color-fill', label: 'controls.patternGrid.fillSelection' },
  { action: 'erase', icon: 'mdi-eraser', label: 'controls.patternGrid.eraseSelection' },
]
</script>

<template>
  <div
    class="app-menu fixed z-80 w-52 rounded-box border border-base-300 bg-base-100 shadow-lg"
    :style="{ left: `${x}px`, top: `${y}px` }"
    role="menu"
    :aria-label="t('controls.patternGrid.selectionActions')"
    @click.stop
  >
    <ul class="menu menu-sm w-full p-0">
      <template
        v-for="item in actions"
        :key="item.action"
      >
        <li
          v-if="item.action === 'fill'"
          class="my-1 border-t border-base-300"
        />
        <li>
          <button
            type="button"
            role="menuitem"
            :disabled="item.action === 'paste' && !canPaste"
            @click="emit('action', item.action)"
          >
            <span
              class="mdi"
              :class="item.icon"
              aria-hidden="true"
            />{{ t(item.label) }}
          </button>
        </li>
      </template>
    </ul>
  </div>
</template>
