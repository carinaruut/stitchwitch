<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  useId,
  watch,
} from 'vue'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(defineProps<{
  label: string
  align?: 'left' | 'right'
  width?: 'auto' | 'sm' | 'md'
  fixedWidth?: boolean
  open?: boolean
  panelRole?: 'menu' | 'region' | 'dialog'
  panelClass?: string
}>(), {
  align: 'left',
  width: 'auto',
  fixedWidth: false,
  open: undefined,
  panelRole: 'region',
  panelClass: '',
})

const emit = defineEmits<{
  'update:open': [open: boolean]
}>()

const root = ref<HTMLElement | null>(null)
const panel = ref<HTMLElement | null>(null)
const anchor = ref<HTMLElement | null>(null)
const internalOpen = ref(false)

const position = ref({
  top: 0,
  left: 12,
  width: 0,
  maxHeight: 320,
  above: false,
})

const panelId = `dropdown-${useId()}`

const isOpen = computed(() => props.open ?? internalOpen.value)

const panelClasses = computed(() => [
  !props.fixedWidth && props.width !== 'auto'
    ? `app-dropdown-${props.width}`
    : '',
  props.fixedWidth
    ? 'app-dropdown-fixed-width'
    : '',
  position.value.above
    ? 'app-dropdown-above'
    : '',
])

const panelStyle = computed(() => ({
  '--dropdown-top': `${position.value.top}px`,
  '--dropdown-left': `${position.value.left}px`,
  '--dropdown-width': `${position.value.width}px`,
  '--dropdown-max-height': `${position.value.maxHeight}px`,
}))

function setOpen(open: boolean) {
  if (props.open === undefined) {
    internalOpen.value = open
  }

  emit('update:open', open)
}

function triggerFromEvent(event: Event) {
  const target = event.target as Element | null

  return target?.closest<HTMLElement>(
    'button, summary, [role="button"]',
  ) ?? event.currentTarget as HTMLElement
}

function toggle(event: Event) {
  const nextAnchor = triggerFromEvent(event)

  if (isOpen.value && anchor.value === nextAnchor) {
    close(true)
    return
  }

  anchor.value = nextAnchor
  setOpen(true)

  void nextTick(updatePosition)
}

function close(focusAnchor = false) {
  const trigger = anchor.value

  setOpen(false)
  anchor.value = null

  if (focusAnchor) {
    trigger?.focus()
  }
}

function getFixedWidthRect() {
  if (!root.value) {
    return null
  }

  return root.value.parentElement?.getBoundingClientRect()
    ?? root.value.getBoundingClientRect()
}

function updatePosition() {
  if (!isOpen.value || !anchor.value || !panel.value || !root.value) {
    return
  }

  const margin = 12
  const gap = 8

  const triggerRect = anchor.value.getBoundingClientRect()
  const fixedRect = getFixedWidthRect()

  if (!fixedRect) {
    return
  }

  const width = props.fixedWidth
    ? fixedRect.width
    : panel.value.offsetWidth

  const desiredMaxHeight = Math.min(
    window.innerHeight * 0.7,
    672,
  )

  const availableBelow =
    window.innerHeight
    - triggerRect.bottom
    - gap
    - margin

  const availableAbove =
    triggerRect.top
    - gap
    - margin

  const desiredHeight = Math.min(
    panel.value.scrollHeight,
    desiredMaxHeight,
  )

  const above =
    availableBelow < desiredHeight
    && availableAbove > availableBelow

  const maxHeight = Math.max(
    80,
    Math.min(
      desiredMaxHeight,
      above
        ? availableAbove
        : availableBelow,
    ),
  )

  const top = above
    ? Math.max(
      margin,
      triggerRect.top
        - gap
        - Math.min(
          panel.value.scrollHeight,
          maxHeight,
        ),
    )
    : triggerRect.bottom + gap

  const preferredLeft = props.fixedWidth
    ? fixedRect.left
    : props.align === 'right'
      ? triggerRect.right - width
      : triggerRect.left

  const left = Math.max(
    margin,
    Math.min(
      preferredLeft,
      window.innerWidth - width - margin,
    ),
  )

  position.value = {
    top,
    left,
    width,
    maxHeight,
    above,
  }
}

function closeFromOutside(event: PointerEvent) {
  if (
    isOpen.value
    && !root.value?.contains(event.target as Node)
    && !panel.value?.contains(event.target as Node)
  ) {
    close()
  }
}

function closeFromKeyboard(event: KeyboardEvent) {
  if (event.key !== 'Escape' || !isOpen.value) {
    return
  }

  event.stopPropagation()
  close(true)
}

watch(
  () => props.open,
  open => {
    if (open) {
      void nextTick(updatePosition)
      return
    }

    if (open === false) {
      anchor.value = null
    }
  },
)

onMounted(() => {
  document.addEventListener(
    'pointerdown',
    closeFromOutside,
  )

  document.addEventListener(
    'keydown',
    closeFromKeyboard,
  )

  window.addEventListener(
    'resize',
    updatePosition,
  )

  window.addEventListener(
    'scroll',
    updatePosition,
    true,
  )
})

onBeforeUnmount(() => {
  document.removeEventListener(
    'pointerdown',
    closeFromOutside,
  )

  document.removeEventListener(
    'keydown',
    closeFromKeyboard,
  )

  window.removeEventListener(
    'resize',
    updatePosition,
  )

  window.removeEventListener(
    'scroll',
    updatePosition,
    true,
  )
})

defineExpose({
  close,
  updatePosition,
})
</script>

<template>
  <div
    ref="root"
    v-bind="$attrs"
    class="dropdown relative"
    :class="{ 'dropdown-open': isOpen }"
  >
    <div
      class="contents"
      @click="toggle"
    >
      <slot
        name="trigger"
        :open="isOpen"
        :panel-id="panelId"
        :close="close"
      />
    </div>

    <div
      v-if="isOpen"
      :id="panelId"
      ref="panel"
      class="dropdown-content app-dropdown-panel z-60 overflow-y-auto rounded-box border border-base-300 bg-base-100 shadow-xl"
      :class="[panelClasses, props.panelClass]"
      :style="panelStyle"
      :role="panelRole"
      :aria-label="label"
    >
      <slot :close="close" />
    </div>
  </div>
</template>

<style scoped>
.app-dropdown-panel {
  left: var(--dropdown-left);
  max-height: var(--dropdown-max-height);
  position: fixed;
  top: var(--dropdown-top);
}

.app-dropdown-fixed-width {
  width: var(--dropdown-width);
}

.app-dropdown-sm,
.app-dropdown-md {
  width: calc(100vw - 1.5rem);
}

:deep(.app-dropdown-panel > .card) {
  border: 0;
  background: transparent;
}

@media (min-width: 40rem) {
  .app-dropdown-sm {
    width: 18rem;
  }

  .app-dropdown-md {
    width: 24rem;
  }
}
</style>
