import { promises as fs } from 'node:fs'
import { dirname } from 'node:path'
import { randomUUID } from 'node:crypto'
import { validateProjects } from '../shared/projects.mjs'

// 所有写入排队，临时文件完整写好后才替换，避免连续操作倒序或半写入。
export function createProjectStore(file) {
  let queue = Promise.resolve()
  let readable = false
  const enqueue = (action) => {
    const result = queue.then(action)
    queue = result.catch(() => {})
    return result
  }
  async function write(projects) {
    const valid = validateProjects(projects)
    await fs.mkdir(dirname(file), { recursive: true })
    const temporary = `${file}.${randomUUID()}.tmp`
    try {
      await fs.writeFile(temporary, JSON.stringify({ version: 1, projects: valid }, null, 2), {
        encoding: 'utf8',
        flag: 'wx'
      })
      await fs.rename(temporary, file)
    } finally {
      await fs.unlink(temporary).catch(() => {})
    }
    return { success: true }
  }
  return {
    load: () =>
      enqueue(async () => {
        let raw = null
        try {
          raw = await fs.readFile(file, 'utf8')
          const projects = validateProjects(JSON.parse(raw))
          readable = true
          return { success: true, projects, raw, missing: false }
        } catch (error) {
          if (error.code === 'ENOENT') {
            readable = true
            return { success: true, projects: [], raw: null, missing: true }
          }
          readable = false
          return {
            success: false,
            projects: [],
            raw,
            message: '无法读取本地项目文件，编辑已暂停，原文件不会被覆盖。'
          }
        }
      }),
    save: (projects) =>
      enqueue(async () => {
        if (!readable)
          return { success: false, message: '请先成功读取本地文件，不能覆盖未读取或损坏的数据。' }
        try {
          return await write(projects)
        } catch {
          return { success: false, message: '本地文件保存失败，请检查磁盘空间与目录权限后重试。' }
        }
      }),
    recover: () =>
      enqueue(async () => {
        try {
          // 复制原字节且不覆盖旧备份；备份失败则绝不重置。
          const raw = await fs.readFile(file)
          await fs.writeFile(`${file}.recovery-${randomUUID()}.bak`, raw, { flag: 'wx' })
          await write([])
          readable = true
          return { success: true }
        } catch {
          return { success: false, message: '原文件备份或恢复失败，未完成重置。' }
        }
      }),
    idle: () => queue
  }
}
