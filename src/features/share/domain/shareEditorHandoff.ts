import type { StitchProject } from '../../../types/tracker'

let pendingProject: StitchProject | null = null

export function setPendingSharedProject(project: StitchProject) {
  pendingProject = structuredClone(project)
}

export function takePendingSharedProject() {
  const project = pendingProject
  pendingProject = null
  return project
}
