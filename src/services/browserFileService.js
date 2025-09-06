/**
 * Browser File Service
 * 
 * Browser-compatible wrapper for the file service that uses Electron dialog APIs
 * instead of direct Node.js file system access.
 */

import { fileService } from './fileService.js'

/**
 * Browser File Service class that integrates Electron dialogs
 */
export class BrowserFileService {
  constructor() {
    this.fileService = fileService
  }
  
  /**
   * Check if running in Electron environment
   * @returns {boolean} True if Electron is available
   */
  isElectronAvailable() {
    return typeof window !== 'undefined' && window.electronAPI && window.electronAPI.dialog
  }
  
  /**
   * Show file selection dialog and validate selected file
   * @param {Object} options - Dialog options
   * @returns {Promise<Object>} Selected and validated file info
   */
  async selectFile(options = {}) {
    if (!this.isElectronAvailable()) {
      throw new Error('File selection requires Electron environment')
    }
    
    try {
      const result = await window.electronAPI.dialog.openFile(options)
      
      if (!result.success || !result.filePath) {
        return { success: false, cancelled: true }
      }
      
      // Validate the selected file using our file service
      const fileInfo = await this.fileService.selectFile(result.filePath)
      
      return {
        success: true,
        cancelled: false,
        ...fileInfo
      }
    } catch (error) {
      await this.showError('File Selection Error', error.message)
      return { success: false, error: error.message }
    }
  }
  
  /**
   * Show multiple file selection dialog and validate selected files
   * @param {Object} options - Dialog options
   * @returns {Promise<Object>} Selected and validated files info
   */
  async selectFiles(options = {}) {
    if (!this.isElectronAvailable()) {
      throw new Error('File selection requires Electron environment')
    }
    
    try {
      const result = await window.electronAPI.dialog.openFiles(options)
      
      if (!result.success || !result.filePaths.length) {
        return { success: false, cancelled: true, files: [] }
      }
      
      // Validate all selected files
      const validatedFiles = []
      const errors = []
      
      for (const filePath of result.filePaths) {
        try {
          const fileInfo = await this.fileService.selectFile(filePath)
          validatedFiles.push(fileInfo)
        } catch (error) {
          errors.push({ path: filePath, error: error.message })
        }
      }
      
      return {
        success: validatedFiles.length > 0,
        cancelled: false,
        files: validatedFiles,
        errors: errors
      }
    } catch (error) {
      await this.showError('File Selection Error', error.message)
      return { success: false, error: error.message, files: [] }
    }
  }
  
  /**
   * Show directory selection dialog and validate selected directory
   * @param {Object} options - Dialog options
   * @returns {Promise<Object>} Selected and validated directory info
   */
  async selectDirectory(options = {}) {
    if (!this.isElectronAvailable()) {
      throw new Error('Directory selection requires Electron environment')
    }
    
    try {
      const result = await window.electronAPI.dialog.openDirectory(options)
      
      if (!result.success || !result.dirPath) {
        return { success: false, cancelled: true }
      }
      
      // Validate the selected directory using our file service
      const dirInfo = await this.fileService.selectDirectory(result.dirPath)
      
      return {
        success: true,
        cancelled: false,
        ...dirInfo
      }
    } catch (error) {
      await this.showError('Directory Selection Error', error.message)
      return { success: false, error: error.message }
    }
  }
  
  /**
   * Show save file dialog
   * @param {Object} options - Dialog options
   * @returns {Promise<Object>} Save file result
   */
  async selectSaveLocation(options = {}) {
    if (!this.isElectronAvailable()) {
      throw new Error('Save dialog requires Electron environment')
    }
    
    try {
      const result = await window.electronAPI.dialog.saveFile(options)
      
      if (!result.success || !result.filePath) {
        return { success: false, cancelled: true }
      }
      
      // Normalize the path
      const normalizedPath = this.fileService.normalizePath(result.filePath)
      
      return {
        success: true,
        cancelled: false,
        path: normalizedPath
      }
    } catch (error) {
      await this.showError('Save Dialog Error', error.message)
      return { success: false, error: error.message }
    }
  }
  
