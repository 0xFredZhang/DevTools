const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  
  // File operations
  file: {
    // Open file dialog and select file
    select: (options) => ipcRenderer.invoke('file:select', options),
    
    // Save file dialog
    saveAs: (options) => ipcRenderer.invoke('file:save-as', options),
    
    // Read file content
    read: (filePath) => ipcRenderer.invoke('file:read', filePath),
    
    // Write file content  
    write: (filePath, data) => ipcRenderer.invoke('file:write', filePath, data),
    
    // Get file statistics
    stat: (filePath) => ipcRenderer.invoke('file:stat', filePath),
    
    // Check if file exists
    exists: (filePath) => ipcRenderer.invoke('file:exists', filePath)
  },
  
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