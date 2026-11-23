import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join, isAbsolute } from 'path'
import { promises as fs } from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/usy-icon.png?asset'
import { createProjectStore } from './project-store.mjs'

let projectStore
function registerProjectIpc() {
  projectStore = createProjectStore(join(app.getPath('userData'), 'usy-data.json'))
  const handle = (channel, action) =>
    ipcMain.handle(channel, (event, ...args) => {
      const window = BrowserWindow.fromWebContents(event.sender)
      if (!window || event.senderFrame !== event.sender.mainFrame) {
        throw new Error('不允许的调用来源')
      }
      return action(window, ...args)
    })
  handle('data:load', () => projectStore.load())
  handle('data:save', (_, projects) => projectStore.save(projects))
  handle('data:recover', () => projectStore.recover())
  handle('dialog:selectFolder', async (window) => {
    try {
      const result = await dialog.showOpenDialog(window, {
        title: '选择本地项目文件夹',
        properties: ['openDirectory', 'createDirectory']
      })
      return { success: true, path: result.canceled ? '' : result.filePaths[0] || '' }
    } catch {
      return { success: false, message: '无法打开文件夹选择窗口，请重试。' }
    }
  })
  handle('shell:openFolder', async (_, path) => {
    if (typeof path !== 'string' || !isAbsolute(path) || path.includes('\0')) {
      return { success: false, message: '请先关联有效的本地项目文件夹。' }
    }
    try {
      if (!(await fs.stat(path)).isDirectory()) throw new Error('directory')
      const error = await shell.openPath(path)
      return error
        ? { success: false, message: '打开目录失败，请检查文件夹是否可访问。' }
        : { success: true }
    } catch {
      return { success: false, message: '文件夹不存在或不可访问，请编辑项目重新关联。' }
    }
  })
}

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    title: 'USY Studio · 项目与任务工作台',
    show: false,
    autoHideMenuBar: true,
    icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })
  let closing = false
  mainWindow.on('close', (event) => {
    if (closing) return
    event.preventDefault()
    projectStore.idle().then(() => {
      closing = true
      mainWindow.close()
    })
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    if (/^https?:\/\//i.test(details.url)) shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.usy.projectstudio')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  registerProjectIpc()

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
