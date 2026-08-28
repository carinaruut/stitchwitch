<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { pickScreenColor } from '../../../utils/eyeDropper'

const props = defineProps<{ picking: boolean }>()
const emit = defineEmits<{ pick: [color: string]; requestPick: []; close: []; error: [message: string] }>()
const { t } = useI18n({ useScope: 'global' })
const fileInput = ref<HTMLInputElement | null>(null)
const imageElement = ref<HTMLImageElement | null>(null)
const imageUrl = ref<string | null>(null)
const filename = ref('')
const dimensions = ref({ width: 0, height: 0 })
const fit = ref(true)
const zoom = ref(100)
const dragging = ref(false)
const marker = ref<{ x: number; y: number; color: string } | null>(null)
const errorMessage = ref('')
const pickingFromScreen = ref(false)
let sourceImage: HTMLImageElement | null = null
const sampleCanvas = document.createElement('canvas')
sampleCanvas.width = 1
sampleCanvas.height = 1

const imageStyle = computed(() => fit.value
  ? { width: '100%' }
  : { width: `${dimensions.value.width * zoom.value / 100}px` })

function clearImage() {
  if (imageUrl.value) URL.revokeObjectURL(imageUrl.value)
  imageUrl.value = null
  filename.value = ''
  dimensions.value = { width: 0, height: 0 }
  marker.value = null
  fit.value = true
  zoom.value = 100
  sourceImage = null
  errorMessage.value = ''
}

function reportError(message: string) {
  errorMessage.value = message
  emit('error', message)
}

async function loadFile(file: File) {
  if (!file.type.startsWith('image/')) {
    reportError(t('controls.reference.errors.type'))
    return
  }
  if (file.size > 20_000_000) {
    reportError(t('controls.reference.errors.size'))
    return
  }

  const url = URL.createObjectURL(file)
  const image = new Image()
  image.src = url
  try {
    await image.decode()
    if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth * image.naturalHeight > 50_000_000 || image.naturalWidth > 16_384 || image.naturalHeight > 16_384) {
      URL.revokeObjectURL(url)
      reportError(t('controls.reference.errors.dimensions'))
      return
    }
    clearImage()
    imageUrl.value = url
    filename.value = file.name
    dimensions.value = { width: image.naturalWidth, height: image.naturalHeight }
    sourceImage = image
    errorMessage.value = ''
  } catch {
    URL.revokeObjectURL(url)
    reportError(t('controls.reference.errors.decode'))
  }
}

function selectFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (file) void loadFile(file)
}

function dropFile(event: DragEvent) {
  dragging.value = false
  const file = event.dataTransfer?.files[0]
  if (file) void loadFile(file)
}

function sampleColor(event: MouseEvent) {
  if (!props.picking || !imageElement.value || !sourceImage) return
  const image = imageElement.value
  const bounds = image.getBoundingClientRect()
  const x = Math.max(0, Math.min(image.naturalWidth - 1, Math.floor((event.clientX - bounds.left) * image.naturalWidth / bounds.width)))
  const y = Math.max(0, Math.min(image.naturalHeight - 1, Math.floor((event.clientY - bounds.top) * image.naturalHeight / bounds.height)))
  const context = sampleCanvas.getContext('2d', { willReadFrequently: true })
  if (!context) return
  context.clearRect(0, 0, 1, 1)
  context.imageSmoothingEnabled = false
  context.drawImage(sourceImage, x, y, 1, 1, 0, 0, 1, 1)
  const [red, green, blue, alpha] = context.getImageData(0, 0, 1, 1).data
  if (alpha === 0) {
    reportError(t('controls.reference.errors.transparent'))
    return
  }
  const opacity = alpha / 255
  const composite = [red, green, blue].map(channel => Math.round(channel * opacity + 255 * (1 - opacity)))
  const color = `#${composite.map(channel => channel.toString(16).padStart(2, '0')).join('')}`
  marker.value = { x: (x + 0.5) / image.naturalWidth * 100, y: (y + 0.5) / image.naturalHeight * 100, color }
  errorMessage.value = ''
  emit('pick', color)
}

async function requestColorPick() {
  pickingFromScreen.value = true
  const result = await pickScreenColor()
  pickingFromScreen.value = false
  if (result.status === 'picked') emit('pick', result.color)
  else if (result.status === 'unavailable') emit('requestPick')
}

function adjustZoom(change: number) {
  fit.value = false
  zoom.value = Math.max(25, Math.min(400, zoom.value + change))
}

onBeforeUnmount(clearImage)
</script>

