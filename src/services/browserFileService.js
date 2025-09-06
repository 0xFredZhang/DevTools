/**
 * Browser-compatible File Service
 * 
 * Provides file handling functionality for browser environment:
 * - File validation and safety checks
 * - File type detection
 * - Temporary file management (in-memory)
 * - File size formatting
 */

/**
 * File service configuration
 */
export const FILE_CONFIG = {
  // Maximum file size (2GB)
  MAX_FILE_SIZE: 2 * 1024 * 1024 * 1024,
  
  // Temporary file cleanup interval (5 minutes)
  CLEANUP_INTERVAL: 5 * 60 * 1000,
  
  // Temporary file max age (30 minutes)
  TEMP_FILE_MAX_AGE: 30 * 60 * 1000,
  
  // Supported archive extensions
  ARCHIVE_EXTENSIONS: ['.zip', '.tar', '.gz', '.7z', '.rar', '.bz2', '.xz'],
  
  // Dangerous file extensions
  DANGEROUS_EXTENSIONS: ['.exe', '.dll', '.sys', '.bat', '.cmd', '.com', '.scr', '.vbs', '.js', '.jar'],
  
  // Text file extensions
  TEXT_EXTENSIONS: ['.txt', '.md', '.json', '.xml', '.csv', '.log', '.yml', '.yaml', '.ini', '.cfg']
}

/**
 * Browser-compatible Temporary File Manager
 */
class BrowserTempFileManager {
  constructor() {
    this.tempFiles = new Map()
    this.cleanupInterval = null
    this.fileCounter = 0
    this.startCleanupTimer()
  }
  
  /**
   * Create a temporary file reference
   * @param {string} extension - Optional file extension
   * @returns {string} Temporary file identifier
   */
  createTempFile(extension = '') {
    const id = `temp_${Date.now()}_${this.fileCounter++}${extension}`
    
    this.tempFiles.set(id, {
      created: Date.now(),
      size: 0,
      extension
    })
    
    return id
  }
  
  /**
   * Create a temporary directory reference
   * @returns {string} Temporary directory identifier
   */
  createTempDirectory() {
    const id = `tempdir_${Date.now()}_${this.fileCounter++}`
    
    this.tempFiles.set(id, {
      created: Date.now(),
      isDirectory: true
    })
    
    return id
  }
  
  /**
   * Clean up a temporary file
   * @param {string} id - Temporary file identifier
   */
  async cleanup(id) {
    if (this.tempFiles.has(id)) {
      this.tempFiles.delete(id)
      return true
    }
    return false
  }
  
  /**
   * Clean up old temporary files
   */
  async cleanupOld() {
    const now = Date.now()
    const maxAge = FILE_CONFIG.TEMP_FILE_MAX_AGE
    
    for (const [id, info] of this.tempFiles.entries()) {
      if (now - info.created > maxAge) {
        this.tempFiles.delete(id)
      }
    }
  }
  
  /**
   * Start automatic cleanup timer
   */
  startCleanupTimer() {
    if (this.cleanupInterval) return
    
    this.cleanupInterval = setInterval(async () => {
      await this.cleanupOld()
    }, FILE_CONFIG.CLEANUP_INTERVAL)
  }
  
  /**
   * Stop cleanup timer
   */
  stopCleanupTimer() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
  }
  
  /**
   * Get temporary files info
   * @returns {Array} Array of temp file info
   */
  getTempFilesInfo() {
    return Array.from(this.tempFiles.entries()).map(([id, info]) => ({
      id,
      ...info
    }))
  }
}

/**
 * Browser-compatible File Service
 */
export class BrowserFileService {
  constructor() {
    this.tempManager = new BrowserTempFileManager()
  }
  
  /**
   * Get file information from File object
   * @param {File} file - File object
   * @returns {Object} File information
   */
  async getFileInfo(file) {
    if (!(file instanceof File || file instanceof Blob)) {
      throw new Error('Invalid file object')
    }
    
    return {
      name: file.name || 'unnamed',
      size: file.size,
      type: file.type || this.getMimeType(file.name),
      lastModified: file.lastModified ? new Date(file.lastModified) : new Date(),
      extension: this.getExtension(file.name)
    }
  }
  
