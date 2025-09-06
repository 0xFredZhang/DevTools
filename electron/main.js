const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs').promises

let mainWindow

const isDev = process.argv.includes('--dev')

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    resizable: true,
    movable: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    titleBarStyle: 'default',
    vibrancy: 'under-window',
    visualEffectState: 'active'
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function createMenu() {
  const template = [
    {
      label: 'DevTools',
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

/**
 * Setup IPC handlers for file operations
 */
function setupFileHandlers() {
  // File operations handlers
  ipcMain.handle('file:select', async (event, options = {}) => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: options.filters || [
        { name: 'All Files', extensions: ['*'] }
      ]
    });
    return result;
  });

  ipcMain.handle('file:save-as', async (event, options = {}) => {
    const result = await dialog.showSaveDialog(mainWindow, {
      filters: options.filters || [
        { name: 'All Files', extensions: ['*'] }
      ],
      defaultPath: options.defaultPath
    });
    return result;
  });

  ipcMain.handle('file:read', async (event, filePath) => {
    try {
      const data = await fs.readFile(filePath);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('file:write', async (event, filePath, data) => {
    try {
      await fs.writeFile(filePath, data);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('file:stat', async (event, filePath) => {
    try {
      const stats = await fs.stat(filePath);
      return { 
        success: true, 
        stats: {
          size: stats.size,
          isFile: stats.isFile(),
          isDirectory: stats.isDirectory(),
          mtime: stats.mtime,
          ctime: stats.ctime
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('file:exists', async (event, filePath) => {
    try {
      await fs.access(filePath);
      return { success: true, exists: true };
    } catch (error) {
      return { success: true, exists: false };
    }
  });

  // Dialog handlers
  ipcMain.handle('dialog:openFile', async (event, options = {}) => {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: options.title || 'Select File',
      defaultPath: options.defaultPath,
      buttonLabel: options.buttonLabel || 'Select',
      filters: options.filters || [
        { name: 'Archive Files', extensions: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile']
    })
    
    if (!canceled && filePaths.length > 0) {
      return { success: true, filePath: filePaths[0] }
    }
    
    return { success: false, filePath: null }
  })

  // Handle multiple file selection dialog
  ipcMain.handle('dialog:openFiles', async (event, options = {}) => {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: options.title || 'Select Files',
      defaultPath: options.defaultPath,
      buttonLabel: options.buttonLabel || 'Select',
      filters: options.filters || [
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile', 'multiSelections']
    })
    
    if (!canceled && filePaths.length > 0) {
      return { success: true, filePaths }
    }
    
    return { success: false, filePaths: [] }
  })

  // Handle directory selection dialog
  ipcMain.handle('dialog:openDirectory', async (event, options = {}) => {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: options.title || 'Select Directory',
      defaultPath: options.defaultPath,
      buttonLabel: options.buttonLabel || 'Select',
      properties: ['openDirectory']
    })
    
    if (!canceled && filePaths.length > 0) {
      return { success: true, dirPath: filePaths[0] }
    }
    
    return { success: false, dirPath: null }
  })

  // Handle save file dialog
  ipcMain.handle('dialog:saveFile', async (event, options = {}) => {
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: options.title || 'Save File',
      defaultPath: options.defaultPath,
      buttonLabel: options.buttonLabel || 'Save',
      filters: options.filters || [
        { name: 'Archive Files', extensions: ['zip', '7z', 'tar', 'gz'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })
    
    if (!canceled && filePath) {
      return { success: true, filePath }
    }
    
    return { success: false, filePath: null }
  })

  // Handle message box for confirmations
  ipcMain.handle('dialog:showMessageBox', async (event, options) => {
    const result = await dialog.showMessageBox(mainWindow, {
      type: options.type || 'info',
      title: options.title || 'DevTools',
      message: options.message || '',
      detail: options.detail,
      buttons: options.buttons || ['OK'],
      defaultId: options.defaultId || 0,
      cancelId: options.cancelId
    })
    
    return result
  })

  // Handle error dialog
  ipcMain.handle('dialog:showErrorBox', async (event, title, content) => {
    dialog.showErrorBox(title || 'Error', content || 'An error occurred')
    return { success: true }
  })
}

app.whenReady().then(() => {
  createWindow()
  createMenu()
  setupFileHandlers()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})