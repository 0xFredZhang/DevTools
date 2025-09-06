/**
 * Browser-compatible ZIP Compression Service
 * 
 * Provides comprehensive ZIP compression and decompression functionality with:
 * - Configurable compression levels (fast, normal, maximum)
 * - File handling for browser environment
 * - Progress callback system for UI updates
 * - Directory structure preservation
 * - Comprehensive error handling with specific error codes
 */

import JSZip from 'jszip'
import CryptoJS from 'crypto-js'

/**
 * Compression configuration constants
 */
export const COMPRESSION_CONFIG = {
  // Compression levels mapping
  LEVELS: {
    fast: { level: 1 },     // Fastest compression, larger size
    normal: { level: 6 },   // Balanced compression
    maximum: { level: 9 }   // Maximum compression, slower
  },
  
  // Maximum file size (2GB limit)
  MAX_FILE_SIZE: 2 * 1024 * 1024 * 1024,
  
  // Chunk size for streaming operations (1MB)
  CHUNK_SIZE: 1024 * 1024,
  
  // Progress update interval (100ms)
  PROGRESS_INTERVAL: 100,
  
  // Error codes
  ERRORS: {
    INVALID_INPUT: 'INVALID_INPUT',
    FILE_TOO_LARGE: 'FILE_TOO_LARGE',
    PERMISSION_DENIED: 'PERMISSION_DENIED',
    INSUFFICIENT_SPACE: 'INSUFFICIENT_SPACE',
    CORRUPTED_ARCHIVE: 'CORRUPTED_ARCHIVE',
    WRONG_PASSWORD: 'WRONG_PASSWORD',
    UNSUPPORTED_FORMAT: 'UNSUPPORTED_FORMAT',
    OPERATION_CANCELLED: 'OPERATION_CANCELLED',
    UNKNOWN_ERROR: 'UNKNOWN_ERROR'
  }
}

/**
 * Custom compression error class
 */
export class CompressionError extends Error {
  constructor(message, code = COMPRESSION_CONFIG.ERRORS.UNKNOWN_ERROR, details = null) {
    super(message)
    this.name = 'CompressionError'
    this.code = code
    this.details = details
    this.timestamp = new Date().toISOString()
  }
  
  /**
   * Create user-friendly error message
   * @returns {string} User-friendly message
   */
  getUserMessage() {
    const messages = {
      [COMPRESSION_CONFIG.ERRORS.INVALID_INPUT]: '输入文件或路径无效',
      [COMPRESSION_CONFIG.ERRORS.FILE_TOO_LARGE]: '文件大小超过 2GB 限制',
      [COMPRESSION_CONFIG.ERRORS.PERMISSION_DENIED]: '无权限访问文件或目录',
      [COMPRESSION_CONFIG.ERRORS.INSUFFICIENT_SPACE]: '磁盘空间不足',
      [COMPRESSION_CONFIG.ERRORS.CORRUPTED_ARCHIVE]: '压缩文件已损坏或格式不正确',
      [COMPRESSION_CONFIG.ERRORS.WRONG_PASSWORD]: '密码错误',
      [COMPRESSION_CONFIG.ERRORS.UNSUPPORTED_FORMAT]: '不支持的压缩格式',
      [COMPRESSION_CONFIG.ERRORS.OPERATION_CANCELLED]: '操作已取消',
      [COMPRESSION_CONFIG.ERRORS.UNKNOWN_ERROR]: '发生未知错误'
    }
    
    return messages[this.code] || messages[COMPRESSION_CONFIG.ERRORS.UNKNOWN_ERROR]
  }
}

/**
 * Progress tracker for compression operations
 */
class ProgressTracker {
  constructor(totalSize, callback) {
    this.totalSize = totalSize
    this.processedSize = 0
    this.callback = callback
    this.lastUpdate = 0
    this.startTime = Date.now()
  }
  