  /**
   * Show confirmation dialog
   * @param {string} title - Dialog title
   * @param {string} message - Dialog message
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} User response
   */
  async showConfirmation(title, message, options = {}) {
    if (!this.isElectronAvailable()) {
      // Fallback to browser confirm
      const confirmed = confirm(`${title}\n\n${message}`)
      return { response: confirmed ? 0 : 1, checkboxChecked: false }
    }
    
    const dialogOptions = {
      type: 'question',
      title,
      message,
      buttons: options.buttons || ['Yes', 'No'],
      defaultId: options.defaultId || 0,
      cancelId: options.cancelId || 1,
      ...options
    }
    
    return await window.electronAPI.dialog.showMessageBox(dialogOptions)
  }
  
  /**
   * Show information dialog
   * @param {string} title - Dialog title
   * @param {string} message - Dialog message
   * @param {string} detail - Optional detail text
   * @returns {Promise<Object>} Dialog result
   */
  async showInfo(title, message, detail = '') {
    if (!this.isElectronAvailable()) {
      alert(`${title}\n\n${message}${detail ? '\n\n' + detail : ''}`)
      return { response: 0 }
    }
    
    return await window.electronAPI.dialog.showMessageBox({
      type: 'info',
      title,
      message,
      detail,
      buttons: ['OK']
    })
  }
  
  /**
   * Show warning dialog
   * @param {string} title - Dialog title
   * @param {string} message - Dialog message
   * @param {string} detail - Optional detail text
   * @returns {Promise<Object>} Dialog result
   */
  async showWarning(title, message, detail = '') {
    if (!this.isElectronAvailable()) {
      alert(`Warning: ${title}\n\n${message}${detail ? '\n\n' + detail : ''}`)
      return { response: 0 }
    }
    
    return await window.electronAPI.dialog.showMessageBox({
      type: 'warning',
      title,
      message,
      detail,
      buttons: ['OK']
    })
  }
  
  /**
   * Show error dialog
   * @param {string} title - Dialog title
   * @param {string} message - Error message
   * @returns {Promise<Object>} Dialog result
   */
  async showError(title, message) {
    if (!this.isElectronAvailable()) {
      alert(`Error: ${title}\n\n${message}`)
      return { response: 0 }
    }
    
    return await window.electronAPI.dialog.showErrorBox(title, message)
  }
  
  /**
   * Create temporary file (delegates to file service)
   * @param {string} extension - File extension
   * @returns {Promise<string>} Temporary file path
   */
  async createTempFile(extension = '') {
    return await this.fileService.createTempFile(extension)
  }
  
  /**
   * Create temporary directory (delegates to file service)
   * @returns {Promise<string>} Temporary directory path
   */
  async createTempDirectory() {
    return await this.fileService.createTempDirectory()
  }
  
  /**
   * Update temporary file access time (delegates to file service)
   * @param {string} tempPath - Temporary file path
   */
  updateTempAccess(tempPath) {
    this.fileService.updateTempAccess(tempPath)
  }
  
  /**
   * Clean up temporary file (delegates to file service)
   * @param {string} tempPath - Path to clean up
   */
  async cleanupTemp(tempPath) {
    await this.fileService.cleanupTemp(tempPath)
  }
  
  /**
   * Check if path is safe (delegates to file service)
   * @param {string} filePath - Path to check
   * @param {string} basePath - Base directory
   * @returns {boolean} True if path is safe
   */
  isPathSafe(filePath, basePath) {
    return this.fileService.isPathSafe(filePath, basePath)
  }
  
  /**
   * Get normalized path (delegates to file service)
   * @param {string} filePath - Path to normalize
   * @returns {string} Normalized path
   */
  normalizePath(filePath) {
    return this.fileService.normalizePath(filePath)
  }
  
  /**
   * Get file information (delegates to file service)
   * @param {string} filePath - File path
   * @returns {Promise<Object>} File information
   */
  async getFileInfo(filePath) {
    return await this.fileService.getFileInfo(filePath)
  }
  
  /**
   * Check if file exists (delegates to file service)
   * @param {string} filePath - Path to check
   * @returns {Promise<boolean>} True if exists
   */
  async exists(filePath) {
    return await this.fileService.exists(filePath)
  }
  
  /**
   * Get temporary files info (delegates to file service)
   * @returns {Array} Array of temporary file info
   */
  getTempFilesInfo() {
    return this.fileService.getTempFilesInfo()
  }
  
  /**
   * Clean up all resources (delegates to file service)
   */
  async cleanup() {
    await this.fileService.cleanup()
  }
}

// Create singleton instance
export const browserFileService = new BrowserFileService()

// Export for convenience
export default browserFileService