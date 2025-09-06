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
  }
})