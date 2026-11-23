export const STORAGE_KEY = 'usy-project-studio:projects'
import { validateProjects } from '../../shared/projects.mjs'
export { validateProjects }
export function loadProjects(initial, storage) {
  let raw = null
  try {
    raw = (storage || window.localStorage).getItem(STORAGE_KEY)
    return { projects: raw === null ? initial : validateProjects(JSON.parse(raw)), raw, error: '' }
  } catch {
    return {
      projects: [],
      raw,
      error: '无法读取保存数据，已暂停编辑与自动保存，原始记录不会被覆盖。'
    }
  }
}
export function saveProjects(projects) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, projects }))
    return ''
  } catch {
    return '尚未保存，关闭可能丢失本次修改。请重试保存。'
  }
}
export async function loadWorkspace() {
  if (!window.api?.loadData) return loadProjects([])
  try {
    const result = await window.api.loadData()
    if (!result.success) return { projects: [], raw: result.raw, error: result.message }
    if (!result.missing) {
      return { projects: validateProjects(result.projects), raw: result.raw, error: '' }
    }
    // 只在原生文件不存在时迁移旧记录；保留 localStorage 原件。
    const legacy = loadProjects([])
    if (legacy.error) return legacy
    const saved = await window.api.saveData(legacy.projects)
    if (!saved.success) return { ...legacy, error: saved.message }
    return { ...legacy, migrated: legacy.raw !== null }
  } catch {
    return { projects: [], raw: null, error: '无法连接本地数据服务，请重新读取，编辑已暂停。' }
  }
}
export async function saveWorkspace(projects) {
  if (!window.api?.saveData) return saveProjects(projects)
  try {
    const result = await window.api.saveData(projects)
    return result.success ? '' : result.message || '本地文件保存失败，请重试。'
  } catch {
    return '本地文件保存失败，请重试。'
  }
}
export function summary(projects) {
  const tasks = projects.flatMap((p) => p.tasks)
  const completed = tasks.filter((t) => t.completed).length
  return {
    total: tasks.length,
    completed,
    pending: tasks.length - completed,
    percent: tasks.length ? Math.round((completed / tasks.length) * 100) : 0
  }
}
export function dateValue(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return 0
  const date = new Date(value)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
    ? date.getTime()
    : 0
}