  /**
   * Update progress and call callback if needed
   * @param {number} bytesProcessed - Bytes processed in this update
   */
  update(bytesProcessed) {
    this.processedSize += bytesProcessed
    const now = Date.now()
    
    // Update progress at intervals to avoid too frequent callbacks
    if (now - this.lastUpdate >= COMPRESSION_CONFIG.PROGRESS_INTERVAL) {
      const progress = Math.min(100, (this.processedSize / this.totalSize) * 100)
      const elapsed = (now - this.startTime) / 1000
      const estimatedTotal = elapsed / (progress / 100)
      const remaining = Math.max(0, estimatedTotal - elapsed)
      
      if (this.callback) {
        this.callback({
          progress: Math.round(progress * 100) / 100,
          processedSize: this.processedSize,
          totalSize: this.totalSize,
          elapsed: Math.round(elapsed),
          remaining: Math.round(remaining),
          speed: this.processedSize / elapsed // bytes per second
        })
      }
      
      this.lastUpdate = now
    }
  }
  
  /**
   * Complete progress tracking
   */
  complete() {
    const elapsed = (Date.now() - this.startTime) / 1000
    if (this.callback) {
      this.callback({
        progress: 100,
        processedSize: this.totalSize,
        totalSize: this.totalSize,
        elapsed: Math.round(elapsed),
        remaining: 0,
        speed: this.totalSize / elapsed,
        completed: true
      })
    }
  }
}

/**
 * Browser-compatible compression service
 */
export class BrowserCompressionService {
  constructor() {
    this.activeOperations = new Map()
  }
  
