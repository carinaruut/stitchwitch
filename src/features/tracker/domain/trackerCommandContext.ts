import type { Ref } from 'vue'
import type { PatternProject } from '../../../types/pattern'
import type { TrackerPreferences, TrackerState } from '../../../types/tracker'

export interface TrackerCommandContext {
  pattern: Ref<PatternProject>
  tracker: Ref<TrackerState | undefined>
  completedCount: Readonly<Ref<number>>
  ensureTracker: (preferences?: TrackerPreferences) => TrackerState
  recordState: () => void
  changed: () => void
}
