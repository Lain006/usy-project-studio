// 使用 design-taste-frontend 自带的 CDP 驱动；所有操作都在临时浏览器配置中执行。
import { Browser, sleep } from './lib/cdp.mjs'
import { mkdirSync, writeFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const out = 'docs/evidence/office-ui'
mkdirSync(out, { recursive: true })
const browser = await Browser.launch()
const results = []
const page = await browser.newPage()
const url = 'http://127.0.0.1:5180'
const key = 'usy-project-studio:projects'
const check = (name, result) => {
  assert.ok(result, name)
  results.push(name)
}
const read = (selector) => page.eval((s) => document.querySelector(s)?.textContent, selector)
async function click(selector, text) {
  const point = await page.eval(
    ({ selector, text }) => {
      const el = [...document.querySelectorAll(selector)].find(
        (e) => !text || e.textContent.replace(/\s/g, '').includes(text.replace(/\s/g, ''))
      )
      if (!el) throw new Error('找不到控件: ' + selector + ' ' + text)
      el.scrollIntoView({ block: 'nearest' })
      const r = el.getBoundingClientRect()
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
    },
    { selector, text }
  )
  await page.send('Input.dispatchMouseEvent', {
    type: 'mousePressed',
    button: 'left',
    clickCount: 1,
    ...point
  })
  await page.send('Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    button: 'left',
    clickCount: 1,
    ...point
  })
  await sleep(100)
}
async function input(selector, value) {
  await click(selector)
  await page.send('Input.insertText', { text: value })
}
async function press(key, code = key) {
  await page.send('Input.dispatchKeyEvent', {
    type: 'keyDown',
    key,
    code,
    windowsVirtualKeyCode: key === 'Enter' ? 13 : key === 'Tab' ? 9 : 27
  })
  await page.send('Input.dispatchKeyEvent', {
    type: 'keyUp',
    key,
    code,
    windowsVirtualKeyCode: key === 'Enter' ? 13 : key === 'Tab' ? 9 : 27
  })
  await sleep(100)
}
async function capture(name) {
  await sleep(280)
  await page.screenshot({ path: `${out}/${name}.png`, format: 'png' })
}
async function seed(value) {
  await page.eval(({ key, value }) => localStorage.setItem(key, value), { key, value })
  await page.goto(url)
}
try {
  await page.goto(url)
  check('首次打开显示示例数据状态', (await read('.save-state')).includes('示例数据'))
  for (const width of [1440, 900, 768, 390]) {
    await page.setViewport({ width, height: width === 900 ? 630 : 900, mobile: width === 390 })
    for (const [nav, name] of [
      ['工作台首页', 'dashboard'],
      ['项目管理', 'projects'],
      ['任务管理', 'tasks']
    ]) {
      await click('.ant-menu-item', nav)
      check(
        `${width}px ${name} 无横向溢出`,
        await page.eval(() => {
          const el = document.querySelector('.neirongquyu')
          return (
            document.documentElement.scrollWidth <= innerWidth &&
            el.scrollWidth <= el.clientWidth + 1 &&
            el.clientWidth > innerWidth / 2
          )
        })
      )
      check(
        `${width}px ${name} 标题可见`,
        await page.eval(() => {
          const r = document.querySelector('h1').getBoundingClientRect()
          return r.width > 80 && r.height < 70 && r.bottom < innerHeight && r.top > 0
        })
      )
      await capture(`${name}-${width}`)
      const scrollable = await page.eval(() => {
        const el = document.querySelector('.neirongquyu')
        if (el.scrollHeight > el.clientHeight + 10) {
          el.scrollTop = el.scrollHeight
          return true
        }
        return false
      })
      if (scrollable) await capture(`${name}-${width}-bottom`)
      await page.eval(() => {
        document.querySelector('.neirongquyu').scrollTop = 0
      })
    }
  }
  await page.setViewport({ width: 1440, height: 900 })
  await click('.task-row:nth-child(3) input')
  check('勾选任务后进度为75%', (await read('.task-summary .progress-value')) === '75%')
  check('保存成功显示真实状态', (await read('.save-state')).includes('已保存至本机'))
  check('状态栏同步待办数', (await read('.status-counts')).includes('1 项待办'))
  await capture('task-completed')
  await click('.task-entry button')
  check('空白输入校验', (await read('#task-input-error')).includes('1–300'))
  await input('.task-entry input', '办公界面验证任务')
  await press('Enter')
  check('回车新增任务', await page.eval(() => document.querySelectorAll('.task-row').length === 5))
  check(
    '键盘输入时禁用动效',
    await page.eval(
      () => getComputedStyle(document.querySelector('.progress-fill')).transitionDuration === '0s'
    )
  )
  await click('.task-row:last-child button')
  await capture('delete-confirm')
  await click('.ant-popconfirm button', '删除')
  check('确认删除任务', await page.eval(() => document.querySelectorAll('.task-row').length === 4))
  await click('.ant-select')
  await click('.ant-select-item-option', '智能合约开发项目')
  check('项目切换与空状态', (await read('.ant-empty-description')).includes('还没有任何任务'))
  await capture('empty-tasks')
  await click('.ant-menu-item', '工作台首页')
  await click('button', '新建项目')
  await capture('project-modal')
  await click('.ant-modal button', '创建')
  check(
    '项目表单必填校验',
    await page.eval(() => document.querySelectorAll('.ant-form-item-explain-error').length === 3)
  )
  await input('#name', '界面验证项目')
  await input('#course', '办公界面课程')
  await input('#description', '只存在于隔离浏览器的验证数据')
  await click('.ant-modal button', '创建')
  check('新建项目后统计更新', (await read('.status-counts')).includes('3 个项目'))
  await page.goto(url)
  check('重载后读取保存数据', (await read('.save-state')).includes('已读取本机数据'))
  check('重载保留新增项目', (await read('.dashboard')).includes('界面验证项目'))
  await page.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }]
  })
  await click('.ant-menu-item', '任务管理')
  check(
    '减少动态效果关闭进度位移',
    await page.eval(
      () => getComputedStyle(document.querySelector('.progress-fill')).transitionDuration === '0s'
    )
  )
  await capture('reduced-motion')
  await page.send('Emulation.setEmulatedMedia', { features: [] })
  await press('Tab')
  check('键盘焦点可见', await page.eval(() => document.activeElement.matches(':focus-visible')))
  const savedData = await page.eval((key) => localStorage.getItem(key), key)
  await page.eval(() => {
    window.Storage.prototype.setItem = function () {
      throw new Error('模拟保存失败')
    }
  })
  await click('.ant-menu-item', '工作台首页')
  await click('.dashboard-pending input')
  check('保存失败不误报成功', (await read('.save-state')).includes('尚未保存'))
  await capture('save-failure')
  await page.goto(url)
  await seed('{broken')
  check(
    '损坏记录禁用编辑',
    await page.eval(() => document.querySelector('.dashboard .dashboard-actions button').disabled)
  )
  check('损坏记录状态可见', (await read('.save-state')).includes('读取受阻'))
  check('损坏记录未覆盖', await page.eval((key) => localStorage.getItem(key) === '{broken', key))
  await capture('corrupt-storage')
  await seed(JSON.stringify({ version: 1, projects: [] }))
  check('零项目状态', (await read('.status-counts')).includes('0 个项目'))
  await capture('empty-workspace')
  const longData = JSON.parse(savedData)
  longData.projects[0].name = '区块链工程项目与课程联合实践的长名称边界检查'.repeat(4)
  longData.projects[0].course = '课程名称'.repeat(15)
  longData.projects[0].tasks = [
    { id: 'long', title: '长任务内容与接口联调'.repeat(25), completed: false }
  ]
  await seed(JSON.stringify(longData))
  await page.setViewport({ width: 390, height: 844, mobile: true })
  for (const nav of ['项目管理', '任务管理']) {
    await click('.ant-menu-item', nav)
    check(
      `长文本 ${nav} 无横向溢出`,
      await page.eval(() => {
        const el = document.querySelector('.neirongquyu')
        return el.scrollWidth <= el.clientWidth + 1
      })
    )
    await capture(nav === '项目管理' ? 'long-project' : 'long-task')
  }
  check('无页面运行异常', page.consoleErrors.length === 0)
  writeFileSync(
    `${out}/checks.json`,
    JSON.stringify({ passed: results.length, results, errors: page.consoleErrors }, null, 2)
  )
  console.log(JSON.stringify({ passed: results.length, results }, null, 2))
} finally {
  await browser.close()
}