  /**
   * Compress files to ZIP archive
   * @param {Array} files - Array of File objects or file data
   * @param {Object} options - Compression options
   * @returns {Promise<Object>} Compression result with blob
   */
  async compress(files, options = {}) {
    const {
      level = 'normal',
      password = null,
      onProgress = null,
      signal = null,
      filename = 'archive.zip'
    } = options
    
    const operationId = this._generateOperationId()
    const controller = signal || new AbortController()
    
    this.activeOperations.set(operationId, {
      controller,
      type: 'compress',
      startTime: Date.now()
    })
    
    try {
      // Validate inputs
      if (!files || !Array.isArray(files) || files.length === 0) {
        throw new CompressionError('No files provided for compression', COMPRESSION_CONFIG.ERRORS.INVALID_INPUT)
      }
      
      // Create new JSZip instance
      const zip = new JSZip()
      
      // Calculate total size for progress tracking
      let totalSize = 0
      for (const file of files) {
        if (file instanceof File || file instanceof Blob) {
          totalSize += file.size
        } else if (file.content) {
          totalSize += file.content.length || file.content.size || 0
        }
      }
      
      // Initialize progress tracker
      let progressTracker = null
      if (onProgress) {
        progressTracker = new ProgressTracker(totalSize, onProgress)
      }
      
      // Add files to ZIP
      let filesAdded = 0
      for (const file of files) {
        if (controller.signal && controller.signal.aborted) {
          throw new CompressionError('Operation cancelled', COMPRESSION_CONFIG.ERRORS.OPERATION_CANCELLED)
        }
        
        let fileName, fileContent
        
        if (file instanceof File) {
          // Handle File object from file input
          fileName = file.webkitRelativePath || file.name
          fileContent = file
          
          // Check file size
          if (file.size > COMPRESSION_CONFIG.MAX_FILE_SIZE) {
            throw new CompressionError(
              `File ${fileName} exceeds maximum size limit`,
              COMPRESSION_CONFIG.ERRORS.FILE_TOO_LARGE
            )
          }
        } else if (file.name && file.content) {
          // Handle custom file object with name and content
          fileName = file.name
          fileContent = file.content
        } else {
          throw new CompressionError(
            `Invalid file input: ${JSON.stringify(file)}`,
            COMPRESSION_CONFIG.ERRORS.INVALID_INPUT
          )
        }
        
        // Add file to ZIP
        if (fileName.endsWith('/')) {
          // Directory
          zip.folder(fileName)
        } else {
          // File
          const folderPath = fileName.substring(0, fileName.lastIndexOf('/'))
          const filename = fileName.substring(fileName.lastIndexOf('/') + 1)
          
          if (folderPath) {
            zip.folder(folderPath).file(filename, fileContent)
          } else {
            zip.file(fileName, fileContent)
          }
        }
        
        filesAdded++
        
        // Update progress
        if (progressTracker && fileContent) {
          const size = fileContent.size || fileContent.length || 0
          progressTracker.update(size)
        }
      }
      
      // Generate ZIP with compression
      const compressionOptions = {
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: COMPRESSION_CONFIG.LEVELS[level] || COMPRESSION_CONFIG.LEVELS.normal
      }
      
      // If password is provided, we need to encrypt the ZIP content
      // Note: JSZip doesn't natively support password protection for creation
      // We'll need to encrypt the entire ZIP blob after generation
      
      // Handle progress during generation
      let blob = await zip.generateAsync(compressionOptions, (metadata) => {
        if (onProgress && metadata.percent) {
          onProgress({
            progress: metadata.percent,
            currentFile: metadata.currentFile || '',
            processedSize: Math.floor(totalSize * metadata.percent / 100),
            totalSize: totalSize
          })
        }
      })
      
      // Encrypt the blob if password is provided
      if (password) {
        const arrayBuffer = await blob.arrayBuffer()
        const wordArray = CryptoJS.lib.WordArray.create(new Uint8Array(arrayBuffer))
        const encrypted = CryptoJS.AES.encrypt(wordArray, password)
        const encryptedString = encrypted.toString()
        
        // Create a new blob with encrypted content
        // Add a marker to indicate this is an encrypted ZIP
        const encryptedData = JSON.stringify({
          type: 'encrypted-zip',
          data: encryptedString
        })
        blob = new Blob([encryptedData], { type: 'application/octet-stream' })
      }
      
      // Complete progress
      if (progressTracker) {
        progressTracker.complete()
      }
      
      return {
        success: true,
        blob,
        filename: password ? filename.replace('.zip', '.encrypted.zip') : filename,
        filesProcessed: filesAdded,
        totalSize,
        compressedSize: blob.size,
        format: 'zip',
        operationId,
        compressionRatio: totalSize > 0 ? 
          ((totalSize - blob.size) / totalSize * 100).toFixed(1) + '%' : '0%',
        isEncrypted: !!password
      }
      
    } catch (error) {
      throw this._handleError(error)
    } finally {
      this.activeOperations.delete(operationId)
    }
  }
  
