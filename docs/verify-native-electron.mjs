// 构建后运行；只操作本脚本启动的 Electron 和专用测试数据目录。
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync, readFileSync, unlinkSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'
import { Browser, Page, sleep } from './lib/cdp.mjs'

const out = process.env.USY_QA_OUTPUT || 'docs/evidence/native-latest'
mkdirSync(out, { recursive: true })
const profile = resolve('out', `qa-native-${Date.now()}`)
mkdirSync(profile, { recursive: true })
const results = []
async function launch() {
  const env = { ...process.env }
  delete env.ELECTRON_RUN_AS_NODE
  delete env.ELECTRON_RENDERER_URL
  const proc = spawn(
    process.env.USY_QA_EXECUTABLE || resolve('node_modules/electron/dist/electron.exe'),
    [
      ...(process.env.USY_QA_EXECUTABLE ? [] : ['.']),
      '--remote-debugging-port=0',
      `--user-data-dir=${profile}`
    ],
    { env, windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] }
  )
  const endpoint = await new Promise((resolve, reject) => {
    let log = ''
    const timer = setTimeout(() => reject(new Error('Electron 调试端口启动超时')), 20000)
    proc.stderr.on('data', (chunk) => {
      log += chunk
      const match = log.match(/DevTools listening on (ws:\/\/[^\s]+)/)
      if (match) {
        clearTimeout(timer)
        resolve(match[1])
      }
    })
    proc.once('exit', (code) => {
      clearTimeout(timer)
      reject(new Error('Electron 提前退出: ' + code))
    })
  })
  const b = new Browser()
  b.proc = proc
  b.nextId = 1
  b.pending = new Map()
  b.listeners = new Map()
  b.ws = new WebSocket(endpoint)
  await new Promise((resolve, reject) => {
    b.ws.onopen = resolve
    b.ws.onerror = reject
  })
  b.ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data)
    if (msg.id && b.pending.has(msg.id)) {
      const p = b.pending.get(msg.id)
      clearTimeout(p.timer)
      b.pending.delete(msg.id)
      if (msg.error) p.reject(new Error(msg.error.message))
      else p.resolve(msg.result)
    } else if (msg.method) {
      for (const f of b.listeners.get((msg.sessionId || '') + '|' + msg.method) || []) f(msg.params)
    }
  }
  let target
  for (let i = 0; i < 80; i++) {
    target = (await b.send('Target.getTargets')).targetInfos.find(
      (t) => t.type === 'page' && t.url.startsWith('file:')
    )
    if (target) break
    await sleep(100)
  }
  assert.ok(target, '构建产物从本地文件加载')
  const { sessionId } = await b.send('Target.attachToTarget', {
    targetId: target.targetId,
    flatten: true
  })
  const p = new Page(b, target.targetId, sessionId)
  await p.send('Page.enable')
  await p.send('Runtime.enable')
  await sleep(1000)
  return { b, p, proc }
}
async function close({ b, proc }) {
  await b.send('Browser.close', {}, undefined, 3000).catch(() => {})
  b.ws.close()
  for (let i = 0; i < 30 && proc.exitCode === null; i++) await sleep(100)
  if (proc.exitCode === null) proc.kill()
}
let run
const check = (name, condition) => {
  assert.ok(condition, name)
  results.push(name)
  console.log('通过：' + name)
}
const dataFile = resolve(profile, 'usy-data.json')
const disk = () => JSON.parse(readFileSync(dataFile, 'utf8')).projects
const text = () => run.p.eval(() => document.body.innerText)
async function waitFor(fn) {
  for (let i = 0; i < 100; i++) {
    if (await fn()) return
    await sleep(70)
  }
  throw new Error('等待状态超时')
}
async function saved() {
  await waitFor(() =>
    run.p.eval(() => document.querySelector('.save-state').textContent.includes('已保存至本机'))
  )
}
async function click(selector, label = '') {
  const point = await run.p.eval(
    ({ selector, label }) => {
      const el = [...document.querySelectorAll(selector)].find(
        (e) =>
          e.getClientRects().length &&
          !e.disabled &&
          e.textContent.replace(/\s/g, '').includes(label.replace(/\s/g, ''))
      )
      if (!el) throw new Error('找不到：' + selector + ' ' + label)
      el.scrollIntoView({ block: 'center' })
      const r = el.getBoundingClientRect()
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
    },
    { selector, label }
  )
  await run.p.send('Input.dispatchMouseEvent', {
    type: 'mousePressed',
    button: 'left',
    clickCount: 1,
    ...point
  })
  await run.p.send('Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    button: 'left',
    clickCount: 1,
    ...point
  })
  await sleep(240)
}
async function fill(selector, value) {
  await run.p.eval(
    ({ selector, value }) => {
      const input = document.querySelector(selector)
      const proto =
        input.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(input, value)
      input.dispatchEvent(new Event('input', { bubbles: true }))
    },
    { selector, value }
  )
  await sleep(100)
}
async function capture(name) {
  await sleep(250)
  await run.p.screenshot({ path: `${out}/${name}.png`, format: 'png' })
}
try {
  run = await launch()
  await waitFor(() =>
    run.p.eval(() => !document.querySelector('.save-state').textContent.includes('正在读取'))
  )
  check(
    '页面标题与原生桥接正确',
    await run.p.eval(
      () => document.title.startsWith('USY Studio') && typeof window.api.saveData === 'function'
    )
  )
  check(
    '首次工作空间为空，无自动演示项目',
    disk().length === 0 && (await text()).includes('0 个项目')
  )
  await click('button', '新建项目')
  await click('.ant-modal-footer button', '创建项目')
  check(
    '新建空白表单有校验',
    await run.p.eval(() => document.querySelectorAll('.ant-form-item-explain-error').length >= 2)
  )
  await fill('#name', '本地课程项目')
  await fill('#course', '区块链工程')
  await fill('#folderPath', profile)
  await fill('#description', '课程工作台原生能力验收')
  await click('.ant-modal-footer button', '创建项目')
  await saved()
  check('创建项目保存到原生 JSON', disk()[0].name === '本地课程项目')
  const original = disk()[0]
  await click('.ant-menu-item', '任务管理')
  await fill('.task-entry input', '保留这条任务')
  await click('.task-entry button', '添加任务')
  await saved()
  await click('.task-row input')
  await saved()
  check('添加及勾选任务保存完成状态', disk()[0].tasks[0].completed)
  await click('.task-entry button', '添加任务')
  check('空白任务有可见校验', (await text()).includes('请输入 1–300'))
  await fill('.task-entry input', '回车新增任务')
  await click('.task-entry input')
  await run.p.send('Input.dispatchKeyEvent', {
    type: 'keyDown',
    key: 'Enter',
    code: 'Enter',
    windowsVirtualKeyCode: 13
  })
  await run.p.send('Input.dispatchKeyEvent', {
    type: 'keyUp',
    key: 'Enter',
    code: 'Enter',
    windowsVirtualKeyCode: 13
  })
  await saved()
  check(
    '回车新增且焦点返回输入框',
    disk()[0].tasks.length === 2 &&
      (await run.p.eval(
        () => document.activeElement === document.querySelector('.task-entry input')
      ))
  )
  await fill('.task-entry input', '输入法候选')
  await run.p.eval(() => {
    const el = document.querySelector('.task-entry input')
    el.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }))
    el.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 229,
        isComposing: true,
        bubbles: true
      })
    )
    el.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }))
  })
  check('输入法确认不误添加任务', disk()[0].tasks.length === 2)
  await fill('.task-entry input', '')
  await click('.task-row:last-child button', '删除')
  await click('.ant-popover button', '取消')
  check('取消删除任务保留数据', disk()[0].tasks.length === 2)
  await click('.task-row:last-child button', '删除')
  await click('.ant-popover button', '删除')
  await saved()
  check('确认删除任务且更新统计', disk()[0].tasks.length === 1)
  await fill('.task-entry input', '长任务'.repeat(100))
  await click('.task-entry button', '添加任务')
  await saved()
  await run.p.setViewport({ width: 390, height: 844 })
  await sleep(250)
  check(
    '300字符任务窄屏无横向溢出',
    await run.p.eval(
      () =>
        document.querySelector('.neirongquyu').scrollWidth <=
        document.querySelector('.neirongquyu').clientWidth + 1
    )
  )
  await capture('long-task-390')
  await run.p.setViewport({ width: 900, height: 630 })
  await click('.task-row:last-child button', '删除')
  await click('.ant-popover button', '删除')
  await saved()
  await run.p.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }]
  })
  check(
    '减少动态效果关闭过渡',
    await run.p.eval(() =>
      getComputedStyle(document.querySelector('.task-entry button'))
        .transitionDuration.split(',')
        .every((v) => parseFloat(v) === 0)
    )
  )
  await run.p.send('Emulation.setEmulatedMedia', { features: [] })
  await run.p.send('Input.dispatchKeyEvent', {
    type: 'keyDown',
    key: 'Tab',
    code: 'Tab',
    windowsVirtualKeyCode: 9
  })
  await run.p.send('Input.dispatchKeyEvent', {
    type: 'keyUp',
    key: 'Tab',
    code: 'Tab',
    windowsVirtualKeyCode: 9
  })
  check('键盘焦点可见', await run.p.eval(() => document.activeElement.matches(':focus-visible')))
  await click('.ant-menu-item', '项目管理')
  await click('.project-card button', '编辑')
  check(
    '编辑正确回填',
    await run.p.eval(() => document.querySelector('#name').value === '本地课程项目')
  )
  await fill('#name', '编辑后的课程项目')
  await click('.ant-modal-footer button', '保存修改')
  await saved()
  check(
    '编辑保留 ID、创建日期和任务',
    disk()[0].id === original.id &&
      disk()[0].createdAt === original.createdAt &&
      disk()[0].tasks[0].completed
  )
  await click('.project-card button', '编辑')
  await fill('#name', '不应保存的名字')
  await click('.ant-modal-footer button', '取消')
  check('取消编辑不修改记录', disk()[0].name === '编辑后的课程项目')
  await click('.project-card button', '编辑')
  await fill('#folderPath', 'D:\\this-folder-does-not-exist-usy-qa')
  await click('.ant-modal-footer button', '保存修改')
  await saved()
  await click('.project-card button', '打开目录')
  check('不存在的目录呈现错误', (await text()).includes('文件夹不存在或不可访问'))
  check(
    '拒绝用目录接口打开源文件',
    !(await run.p.eval((p) => window.api.openFolder(p), resolve('package.json'))).success
  )
  check(
    '拒绝相对路径和链接',
    !(await run.p.eval(() => window.api.openFolder('https://example.com'))).success
  )
  await click('.project-card button', '编辑')
  await fill('#folderPath', profile)
  await click('.ant-modal-footer button', '保存修改')
  await saved()
  check(
    '打开实际测试文件夹成功',
    (await run.p.eval((p) => window.api.openFolder(p), profile)).success
  )
  for (const width of [1440, 900, 768, 390]) {
    await run.p.setViewport({ width, height: width === 900 ? 630 : 844, mobile: false })
    for (const [label, name] of [
      ['工作台首页', 'dashboard'],
      ['项目管理', 'projects'],
      ['任务管理', 'tasks']
    ]) {
      await click('.ant-menu-item', label)
      check(
        `${width}px ${name} 无横向溢出`,
        await run.p.eval(
          () =>
            document.documentElement.scrollWidth <= innerWidth &&
            document.querySelector('.neirongquyu').scrollWidth <=
              document.querySelector('.neirongquyu').clientWidth + 1
        )
      )
      await capture(`${name}-${width}`)
    }
  }
  await run.p.setViewport({ width: 900, height: 630, mobile: false })
  await click('.ant-menu-item', '项目管理')
  await click('.project-card button', '编辑')
  await capture('edit-modal')
  await click('.ant-modal-footer button', '取消')
  await close(run)
  run = null
  run = await launch()
  check(
    '完整退出并重启后读取原生项目及任务',
    disk()[0].name === '编辑后的课程项目' &&
      (await text()).includes('1 个项目') &&
      disk()[0].tasks[0].completed
  )
  await click('.ant-menu-item', '项目管理')
  await click('.project-card button', '删除')
  check('删除确认说明任务数量与磁盘保护', (await text()).includes('不会删除磁盘文件夹'))
  await capture('delete-confirm')
  await click('.ant-popover button', '取消')
  check('取消删除保留数据', disk().length === 1)
  await click('.project-card button', '删除')
  await click('.ant-popover button', '删除项目')
  await saved()
  check(
    '确认删除项目及任务，统计回到零',
    disk().length === 0 && (await text()).includes('0 个项目')
  )
  check('项目删除不影响磁盘目录', readdirSync(profile).length > 0)
  const legacy = [
    {
      ...original,
      name: '旧版本自有项目',
      tasks: [{ id: 'legacy-task', title: '已有任务', completed: false }]
    }
  ]
  await run.p.eval(
    (value) =>
      localStorage.setItem(
        'usy-project-studio:projects',
        JSON.stringify({ version: 1, projects: value })
      ),
    legacy
  )
  await close(run)
  run = null
  unlinkSync(dataFile)
  run = await launch()
  check(
    '首次缺少文件迁移旧 localStorage',
    disk()[0].name === '旧版本自有项目' && (await text()).includes('旧版本自有项目')
  )
  check(
    '迁移保留旧存储原件',
    await run.p.eval(() =>
      localStorage.getItem('usy-project-studio:projects').includes('旧版本自有项目')
    )
  )
  await close(run)
  run = null
  writeFileSync(dataFile, '{损坏原生文件')
  run = await launch()
  check(
    '原生坏文件暂停编辑，未被旧数据覆盖',
    (await text()).includes('编辑已暂停') && readFileSync(dataFile, 'utf8') === '{损坏原生文件'
  )
  check('原生坏文件禁止保存', !(await run.p.eval(() => window.api.saveData([]))).success)
  await capture('corrupt-file')
  await click('button', '备份原始记录并重新开始')
  await click('.ant-popover button', '备份并重新开始')
  await saved()
  const backup = readdirSync(profile).find((n) => n.endsWith('.bak'))
  check(
    '界面恢复先保留原始坏文件备份',
    readFileSync(resolve(profile, backup), 'utf8') === '{损坏原生文件' && disk().length === 0
  )
  await close(run)
  run = null
  writeFileSync(dataFile, '{再次损坏')
  run = await launch()
  check('恢复前保持读取暂停', (await text()).includes('编辑已暂停'))
  const repaired = JSON.stringify({ version: 1, projects: legacy })
  writeFileSync(dataFile, repaired)
  await click('button', '备份原始记录并重新开始')
  await click('.ant-popover button', '备份并重新开始')
  await saved()
  check(
    '外部修复过的文件在恢复前也会备份',
    readdirSync(profile)
      .filter((n) => n.endsWith('.bak'))
      .some((n) => readFileSync(resolve(profile, n), 'utf8') === repaired) && disk().length === 0
  )
  check('无页面运行时错误', run.p.consoleErrors.length === 0)
  writeFileSync(
    `${out}/${process.env.USY_QA_EXECUTABLE ? 'packaged' : 'electron'}-checks.json`,
    JSON.stringify({ profile, results }, null, 2)
  )
  console.log(JSON.stringify({ profile, results }, null, 2))
} finally {
  if (run) await close(run)
}
