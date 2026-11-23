export function validateProjects(value) {
  const projects = Array.isArray(value) ? value : value?.version === 1 ? value.projects : null
  if (!Array.isArray(projects)) throw new Error('项目结构无效')
  const ids = new Set()
  return projects.map((project) => {
    if (!project || typeof project !== 'object') throw new Error('项目无效')
    for (const key of ['id', 'name', 'course']) {
      if (typeof project[key] !== 'string' || !project[key].trim()) throw new Error('项目字段无效')
    }
    if (ids.has(project.id)) throw new Error('项目 ID 重复')
    ids.add(project.id)
    for (const key of ['description', 'folderPath', 'createdAt']) {
      if (project[key] !== undefined && typeof project[key] !== 'string')
        throw new Error('项目字段无效')
    }
    const tasks = project.tasks === undefined ? [] : project.tasks
    if (!Array.isArray(tasks)) throw new Error('任务结构无效')
    const taskIds = new Set()
    for (const task of tasks) {
      if (
        !task ||
        typeof task.id !== 'string' ||
        !task.id.trim() ||
        typeof task.title !== 'string' ||
        !task.title.trim() ||
        typeof task.completed !== 'boolean' ||
        taskIds.has(task.id)
      )
        throw new Error('任务字段无效')
      taskIds.add(task.id)
    }
    return { ...project, tasks }
  })
}
