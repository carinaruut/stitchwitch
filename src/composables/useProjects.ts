import { computed, ref, shallowRef, watch, type Ref } from 'vue'
import type { NewPatternProject } from '../types/pattern'
import type { StitchProject } from '../types/tracker'
import { asStitchProject } from '../utils/project'
import { createStableId } from '../utils/validation'
import { createGrid } from '../utils/grid'
import { createDefaultProject, createPattern, type PatternState } from './usePattern'
import { useTracker } from './useTracker'

const LEGACY_AUTOSAVE_KEY = 'stitch-project-autosave'
const TABS_KEY = 'stitch-project-tabs-v1'
const PROJECT_KEY_PREFIX = 'stitch-project-autosave:'

export type ProjectWorkspace = 'editor' | 'tracker'
export type TrackerController = ReturnType<typeof useTracker>

export interface ProjectSession {
  id: string
  pattern: PatternState
  tracker: TrackerController
  workspace: Ref<ProjectWorkspace>
  downloadBackupNeeded: Ref<boolean>
  dispose: () => void
}

interface StoredTabs {
  version: 1
  activeProjectId: string
  projects: Array<{ id: string; workspace: ProjectWorkspace }>
}

function projectKey(id: string) {
  return `${PROJECT_KEY_PREFIX}${id}`
}

function readStoredTabs(): StoredTabs | null {
  try {
    const value = JSON.parse(localStorage.getItem(TABS_KEY) ?? 'null') as Partial<StoredTabs> | null
    if (value?.version !== 1 || typeof value.activeProjectId !== 'string' || !Array.isArray(value.projects)) return null
    const projects = value.projects.filter((item): item is { id: string; workspace: ProjectWorkspace } => (
      typeof item?.id === 'string' && (item.workspace === 'editor' || item.workspace === 'tracker')
    ))
    return projects.length > 0 ? { version: 1, activeProjectId: value.activeProjectId, projects } : null
  } catch {
    return null
  }
}

function readDocument(key: string): StitchProject | null {
  try {
    const value = localStorage.getItem(key)
    return value ? asStitchProject(JSON.parse(value)) : null
  } catch {
    return null
  }
}

function newDocument(): StitchProject {
  return { format: 'stitch-project', version: 1, pattern: createDefaultProject() }
}

function documentFromInput(input: NewPatternProject): StitchProject {
  return {
    format: 'stitch-project',
    version: 1,
    pattern: {
      ...input,
      format: 'stitch-pattern',
      version: 1,
      rowIds: Array.from({ length: input.rows }, createStableId),
      columnIds: Array.from({ length: input.columns }, createStableId),
      previewStitch: 'knit',
      recentColors: [],
      swatches: [],
      palette: [],
      repeatBoxes: [],
      annotations: [],
      cells: createGrid(input.rows, input.columns, input.backgroundColor),
    },
  }
}

function createProjectManager() {
  const sessions = shallowRef<ProjectSession[]>([])
  const activeProjectId = ref('')
  let restoredCount = 0

  function persistTabs() {
    try {
      const value: StoredTabs = {
        version: 1,
        activeProjectId: activeProjectId.value,
        projects: sessions.value.map((session) => ({ id: session.id, workspace: session.workspace.value })),
      }
      localStorage.setItem(TABS_KEY, JSON.stringify(value))
    } catch {
      // Individual project autosave badges report storage failures.
    }
  }

  function addSession(document: StitchProject, options: { id?: string; workspace?: ProjectWorkspace; recovered?: boolean; backupNeeded?: boolean } = {}) {
    const id = options.id ?? crypto.randomUUID()
    const pattern = createPattern(document, { autosaveKey: projectKey(id), recovered: options.recovered })
    const session: ProjectSession = {
      id,
      pattern,
      tracker: useTracker(pattern.project, pattern.tracker),
      workspace: ref(options.workspace ?? 'editor'),
      downloadBackupNeeded: ref(options.backupNeeded ?? Boolean(options.recovered)),
      dispose: () => {},
    }
    const stopWorkspace = watch(session.workspace, persistTabs)
    const stopDirty = watch([pattern.project, pattern.tracker], () => {
      session.downloadBackupNeeded.value = true
    }, { deep: true })
    session.dispose = () => {
      stopWorkspace()
      stopDirty()
      pattern.dispose()
    }
    sessions.value = [...sessions.value, session]
    activeProjectId.value = id
    persistTabs()
    return session
  }

  const storedTabs = readStoredTabs()
  if (storedTabs) {
    for (const stored of storedTabs.projects) {
      const document = readDocument(projectKey(stored.id))
      if (document) {
        addSession(document, { id: stored.id, workspace: stored.workspace, recovered: true })
        restoredCount += 1
      }
    }
    if (sessions.value.some((session) => session.id === storedTabs.activeProjectId)) activeProjectId.value = storedTabs.activeProjectId
  }

  if (sessions.value.length === 0) {
    const legacy = readDocument(LEGACY_AUTOSAVE_KEY)
    if (legacy) {
      addSession(legacy, { recovered: true })
      restoredCount = 1
      try {
        sessions.value[0].pattern.flushAutosave()
        if (sessions.value[0].pattern.autosaveStatus.value === 'saved') localStorage.removeItem(LEGACY_AUTOSAVE_KEY)
      } catch {
        // Keep the legacy copy if migration cannot complete.
      }
    } else addSession(newDocument())
  }
  persistTabs()

  const activeSession = computed(() => sessions.value.find((session) => session.id === activeProjectId.value) ?? sessions.value[0])

  function activate(id: string) {
    if (!sessions.value.some((session) => session.id === id)) return
    activeProjectId.value = id
    persistTabs()
  }

  function createProject(input: NewPatternProject) {
    return addSession(documentFromInput(input), { backupNeeded: true })
  }

  function openProject(document: StitchProject) {
    return addSession(document)
  }

  function closeProject(id: string) {
    const index = sessions.value.findIndex((session) => session.id === id)
    if (index < 0) return
    const [session] = sessions.value.splice(index, 1)
    session.dispose()
    sessions.value = [...sessions.value]
    if (activeProjectId.value === id) {
      activeProjectId.value = sessions.value[Math.min(index, sessions.value.length - 1)]?.id ?? ''
    }
    persistTabs()
    try {
      localStorage.removeItem(projectKey(id))
    } catch {
      // The tab is still closed when storage is unavailable.
    }
    if (sessions.value.length === 0) addSession(newDocument())
  }

  function flushAll() {
    sessions.value.forEach((session) => session.pattern.flushAutosave())
    persistTabs()
  }

  return {
    sessions,
    activeProjectId,
    activeSession,
    restoredCount,
    activate,
    createProject,
    openProject,
    closeProject,
    flushAll,
  }
}

export type ProjectManager = ReturnType<typeof createProjectManager>

let sharedProjects: ProjectManager | undefined

export function useProjects() {
  sharedProjects ??= createProjectManager()
  return sharedProjects
}

export function activePatternProxy(projects: ProjectManager): PatternState {
  return new Proxy({} as PatternState, {
    get(_target, property: keyof PatternState) {
      const value = projects.activeSession.value.pattern[property]
      if (typeof value === 'function') {
        return (...args: unknown[]) => {
          const method = projects.activeSession.value.pattern[property] as (...methodArgs: unknown[]) => unknown
          return method(...args)
        }
      }
      return value
    },
  })
}
