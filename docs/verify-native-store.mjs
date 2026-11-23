import assert from 'node:assert/strict'
import { mkdtemp, readFile, writeFile, readdir, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createProjectStore } from '../src/main/project-store.mjs'
const dir = await mkdtemp(join(tmpdir(), 'usy-store-'))
const file = join(dir, 'usy-data.json')
const project = {
  id: 'p1',
  name: '测试项目',
  course: '课程',
  tasks: [{ id: 't1', title: '测试任务', completed: false }]
}
const results = []
const check = (name, value) => {
  assert.ok(value, name)
  results.push(name)
}
const store = createProjectStore(file)
check('未读取时禁止写入', !(await store.save([])).success)
check('首次文件缺失为空', (await store.load()).missing)
check('正常保存', (await store.save([project])).success)
check(
  '重启读回完整任务',
  (await createProjectStore(file).load()).projects[0].tasks[0].title === '测试任务'
)
const writes = Array.from({ length: 20 }, (_, i) => store.save([{ ...project, name: '项目' + i }]))
check(
  '连续二十次写入均成功',
  (await Promise.all(writes)).every((r) => r.success)
)
check(
  '连续写入保留最后一版',
  JSON.parse(await readFile(file, 'utf8')).projects[0].name === '项目19'
)
const good = await readFile(file, 'utf8')
check(
  '非法数据不覆盖文件',
  !(await store.save([{ ...project, tasks: [{ id: 't', title: '', completed: false }] }]))
    .success && (await readFile(file, 'utf8')) === good
)
await writeFile(file, '{损坏数据')
check('坏文件暂停读取', !(await store.load()).success)
check(
  '坏文件不自动覆盖',
  !(await store.save([])).success && (await readFile(file, 'utf8')) === '{损坏数据'
)
check('备份后恢复成功', (await store.recover()).success)
const backup = (await readdir(dir)).find((n) => n.endsWith('.bak'))
check('备份原字节保持不变', (await readFile(join(dir, backup), 'utf8')) === '{损坏数据')
check(
  '恢复后为空且可保存',
  (await store.load()).projects.length === 0 && (await store.save([project])).success
)
const bad = createProjectStore(join(dir, 'directory'))
await mkdir(join(dir, 'directory'))
check('读取目录失败时保护数据', !(await bad.load()).success && !(await bad.recover()).success)
check('未遗留临时文件', !(await readdir(dir)).some((n) => n.endsWith('.tmp')))
console.log(JSON.stringify({ dir, results }, null, 2))
