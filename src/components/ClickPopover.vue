<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId } from 'vue'

const props = withDefaults(defineProps<{
  label: string
  align?: 'left' | 'right'
  width?: 'sm' | 'md'
}>(), {
  align: 'left',
  width: 'sm',
})

const root = ref<HTMLElement | null>(null)
const panel = ref<HTMLElement | null>(null)
const open = ref(false)
const position = ref({ top: 0, left: 12, maxHeight: 320, arrowLeft: 28, above: false })
const panelId = `popover-${useId()}`
const panelClass = computed(() => [
  props.align === 'right' ? 'popover-right' : 'popover-left',
  props.width === 'md' ? 'popover-md' : 'popover-sm',
  position.value.above ? 'popover-above' : '',
])
const panelStyle = computed(() => ({
  '--popover-top': `${position.value.top}px`,
  '--popover-left': `${position.value.left}px`,
  '--popover-max-height': `${position.value.maxHeight}px`,
  '--popover-arrow-left': `${position.value.arrowLeft}px`,
}))

function toggle() {
  open.value = !open.value
  if (open.value) void nextTick(updatePosition)
}

function updatePosition() {
  if (!open.value || !root.value || !panel.value) return
  const margin = 12
  const gap = 10
  const trigger = root.value.getBoundingClientRect()
  const width = panel.value.offsetWidth
  const desiredMaxHeight = Math.min(window.innerHeight * 0.7, 672)
  const availableBelow = window.innerHeight - trigger.bottom - gap - margin
  const availableAbove = trigger.top - gap - margin
  const desiredHeight = Math.min(panel.value.scrollHeight, desiredMaxHeight)
  const placeAbove = availableBelow < desiredHeight && availableAbove > availableBelow
  const maxHeight = Math.max(40, Math.min(desiredMaxHeight, placeAbove ? availableAbove : availableBelow))
  const top = placeAbove
    ? Math.max(margin, trigger.top - gap - Math.min(panel.value.scrollHeight, maxHeight))
    : trigger.bottom + gap
  const preferredLeft = props.align === 'right' ? trigger.right - width : trigger.left
  const left = Math.max(margin, Math.min(preferredLeft, window.innerWidth - width - margin))
  const arrowLeft = Math.max(20, Math.min(trigger.left + trigger.width / 2 - left, width - 20))
  position.value = { top, left, maxHeight, arrowLeft, above: placeAbove }
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
  window.addEventListener('resize', updatePosition)
  window.addEventListener('scroll', updatePosition, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', closeFromOutside)
  document.removeEventListener('keydown', closeFromKeyboard)
  window.removeEventListener('resize', updatePosition)
  window.removeEventListener('scroll', updatePosition, true)
})
</script>

<template>
  <div ref="root" class="relative">
    <div @click="toggle">
      <slot name="trigger" :open="open" :panel-id="panelId"></slot>
    </div>
    <div v-if="open" :id="panelId" ref="panel" class="popover-panel" :class="panelClass" :style="panelStyle" role="region" :aria-label="label">
      <span class="popover-arrow" aria-hidden="true"></span>
      <slot></slot>
    </div>
  </div>
</template>

<style scoped>
.popover-panel {
  position: fixed;
  top: var(--popover-top);
  left: var(--popover-left);
  z-index: 60;
  width: calc(100vw - 1.5rem);
  max-height: var(--popover-max-height);
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
  .popover-sm {
    width: 18rem;
  }

  .popover-md {
    width: 24rem;
  }

  .popover-arrow {
    position: absolute;
    top: -0.4rem;
    left: calc(var(--popover-arrow-left) - 0.375rem);
    display: block;
    width: 0.75rem;
    height: 0.75rem;
    transform: rotate(45deg);
    border-top: 1px solid var(--color-base-300);
    border-left: 1px solid var(--color-base-300);
    background: var(--color-base-100);
  }

  .popover-above .popover-arrow {
    top: auto;
    bottom: -0.4rem;
    border-top: 0;
    border-right: 1px solid var(--color-base-300);
    border-bottom: 1px solid var(--color-base-300);
    border-left: 0;
  }
}
</style>
