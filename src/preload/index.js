import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  selectFolder: () => ipcRenderer.invoke('dialog:selectFolder'),
  openFolder: (path) => ipcRenderer.invoke('shell:openFolder', path),
  loadData: () => ipcRenderer.invoke('data:load'),
  saveData: (projects) => ipcRenderer.invoke('data:save', projects),
  recoverData: () => ipcRenderer.invoke('data:recover')
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI
  window.api = api
}