<template>
  <aside class="card min-w-0 border border-base-300 bg-base-100">
    <div class="card-body app-card-body min-w-0">
      <div class="flex items-center justify-between gap-2">
        <h2 class="card-title min-w-0 text-sm">
          <span
            class="mdi mdi-image-outline text-xl"
            aria-hidden="true"
          /><span class="truncate">{{ t('controls.reference.title') }}</span>
        </h2>
        <button
          class="btn btn-ghost btn-sm"
          type="button"
          :aria-label="t('controls.reference.close')"
          :title="t('controls.reference.close')"
          @click="$emit('close')"
        >
          <span
            class="mdi mdi-close text-xl"
            aria-hidden="true"
          />
        </button>
      </div>

      <input
        ref="fileInput"
        class="hidden"
        type="file"
        accept="image/*"
        @change="selectFile"
      >

      <div
        v-if="errorMessage"
        class="alert alert-error py-2 text-xs"
        role="alert"
      >
        <span
          class="mdi mdi-alert-circle-outline"
          aria-hidden="true"
        /><span>{{ errorMessage }}</span>
      </div>

      <button
        v-if="!imageUrl"
        class="grid min-h-56 w-full place-items-center rounded-box border-2 border-dashed p-6 text-center transition-colors"
        :class="dragging ? 'border-primary bg-primary/10' : 'border-base-300 bg-base-200/40 hover:border-primary/60'"
        type="button"
        @click="fileInput?.click()"
        @dragenter.prevent="dragging = true"
        @dragover.prevent="dragging = true"
        @dragleave.prevent="dragging = false"
        @drop.prevent="dropFile"
      >
        <span>
          <span
            class="mdi mdi-image-plus-outline block text-4xl text-primary"
            aria-hidden="true"
          />
          <strong class="mt-2 block text-sm">{{ t('controls.reference.add') }}</strong>
          <span class="mt-1 block text-xs text-base-content/60">{{ t('controls.reference.drop') }}</span>
        </span>
      </button>

      <template v-else>
        <div
          class="app-toolbar"
          role="toolbar"
          :aria-label="t('controls.reference.title')"
        >
          <button
            class="btn btn-sm"
            :class="picking || pickingFromScreen ? 'btn-primary' : 'btn-ghost'"
            type="button"
            :disabled="pickingFromScreen"
            :aria-busy="pickingFromScreen"
            :aria-pressed="picking || pickingFromScreen"
            :aria-label="t('controls.reference.pick')"
            :title="t('controls.reference.pick')"
            @click="requestColorPick"
          >
            <span
              class="mdi text-xl"
              :class="pickingFromScreen ? 'mdi-loading mdi-spin' : 'mdi-eyedropper'"
              aria-hidden="true"
            />
          </button>
          <button
            class="btn btn-sm"
            :class="fit ? 'btn-primary' : 'btn-ghost'"
            type="button"
            :aria-pressed="fit"
            :aria-label="t('controls.reference.fit')"
            :title="t('controls.reference.fit')"
            @click="fit = true"
          >
            <span
              class="mdi mdi-fit-to-screen-outline text-xl"
              aria-hidden="true"
            />
          </button>
          <button
            class="btn btn-ghost btn-sm"
            type="button"
            :aria-label="t('controls.reference.zoomOut')"
            :title="t('controls.reference.zoomOut')"
            @click="adjustZoom(-25)"
          >
            <span
              class="mdi mdi-minus text-xl"
              aria-hidden="true"
            />
          </button>
          <span class="min-w-10 text-center font-mono text-xs tabular-nums">{{ fit ? t('controls.reference.fitShort') : `${zoom}%` }}</span>
          <button
            class="btn btn-ghost btn-sm"
            type="button"
            :aria-label="t('controls.reference.zoomIn')"
            :title="t('controls.reference.zoomIn')"
            @click="adjustZoom(25)"
          >
            <span
              class="mdi mdi-plus text-xl"
              aria-hidden="true"
            />
          </button>
        </div>

        <p
          class="text-xs"
          :class="picking ? 'font-medium text-primary' : 'text-base-content/60'"
        >
          {{ t(picking ? 'controls.reference.pickHelp' : 'controls.reference.idleHelp') }}
        </p>

        <div class="max-h-[65dvh] min-h-56 overflow-auto rounded-box border border-base-300 bg-white">
          <div
            class="relative leading-none"
            :style="imageStyle"
          >
            <img
              ref="imageElement"
              class="block h-auto w-full select-none"
              :class="picking ? 'cursor-crosshair' : 'cursor-default'"
              :src="imageUrl"
              :alt="t('controls.reference.imageAlt', { name: filename })"
              draggable="false"
              @click="sampleColor"
            >
            <span
              v-if="marker"
              class="pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_#111827]"
              :style="{ left: `${marker.x}%`, top: `${marker.y}%`, backgroundColor: marker.color }"
              aria-hidden="true"
            />
          </div>
        </div>

        <div class="flex min-w-0 items-center gap-2">
          <span
            class="min-w-0 flex-1 truncate text-xs text-base-content/60"
            :title="filename"
          >{{ filename }}</span>
          <button
            class="btn btn-ghost btn-sm"
            type="button"
            @click="fileInput?.click()"
          >
            {{ t('controls.reference.replace') }}
          </button>
          <button
            class="btn btn-ghost btn-sm text-error"
            type="button"
            @click="clearImage"
          >
            {{ t('controls.reference.remove') }}
          </button>
        </div>
      </template>
    </div>
  </aside>
</template>
