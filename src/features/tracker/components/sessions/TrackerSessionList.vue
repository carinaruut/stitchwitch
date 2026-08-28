<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { TrackerSession } from '../../../../types/tracker'
import { trackerSessionNetStitches } from '../../../../utils/tracker'
import { formatSignedTrackerNumber, formatTrackerDuration } from '../../domain/trackerFormatters'

defineProps<{ sessions: readonly TrackerSession[] }>()
const emit = defineEmits<{ remove: [sessionId: string] }>()
const { d, n, t } = useI18n({ useScope: 'global' })
const formatSigned = (value: number) => formatSignedTrackerNumber(value, (number) => n(number, 'integer'))
</script>

<template>
  <div>
    <h3 class="text-sm font-semibold">
      {{ t('tracker.sessions.history') }}
    </h3>
    <p class="mt-1 text-xs text-base-content/60">
      {{ t('tracker.sessions.historyDescription') }}
    </p>
  </div>

  <p
    v-if="sessions.length === 0"
    class="rounded-box border border-dashed border-base-300 p-6 text-center text-sm text-base-content/55"
  >
    {{ t('tracker.sessions.empty') }}
  </p>

  <ol
    v-else
    class="space-y-3"
  >
    <li
      v-for="session in sessions"
      :key="session.id"
      class="rounded-box border border-base-300 bg-base-200/40 p-4"
    >
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="font-semibold">
            {{ d(new Date(session.startedAt), 'short') }}
          </p>
          <p class="mt-1 text-xs text-base-content/60">
            <time :datetime="session.startedAt">{{ t('tracker.sessions.start', { date: d(new Date(session.startedAt), 'short') }) }}</time>
            <span aria-hidden="true"> · </span>
            <time :datetime="session.endedAt">{{ t('tracker.sessions.end', { date: d(new Date(session.endedAt), 'short') }) }}</time>
          </p>
        </div>
        <button
          class="btn btn-ghost btn-square btn-sm text-error"
          type="button"
          :aria-label="t('tracker.sessions.remove', { date: d(new Date(session.startedAt), 'short') })"
          :title="t('tracker.sessions.remove', { date: d(new Date(session.startedAt), 'short') })"
          @click="emit('remove', session.id)"
        >
          <span
            class="mdi mdi-delete-outline"
            aria-hidden="true"
          />
        </button>
      </div>
      <dl class="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div>
          <dt class="text-xs text-base-content/55">
            {{ t('tracker.sessions.duration') }}
          </dt>
          <dd class="mt-0.5 font-mono font-semibold tabular-nums">
            {{ formatTrackerDuration(session.durationMilliseconds) }}
          </dd>
        </div>
        <div>
          <dt class="text-xs text-base-content/55">
            {{ t('tracker.sessions.completed') }}
          </dt>
          <dd class="mt-0.5 font-semibold tabular-nums">
            {{ n(session.stitchesCompleted, 'integer') }}
          </dd>
        </div>
        <div>
          <dt class="text-xs text-base-content/55">
            {{ t('tracker.sessions.reopened') }}
          </dt>
          <dd class="mt-0.5 font-semibold tabular-nums">
            {{ n(session.stitchesReopened, 'integer') }}
          </dd>
        </div>
        <div>
          <dt class="text-xs text-base-content/55">
            {{ t('tracker.sessions.net') }}
          </dt>
          <dd class="mt-0.5 font-semibold tabular-nums">
            {{ formatSigned(trackerSessionNetStitches(session)) }}
          </dd>
        </div>
      </dl>
    </li>
  </ol>
</template>
