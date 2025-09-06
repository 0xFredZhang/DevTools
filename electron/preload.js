const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  
  // File dialog APIs
  dialog: {
    openFile: (options) => ipcRenderer.invoke('dialog:openFile', options),
    openFiles: (options) => ipcRenderer.invoke('dialog:openFiles', options),
    openDirectory: (options) => ipcRenderer.invoke('dialog:openDirectory', options),
    saveFile: (options) => ipcRenderer.invoke('dialog:saveFile', options),
    showMessageBox: (options) => ipcRenderer.invoke('dialog:showMessageBox', options),
    showErrorBox: (title, content) => ipcRenderer.invoke('dialog:showErrorBox', title, content)
  }
})