  /**
   * Decompress ZIP archive
   * @param {File|Blob|ArrayBuffer} archive - ZIP archive data
   * @param {Object} options - Decompression options
   * @returns {Promise<Object>} Decompression result with files
   */
  async decompress(archive, options = {}) {
    const {
      password = null,
      onProgress = null,
      signal = null
    } = options
    
    const operationId = this._generateOperationId()
    const controller = signal || new AbortController()
    
    this.activeOperations.set(operationId, {
      controller,
      type: 'decompress',
      startTime: Date.now()
    })
    
    try {
      let archiveData = archive
      
      // Check if the archive is encrypted
      const text = await archive.text()
      let isEncrypted = false
      
      try {
        const parsed = JSON.parse(text)
        if (parsed.type === 'encrypted-zip') {
          isEncrypted = true
          
          if (!password) {
            throw new CompressionError(
              'This archive is password protected. Please provide a password.',
              COMPRESSION_CONFIG.ERRORS.WRONG_PASSWORD
            )
          }
          
          // Decrypt the data
          try {
            const decrypted = CryptoJS.AES.decrypt(parsed.data, password)
            const decryptedArray = new Uint8Array(
              decrypted.sigBytes
            )
            
            // Convert WordArray to Uint8Array
            const words = decrypted.words
            let i = 0
            for (let w = 0; w < words.length; w++) {
              const word = words[w]
              decryptedArray[i++] = (word >> 24) & 0xFF
              decryptedArray[i++] = (word >> 16) & 0xFF
              decryptedArray[i++] = (word >> 8) & 0xFF
              decryptedArray[i++] = word & 0xFF
            }
            
            archiveData = new Blob([decryptedArray.slice(0, decrypted.sigBytes)])
          } catch (error) {
            throw new CompressionError(
              'Incorrect password or corrupted archive',
              COMPRESSION_CONFIG.ERRORS.WRONG_PASSWORD
            )
          }
        }
      } catch (e) {
        // Not JSON, so it's a regular ZIP file
        if (password) {
          console.warn('Password provided but archive is not encrypted')
        }
      }
      
      // Load ZIP file
      const zip = new JSZip()
      await zip.loadAsync(archiveData)
      
      // Get all files and organize them by folders
      const files = []
      const folderStructure = {}
      const entries = Object.keys(zip.files)
      let processedCount = 0
      
      // Initialize progress
      if (onProgress) {
        onProgress({
          progress: 0,
          totalFiles: entries.length,
          processedFiles: 0
        })
      }
      
      for (const fileName of entries) {
        if (controller.signal && controller.signal.aborted) {
          throw new CompressionError('Operation cancelled', COMPRESSION_CONFIG.ERRORS.OPERATION_CANCELLED)
        }
        
        const file = zip.files[fileName]
        
        if (!file.dir) {
          // Extract file content
          const content = await file.async('blob')
          
          // Parse folder structure
          const pathParts = fileName.split('/')
          const filename = pathParts.pop()
          const folderPath = pathParts.join('/')
          
          const fileData = {
            name: fileName,
            filename: filename,
            folderPath: folderPath,
            content,
            size: content.size,
            lastModified: file.date,
            type: this._getMimeType(fileName)
          }
          
          files.push(fileData)
          
          // Organize in folder structure
          if (!folderStructure[folderPath]) {
            folderStructure[folderPath] = []
          }
          folderStructure[folderPath].push(fileData)
        } else {
          // Track directories
          const dirPath = fileName.endsWith('/') ? fileName.slice(0, -1) : fileName
          if (!folderStructure[dirPath]) {
            folderStructure[dirPath] = []
          }
        }
        
        processedCount++
        
        // Update progress
        if (onProgress) {
          const progress = (processedCount / entries.length) * 100
          onProgress({
            progress,
            totalFiles: entries.length,
            processedFiles: processedCount,
            currentFile: fileName
          })
        }
      }
      
      return {
        success: true,
        files,
        folderStructure,
        filesExtracted: files.length,
        totalSize: files.reduce((sum, f) => sum + f.size, 0),
        format: 'zip',
        operationId
      }
      
    } catch (error) {
      throw this._handleError(error)
    } finally {
      this.activeOperations.delete(operationId)
    }
  }
  
  /**
   * Get ZIP archive information
   * @param {File|Blob|ArrayBuffer} archive - ZIP archive data
   * @returns {Promise<Object>} Archive information
   */
  async getArchiveInfo(archive) {
    try {
      const zip = new JSZip()
      await zip.loadAsync(archive)
      
      const info = {
        format: 'zip',
        entryCount: 0,
        totalSize: 0,
        compressedSize: archive.size || 0,
        entries: []
      }
      
      for (const [fileName, file] of Object.entries(zip.files)) {
        if (!file.dir) {
          const uncompressedSize = file._data ? file._data.uncompressedSize : 0
          const compressedSize = file._data ? file._data.compressedSize : 0
          
          info.entryCount++
          info.totalSize += uncompressedSize
          
          info.entries.push({
            name: fileName,
            size: uncompressedSize,
            compressedSize: compressedSize,
            lastModified: file.date,
            isDirectory: false,
            compressionRatio: uncompressedSize > 0 ? 
              ((uncompressedSize - compressedSize) / uncompressedSize * 100).toFixed(1) + '%' : '0%'
          })
        }
      }
      
      info.compressionRatio = info.totalSize > 0 ? 
        ((info.totalSize - info.compressedSize) / info.totalSize * 100).toFixed(1) + '%' : '0%'
      
      return info
      
    } catch (error) {
      throw this._handleError(error)
    }
  }
  
