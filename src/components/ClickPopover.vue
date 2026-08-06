<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useId } from 'vue'

const props = withDefaults(defineProps<{
  label: string
  align?: 'left' | 'right'
  width?: 'sm' | 'md'
}>(), {
  align: 'left',
  width: 'sm',
})

const root = ref<HTMLElement | null>(null)
const open = ref(false)
const mobileTop = ref(0)
const panelId = `popover-${useId()}`
const panelClass = computed(() => [
  props.align === 'right' ? 'popover-right' : 'popover-left',
  props.width === 'md' ? 'popover-md' : 'popover-sm',
])

function toggle() {
  if (!open.value) mobileTop.value = (root.value?.getBoundingClientRect().bottom ?? 0) + 8
  open.value = !open.value
}

function closeFromOutside(event: PointerEvent) {
  if (!root.value?.contains(event.target as Node)) open.value = false
}

function closeFromKeyboard(event: KeyboardEvent) {
  if (event.key === 'Escape') open.value = false
}

onMounted(() => {
  document.addEventListener('pointerdown', closeFromOutside)
  document.addEventListener('keydown', closeFromKeyboard)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', closeFromOutside)
  document.removeEventListener('keydown', closeFromKeyboard)
})
</script>

<template>
  <div ref="root" class="relative">
    <div @click="toggle">
      <slot name="trigger" :open="open" :panel-id="panelId"></slot>
    </div>
    <div v-if="open" :id="panelId" class="popover-panel" :class="panelClass" :style="{ '--popover-mobile-top': `${mobileTop}px` }" role="region" :aria-label="label">
      <span class="popover-arrow" aria-hidden="true"></span>
      <slot></slot>
    </div>
  </div>
</template>

<style scoped>
.popover-panel {
  position: fixed;
  top: var(--popover-mobile-top);
  left: 0.75rem;
  right: 0.75rem;
  z-index: 60;
  max-height: calc(100dvh - var(--popover-mobile-top) - 0.75rem);
  overflow-y: auto;
  border: 1px solid var(--color-base-300);
  border-radius: var(--radius-box);
  background: var(--color-base-100);
  box-shadow: 0 18px 45px color-mix(in oklab, var(--color-base-content) 18%, transparent);
}

.popover-arrow {
  display: none;
}

:deep(.popover-panel > .card) {
  border: 0;
  background: transparent;
}

@media (min-width: 40rem) {
  .popover-panel {
    position: absolute;
    top: calc(100% + 0.65rem);
    right: auto;
    left: 0;
    max-height: min(70dvh, 42rem);
  }

  .popover-right {
    right: 0;
    left: auto;
  }

  .popover-sm {
    width: 18rem;
  }

  .popover-md {
    width: 24rem;
  }

  .popover-arrow {
    position: absolute;
    top: -0.4rem;
    left: 1.75rem;
    display: block;
    width: 0.75rem;
    height: 0.75rem;
    transform: rotate(45deg);
    border-top: 1px solid var(--color-base-300);
    border-left: 1px solid var(--color-base-300);
    background: var(--color-base-100);
  }

  .popover-right .popover-arrow {
    right: 1.75rem;
    left: auto;
  }
}
</style>
