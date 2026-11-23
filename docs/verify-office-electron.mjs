// 构建后运行；只操作本脚本启动的 Electron 和专用测试数据目录。
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'
import { Browser, Page, sleep } from './lib/cdp.mjs'

const out = 'docs/evidence/office-ui'
const profile = resolve('out', `qa-office-${Date.now()}`)
mkdirSync(profile, { recursive: true })
const results = []
async function launch() {
  const env = { ...process.env }
  delete env.ELECTRON_RUN_AS_NODE
  delete env.ELECTRON_RENDERER_URL
  const proc = spawn(
    resolve('node_modules/electron/dist/electron.exe'),
    ['.', '--remote-debugging-port=0', `--user-data-dir=${profile}`],
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
try {
  run = await launch()
  assert.ok(await run.p.eval(() => Boolean(window.electron)), 'Electron preload 已加载')
  results.push('构建后的本地文件与 Electron preload 加载通过')
  await run.p.screenshot({ path: `${out}/electron-dashboard.png`, format: 'png' })
  await run.p.eval(() =>
    [...document.querySelectorAll('.ant-menu-item')]
      .find((e) => e.textContent.includes('任务管理'))
      .click()
  )
  await sleep(100)
  const pt = await run.p.eval(() => {
    const checkbox = document.querySelector('.task-row:nth-child(3) input')
    checkbox.scrollIntoView({ block: 'center' })
    window.__progressMoved = false
    document.querySelector('.progress-fill').addEventListener(
      'transitionrun',
      () => {
        window.__progressMoved = true
      },
      { once: true }
    )
    const r = checkbox.getBoundingClientRect()
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
  })
  await run.p.send('Input.dispatchMouseEvent', {
    type: 'mousePressed',
    button: 'left',
    clickCount: 1,
    ...pt
  })
  await run.p.send('Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    button: 'left',
    clickCount: 1,
    ...pt
  })
  await sleep(60)
  assert.ok(await run.p.eval(() => window.__progressMoved), '鼠标勾选触发进度动效')
  results.push('Electron 鼠标勾选触发进度 transform 动效')
  await sleep(240)
  assert.equal(
    await run.p.eval(() => document.querySelector('.task-summary .progress-value').textContent),
    '75%'
  )
  await run.p.screenshot({ path: `${out}/electron-tasks.png`, format: 'png' })
  results.push('Electron 完成任务后进度为 75%')
  await close(run)
  run = null
  run = await launch()
  assert.ok(
    await run.p.eval(() =>
      document.querySelector('.save-state').textContent.includes('已读取本机数据')
    )
  )
  assert.ok(
    await run.p.eval(() =>
      document.querySelector('.dashboard-progress').textContent.includes('75%')
    )
  )
  results.push('完整关闭并重启 Electron 后保留任务和进度')
  await run.p.screenshot({ path: `${out}/electron-restarted.png`, format: 'png' })
  assert.equal(run.p.consoleErrors.length, 0)
  writeFileSync(`${out}/electron-checks.json`, JSON.stringify({ profile, results }, null, 2))
  console.log(JSON.stringify({ results }, null, 2))
} finally {
  if (run) await close(run)
}