  /**
   * Cancel active operation
   * @param {string} operationId - Operation ID to cancel
   * @returns {boolean} True if operation was cancelled
   */
  cancelOperation(operationId) {
    const operation = this.activeOperations.get(operationId)
    if (operation) {
      operation.controller.abort()
      this.activeOperations.delete(operationId)
      return true
    }
    return false
  }
  
  /**
   * Get active operations
   * @returns {Array} Array of active operation info
   */
  getActiveOperations() {
    return Array.from(this.activeOperations.entries()).map(([id, operation]) => ({
      id,
      type: operation.type,
      startTime: operation.startTime,
      duration: Date.now() - operation.startTime
    }))
  }
  
  /**
   * Get MIME type from file extension
   * @private
   */
  _getMimeType(fileName) {
    const ext = fileName.split('.').pop().toLowerCase()
    const mimeTypes = {
      'txt': 'text/plain',
      'html': 'text/html',
      'css': 'text/css',
      'js': 'application/javascript',
      'json': 'application/json',
      'xml': 'application/xml',
      'pdf': 'application/pdf',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'svg': 'image/svg+xml',
      'mp3': 'audio/mpeg',
      'mp4': 'video/mp4',
      'zip': 'application/zip',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    }
    return mimeTypes[ext] || 'application/octet-stream'
  }
  
  /**
   * Handle and normalize errors
   * @private
   */
  _handleError(error) {
    if (error instanceof CompressionError) {
      return error
    }
    
    // Map common errors to specific codes
    if (error.message && error.message.includes('size')) {
      return new CompressionError(
        'File too large',
        COMPRESSION_CONFIG.ERRORS.FILE_TOO_LARGE,
        error
      )
    }
    
    if (error.message && error.message.includes('corrupt')) {
      return new CompressionError(
        'Archive is corrupted',
        COMPRESSION_CONFIG.ERRORS.CORRUPTED_ARCHIVE,
        error
      )
    }
    
    // Generic unknown error
    return new CompressionError(
      error.message || 'Unknown error occurred',
      COMPRESSION_CONFIG.ERRORS.UNKNOWN_ERROR,
      error
    )
  }
  
  /**
   * Generate unique operation ID
   * @private
   */
  _generateOperationId() {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  /**
   * Download blob as file
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
   * Download extracted files maintaining folder structure
   * @param {Array} files - Array of file objects with folderPath
   * @param {string} archiveName - Original archive name for creating root folder
   */
  async downloadExtractedFiles(files, archiveName) {
    // Remove extension from archive name to use as folder name
    const folderName = archiveName.replace(/\.(zip|encrypted\.zip|tar|gz|7z|rar)$/i, '')
    
    // If there's only one file and no folder structure, download it directly
    if (files.length === 1 && !files[0].folderPath) {
      this.downloadBlob(files[0].content, files[0].filename || files[0].name)
      return
    }
    
    // Create a new ZIP to maintain folder structure
    const zip = new JSZip()
    
    for (const file of files) {
      // Create full path with root folder
      const fullPath = file.folderPath 
        ? `${folderName}/${file.name}`
        : `${folderName}/${file.filename || file.name}`
      
      zip.file(fullPath, file.content)
    }
    
    // Generate and download the ZIP
    const blob = await zip.generateAsync({ type: 'blob' })
    this.downloadBlob(blob, `${folderName}.zip`)
  }
}

// Create and export singleton instance
export const browserCompressionService = new BrowserCompressionService()