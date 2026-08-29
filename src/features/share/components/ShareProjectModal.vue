<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import type { StitchProject } from '../../../types/tracker'
import { localizedErrorMessage } from '../../../utils/appError'
import { createProjectFile, downloadFile } from '../../projects/composables/useProjectFiles'
import AppModal from '../../../shared/ui/AppModal.vue'
import { encodeSharedProject, MAX_SHARE_URL_LENGTH } from '../domain/patternShareCodec'

const props = defineProps<{ open: boolean; project: StitchProject | null }>()
const emit = defineEmits<{
  close: []
  copied: []
  shared: []
  downloaded: []
  error: [message: string]
}>()
const { t } = useI18n({ useScope: 'global' })
const router = useRouter()
const status = ref<'idle' | 'preparing' | 'link' | 'file' | 'error'>('idle')
const shareUrl = ref('')
const projectFile = ref<File | null>(null)
const errorMessage = ref('')
const webShareSupported = typeof navigator !== 'undefined' && typeof navigator.share === 'function'
let preparation = 0

function fileShareSupported() {
  try {
    return webShareSupported && Boolean(projectFile.value && navigator.canShare?.({ files: [projectFile.value] }))
  } catch {
    return false
  }
}

function fileFallback(project: StitchProject) {
  projectFile.value = createProjectFile(project)
  shareUrl.value = ''
  status.value = 'file'
}

async function prepare() {
  const project = props.project
  const current = ++preparation
  status.value = project ? 'preparing' : 'idle'
  shareUrl.value = ''
  projectFile.value = null
  errorMessage.value = ''
  if (!project) return
  try {
    const encoded = await encodeSharedProject(project)
    if (current !== preparation) return
    const href = router.resolve({ name: 'share', query: { data: encoded.token } }).href
    const url = new URL(href, window.location.href).href
    if (url.length > MAX_SHARE_URL_LENGTH) {
      fileFallback(project)
      return
    }
    shareUrl.value = url
    status.value = 'link'
  } catch (error) {
    if (current !== preparation) return
    const key = error instanceof Error && error.name === 'AppError' ? error.message : ''
    if (key === 'errors.share.compressedTooLarge' || key === 'errors.share.decompressedTooLarge' || key === 'errors.share.linkTooLong' || key === 'errors.share.unsupportedCompression') {
      try {
        fileFallback(project)
      } catch (fileError) {
        errorMessage.value = localizedErrorMessage(fileError, t) ?? t('share.errors.prepare')
        status.value = 'error'
      }
      return
    }
    errorMessage.value = localizedErrorMessage(error, t) ?? t('share.errors.prepare')
    status.value = 'error'
  }
}

async function copyLink() {
  try {
    await navigator.clipboard.writeText(shareUrl.value)
    emit('copied')
  } catch {
    emit('error', t('share.errors.copy'))
  }
}

async function shareLink() {
  if (!navigator.share) {
    await copyLink()
    return
  }
  try {
    await navigator.share({ title: props.project?.pattern.name, text: t('share.shareText'), url: shareUrl.value })
    emit('shared')
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return
    emit('error', t('share.errors.webShare'))
  }
}

async function shareFile() {
  const file = projectFile.value
  if (!file) return
  try {
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ title: props.project?.pattern.name, text: t('share.fileShareText'), files: [file] })
      emit('shared')
      return
    }
    downloadFile(file)
    emit('downloaded')
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return
    emit('error', t('share.errors.webShare'))
  }
}

watch(() => props.open, open => {
  if (open) void prepare()
  else preparation += 1
})
</script>

<template>
  <AppModal
    :open="open"
    :title="t('share.title')"
    :description="t('share.description')"
    :close-label="t('editor.modal.closeDialog')"
    size="base"
    @close="emit('close')"
  >
    <div
      v-if="status === 'preparing'"
      class="flex items-center gap-3 py-6"
      role="status"
    >
      <span class="loading loading-spinner loading-md text-primary-content" />
      <span>{{ t('share.preparing') }}</span>
    </div>
    <div
      v-else-if="status === 'link'"
      class="grid gap-4"
    >
      <div class="alert alert-info items-start">
        <span
          class="mdi mdi-shield-lock-outline text-xl"
          aria-hidden="true"
        />
        <span>{{ t('share.localNotice') }}</span>
      </div>
      <label class="app-field">
        <span class="font-medium">{{ t('share.linkLabel') }}</span>
        <input
          class="input input-bordered w-full font-mono text-xs"
          type="text"
          readonly
          :value="shareUrl"
          @focus="($event.target as HTMLInputElement).select()"
        >
      </label>
      <p class="text-sm text-base-content/65">
        {{ t('share.trackerNotice') }}
      </p>
    </div>
    <div
      v-else-if="status === 'file'"
      class="grid gap-4"
    >
      <div class="alert alert-warning items-start">
        <span
          class="mdi mdi-file-download-outline text-xl"
          aria-hidden="true"
        />
        <span>{{ t('share.fileFallback') }}</span>
      </div>
      <p class="text-sm text-base-content/65">
        {{ t('share.trackerNotice') }}
      </p>
    </div>
    <div
      v-else-if="status === 'error'"
      class="alert alert-error"
      role="alert"
    >
      {{ errorMessage }}
    </div>

    <template #actions>
      <button
        class="btn btn-ghost"
        type="button"
        @click="emit('close')"
      >
        {{ t('editor.modal.close') }}
      </button>
      <button
        v-if="status === 'link'"
        class="btn btn-outline"
        type="button"
        @click="copyLink"
      >
        <span
          class="mdi mdi-content-copy"
          aria-hidden="true"
        />{{ t('share.copyLink') }}
      </button>
      <button
        v-if="status === 'link'"
        class="btn btn-primary"
        type="button"
        @click="shareLink"
      >
        <span
          class="mdi mdi-share-variant-outline"
          aria-hidden="true"
        />{{ webShareSupported ? t('share.shareLink') : t('share.copyLink') }}
      </button>
      <button
        v-if="status === 'file'"
        class="btn btn-primary"
        type="button"
        @click="shareFile"
      >
        <span
          class="mdi mdi-file-send-outline"
          aria-hidden="true"
        />{{ fileShareSupported() ? t('share.shareFile') : t('share.downloadFile') }}
      </button>
    </template>
  </AppModal>
</template>