  /**
   * Check if path is safe (no directory traversal)
   * @param {string} filePath - File path to check
   * @param {string} basePath - Base path for comparison
   * @returns {boolean} True if path is safe
   */
  isPathSafe(filePath, basePath = '') {
    // Remove any directory traversal attempts
    const cleaned = filePath.replace(/\.\./g, '').replace(/\/\//g, '/')
    
    // Check if path contains suspicious patterns
    const suspicious = [
      '../',
      '..\\',
      '..',
      '~/',
      '~\\',
      '/etc/',
      'C:\\Windows',
      'C:\\Program Files'
    ]
    
    return !suspicious.some(pattern => cleaned.includes(pattern))
  }
  
  /**
   * Get file extension
   * @param {string} filename - File name
   * @returns {string} File extension with dot
   */
  getExtension(filename) {
    if (!filename) return ''
    const lastDot = filename.lastIndexOf('.')
    return lastDot > 0 ? filename.substring(lastDot).toLowerCase() : ''
  }
  
  /**
   * Get MIME type from filename
   * @param {string} filename - File name
   * @returns {string} MIME type
   */
  getMimeType(filename) {
    const ext = this.getExtension(filename).substring(1)
    
    const mimeTypes = {
      // Text
      'txt': 'text/plain',
      'html': 'text/html',
      'css': 'text/css',
      'js': 'application/javascript',
      'json': 'application/json',
      'xml': 'application/xml',
      
      // Images
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'svg': 'image/svg+xml',
      'webp': 'image/webp',
      
      // Documents
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'ppt': 'application/vnd.ms-powerpoint',
      'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      
      // Archives
      'zip': 'application/zip',
      'rar': 'application/x-rar-compressed',
      '7z': 'application/x-7z-compressed',
      'tar': 'application/x-tar',
      'gz': 'application/gzip',
      
      // Audio
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'ogg': 'audio/ogg',
      
      // Video
      'mp4': 'video/mp4',
      'avi': 'video/x-msvideo',
      'mov': 'video/quicktime',
      'webm': 'video/webm'
    }
    
    return mimeTypes[ext] || 'application/octet-stream'
  }
  
  /**
   * Check if file is an archive
   * @param {File|string} fileOrName - File object or filename
   * @returns {boolean} True if file is an archive
   */
  isArchive(fileOrName) {
    const filename = typeof fileOrName === 'string' ? fileOrName : fileOrName.name
    const ext = this.getExtension(filename)
    return FILE_CONFIG.ARCHIVE_EXTENSIONS.includes(ext)
  }
  
  /**
   * Check if file is potentially dangerous
   * @param {string} filename - File name
   * @returns {boolean} True if file might be dangerous
   */
  isDangerous(filename) {
    const ext = this.getExtension(filename)
    return FILE_CONFIG.DANGEROUS_EXTENSIONS.includes(ext)
  }
  
  /**
   * Check if file is a text file
   * @param {string} filename - File name
   * @returns {boolean} True if file is a text file
   */
  isTextFile(filename) {
    const ext = this.getExtension(filename)
    return FILE_CONFIG.TEXT_EXTENSIONS.includes(ext)
  }
  
  /**
   * Format file size for display
   * @param {number} bytes - Size in bytes
   * @param {number} decimals - Number of decimal places
   * @returns {string} Formatted size string
   */
  formatSize(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes'
    
    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
  }
  
  /**
   * Validate file size
   * @param {number} size - File size in bytes
   * @returns {boolean} True if size is valid
   */
  isValidSize(size) {
    return size > 0 && size <= FILE_CONFIG.MAX_FILE_SIZE
  }
  
  /**
   * Read file as text
   * @param {File} file - File to read
   * @returns {Promise<string>} File content as text
   */
  async readAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsText(file)
    })
  }
  
  /**
   * Read file as ArrayBuffer
   * @param {File} file - File to read
   * @returns {Promise<ArrayBuffer>} File content as ArrayBuffer
   */
  async readAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsArrayBuffer(file)
    })
  }
  
  /**
   * Read file as Data URL
   * @param {File} file - File to read
   * @returns {Promise<string>} File content as Data URL
   */
  async readAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsDataURL(file)
    })
  }
  
  /**
   * Create temporary file
   * @param {string} extension - Optional file extension
   * @returns {Promise<string>} Temporary file identifier
   */
  async createTempFile(extension = '') {
    return this.tempManager.createTempFile(extension)
  }
  
  /**
   * Create temporary directory
   * @returns {Promise<string>} Temporary directory identifier
   */
  async createTempDirectory() {
    return this.tempManager.createTempDirectory()
  }
  
  /**
   * Clean up temporary file
   * @param {string} id - Temporary file identifier
   * @returns {Promise<boolean>} True if cleanup successful
   */
  async cleanupTemp(id) {
    return this.tempManager.cleanup(id)
  }
  
  /**
   * Get temporary files info
   * @returns {Array} Array of temporary file info
   */
  getTempFilesInfo() {
    return this.tempManager.getTempFilesInfo()
  }
  
  /**
   * Download a blob as a file
   * @param {Blob} blob - Blob to download
   * @param {string} filename - Filename for download
   */
  downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }
  
  /**
   * Create a blob from text
   * @param {string} text - Text content
   * @param {string} type - MIME type
   * @returns {Blob} Created blob
   */
  createBlob(text, type = 'text/plain') {
    return new Blob([text], { type })
  }
}

// Create and export singleton instance
export const fileService = new BrowserFileService()