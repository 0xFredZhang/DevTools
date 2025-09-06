/**
<<<<<<< HEAD
 * Compression Service
 * 
 * Provides file and data compression functionality using Node.js built-in zlib module.
 * Supports various compression formats and levels for optimal file size reduction.
 */

const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

/**
 * Compression service class for handling various compression operations
 */
class CompressionService {
  constructor() {
    this.supportedFormats = ['gzip', 'deflate', 'brotli'];
    this.defaultLevel = 6; // Balanced compression level (1-9)
  }

  /**
   * Compress data using specified format
   * @param {Buffer|string} data - Data to compress
   * @param {string} format - Compression format (gzip, deflate, brotli)
   * @param {number} level - Compression level (1-9)
   * @returns {Promise<Buffer>} Compressed data
   */
  async compressData(data, format = 'gzip', level = this.defaultLevel) {
    // TODO: Implement data compression logic
    throw new Error('CompressionService.compressData() not implemented');
  }

  /**
   * Decompress data using specified format
   * @param {Buffer} data - Compressed data to decompress
   * @param {string} format - Compression format (gzip, deflate, brotli)
   * @returns {Promise<Buffer>} Decompressed data
   */
  async decompressData(data, format = 'gzip') {
    // TODO: Implement data decompression logic
    throw new Error('CompressionService.decompressData() not implemented');
  }

  /**
   * Compress file and save to specified output path
   * @param {string} inputPath - Path to input file
   * @param {string} outputPath - Path to compressed output file
   * @param {string} format - Compression format
   * @param {number} level - Compression level
   * @returns {Promise<{originalSize: number, compressedSize: number, ratio: number}>}
   */
  async compressFile(inputPath, outputPath, format = 'gzip', level = this.defaultLevel) {
    // TODO: Implement file compression logic
    throw new Error('CompressionService.compressFile() not implemented');
  }

  /**
   * Decompress file and save to specified output path
   * @param {string} inputPath - Path to compressed file
   * @param {string} outputPath - Path to decompressed output file
   * @param {string} format - Compression format
   * @returns {Promise<{originalSize: number, decompressedSize: number}>}
   */
  async decompressFile(inputPath, outputPath, format = 'gzip') {
    // TODO: Implement file decompression logic
    throw new Error('CompressionService.decompressFile() not implemented');
  }

  /**
   * Get compression ratio estimate for given data
   * @param {Buffer|string} data - Data to analyze
   * @param {string} format - Compression format
   * @returns {Promise<{originalSize: number, estimatedCompressedSize: number, estimatedRatio: number}>}
   */
  async getCompressionEstimate(data, format = 'gzip') {
    // TODO: Implement compression estimation logic
    throw new Error('CompressionService.getCompressionEstimate() not implemented');
  }

  /**
   * List supported compression formats
   * @returns {string[]} Array of supported format names
   */
  getSupportedFormats() {
    return [...this.supportedFormats];
  }

  /**
   * Validate compression format
   * @param {string} format - Format to validate
   * @returns {boolean} True if format is supported
   */
  isFormatSupported(format) {
    return this.supportedFormats.includes(format.toLowerCase());
  }
}

// Export service instance
module.exports = new CompressionService();
=======
 * Core ZIP Compression Service
 * 
 * Provides comprehensive ZIP compression and decompression functionality with:
 * - Configurable compression levels (fast, normal, maximum)
 * - Streaming API for large files up to 2GB
 * - Progress callback system for UI updates
 * - Directory structure preservation
 * - Comprehensive error handling with specific error codes
 * - Abstract factory pattern for extensibility
 */

import yazl from 'yazl'
import yauzl from 'yauzl'
import fs from 'fs/promises'
import fsSync from 'fs'
import path from 'path'
import { pipeline } from 'stream/promises'
import { fileService } from './fileService.js'

/**
 * Compression configuration constants
 */
export const COMPRESSION_CONFIG = {
  // Compression levels mapping
  LEVELS: {
    fast: 1,     // Fastest compression, larger size
    normal: 6,   // Balanced compression
    maximum: 9   // Maximum compression, slower
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
 * Abstract base class for compression formats
 */
class CompressionFormat {
  constructor() {
    if (this.constructor === CompressionFormat) {
      throw new Error('Cannot instantiate abstract class CompressionFormat')
    }
  }
  
  /**
   * Compress files to archive
   * @param {Array} files - Array of file objects with path and relativePath
   * @param {string} outputPath - Output archive path
   * @param {Object} options - Compression options
   * @returns {Promise<Object>} Compression result
   */
  async compress(files, outputPath, options = {}) {
    throw new Error('compress method must be implemented by subclass')
  }
  
  /**
   * Decompress archive to directory
   * @param {string} archivePath - Path to archive file
   * @param {string} outputDir - Output directory path
   * @param {Object} options - Decompression options
   * @returns {Promise<Object>} Decompression result
   */
  async decompress(archivePath, outputDir, options = {}) {
    throw new Error('decompress method must be implemented by subclass')
  }
  
  /**
   * Get archive information
   * @param {string} archivePath - Path to archive file
   * @returns {Promise<Object>} Archive information
   */
  async getArchiveInfo(archivePath) {
    throw new Error('getArchiveInfo method must be implemented by subclass')
  }
}

/**
 * ZIP compression format implementation
 */
class ZipFormat extends CompressionFormat {
  /**
   * Compress files to ZIP archive
   * @param {Array} files - Array of file objects with path and relativePath
   * @param {string} outputPath - Output ZIP path
   * @param {Object} options - Compression options
   * @returns {Promise<Object>} Compression result
   */
  async compress(files, outputPath, options = {}) {
    const {
      level = 'normal',
      password = null,
      onProgress = null,
      signal = null
    } = options
    
    return new Promise(async (resolve, reject) => {
      let zipfile = null
      let progressTracker = null
      
      try {
        // Validate inputs
        if (!files || !Array.isArray(files) || files.length === 0) {
          throw new CompressionError('No files provided for compression', COMPRESSION_CONFIG.ERRORS.INVALID_INPUT)
        }
        
        // Calculate total size for progress tracking
        let totalSize = 0
        for (const file of files) {
          try {
            const stats = await fs.stat(file.path)
            if (stats.size > COMPRESSION_CONFIG.MAX_FILE_SIZE) {
              throw new CompressionError(
                `File ${file.path} exceeds maximum size limit`,
                COMPRESSION_CONFIG.ERRORS.FILE_TOO_LARGE
              )
            }
            totalSize += stats.size
          } catch (error) {
            if (error instanceof CompressionError) throw error
            throw new CompressionError(
              `Cannot access file ${file.path}: ${error.message}`,
              COMPRESSION_CONFIG.ERRORS.PERMISSION_DENIED
            )
          }
        }
        
        // Initialize progress tracker
        if (onProgress) {
          progressTracker = new ProgressTracker(totalSize, onProgress)
        }
        
        // Create ZIP file with compression level
        const compressionLevel = COMPRESSION_CONFIG.LEVELS[level] || COMPRESSION_CONFIG.LEVELS.normal
        zipfile = new yazl.ZipFile()
        
        // Handle cancellation
        if (signal) {
          signal.addEventListener('abort', () => {
            if (zipfile) {
              reject(new CompressionError('Operation cancelled', COMPRESSION_CONFIG.ERRORS.OPERATION_CANCELLED))
            }
          })
        }
        
        // Add files to ZIP
        let filesAdded = 0
        let addPromises = []
        
        for (const file of files) {
          if (signal && signal.aborted) {
            throw new CompressionError('Operation cancelled', COMPRESSION_CONFIG.ERRORS.OPERATION_CANCELLED)
          }
          
          try {
            const stats = await fs.stat(file.path)
            
            if (stats.isFile()) {
              // Add file with streaming to handle large files
              const readStream = fsSync.createReadStream(file.path)
              
              // Track progress if enabled
              if (progressTracker) {
                readStream.on('data', (chunk) => {
                  progressTracker.update(chunk.length)
                })
              }
              
              zipfile.addReadStream(
                readStream,
                file.relativePath || path.basename(file.path),
                {
                  compress: true,
                  forceZip64Format: stats.size > 0xFFFFFFFF
                }
              )
              
            } else if (stats.isDirectory()) {
              // Add directory entry
              zipfile.addEmptyDirectory(
                file.relativePath || path.basename(file.path) + '/',
                { mtime: stats.mtime }
              )
              
              // Add all files in directory recursively
              await this._addDirectoryToZip(zipfile, file.path, file.relativePath || path.basename(file.path), progressTracker, signal)
            }
            
            filesAdded++
          } catch (error) {
            if (error instanceof CompressionError) throw error
            throw new CompressionError(
              `Error adding file ${file.path}: ${error.message}`,
              COMPRESSION_CONFIG.ERRORS.UNKNOWN_ERROR
            )
          }
        }
        
        // Finalize ZIP file
        zipfile.end()
        
        // Create output stream
        const outputStream = fsSync.createWriteStream(outputPath)
        
        // Handle ZIP creation completion
        zipfile.outputStream.on('error', (error) => {
          reject(new CompressionError(`ZIP creation failed: ${error.message}`, COMPRESSION_CONFIG.ERRORS.UNKNOWN_ERROR))
        })
        
        outputStream.on('error', (error) => {
          reject(new CompressionError(`Cannot write to output file: ${error.message}`, COMPRESSION_CONFIG.ERRORS.PERMISSION_DENIED))
        })
        
        outputStream.on('finish', () => {
          if (progressTracker) {
            progressTracker.complete()
          }
          
          resolve({
            success: true,
            outputPath,
            filesProcessed: filesAdded,
            totalSize,
            format: 'zip'
          })
        })
        
        // Pipe ZIP data to output file
        zipfile.outputStream.pipe(outputStream)
        
      } catch (error) {
        if (zipfile) {
          zipfile.end()
        }
        
        if (error instanceof CompressionError) {
          reject(error)
        } else {
          reject(new CompressionError(error.message, COMPRESSION_CONFIG.ERRORS.UNKNOWN_ERROR))
        }
      }
    })
  }
  
  /**
   * Recursively add directory contents to ZIP
   * @private
   */
  async _addDirectoryToZip(zipfile, dirPath, relativePath, progressTracker, signal) {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true })
      
      for (const entry of entries) {
        if (signal && signal.aborted) {
          throw new CompressionError('Operation cancelled', COMPRESSION_CONFIG.ERRORS.OPERATION_CANCELLED)
        }
        
        const fullPath = path.join(dirPath, entry.name)
        const entryRelativePath = path.posix.join(relativePath, entry.name)
        
        if (entry.isFile()) {
          const stats = await fs.stat(fullPath)
          const readStream = fsSync.createReadStream(fullPath)
          
          if (progressTracker) {
            readStream.on('data', (chunk) => {
              progressTracker.update(chunk.length)
            })
          }
          
          zipfile.addReadStream(
            readStream,
            entryRelativePath,
            {
              compress: true,
              mtime: stats.mtime,
              forceZip64Format: stats.size > 0xFFFFFFFF
            }
          )
          
        } else if (entry.isDirectory()) {
          zipfile.addEmptyDirectory(entryRelativePath + '/')
          await this._addDirectoryToZip(zipfile, fullPath, entryRelativePath, progressTracker, signal)
        }
      }
    } catch (error) {
      if (error instanceof CompressionError) throw error
      throw new CompressionError(
        `Error processing directory ${dirPath}: ${error.message}`,
        COMPRESSION_CONFIG.ERRORS.PERMISSION_DENIED
      )
    }
  }
  
  /**
   * Decompress ZIP archive to directory
   * @param {string} archivePath - Path to ZIP file
   * @param {string} outputDir - Output directory path
   * @param {Object} options - Decompression options
   * @returns {Promise<Object>} Decompression result
   */
  async decompress(archivePath, outputDir, options = {}) {
    const {
      password = null,
      onProgress = null,
      signal = null,
      preservePermissions = true
    } = options
    
    return new Promise((resolve, reject) => {
      let zipfile = null
      let progressTracker = null
      let filesExtracted = 0
      let totalSize = 0
      
      try {
        // Open ZIP file
        yauzl.open(archivePath, { lazyEntries: true, autoClose: false }, async (err, zipFile) => {
          if (err) {
            return reject(new CompressionError(
              `Cannot open ZIP file: ${err.message}`,
              COMPRESSION_CONFIG.ERRORS.CORRUPTED_ARCHIVE
            ))
          }
          
          zipfile = zipFile
          
          // Handle cancellation
          if (signal) {
            signal.addEventListener('abort', () => {
              if (zipfile) {
                zipfile.close()
                reject(new CompressionError('Operation cancelled', COMPRESSION_CONFIG.ERRORS.OPERATION_CANCELLED))
              }
            })
          }
          
          // Calculate total uncompressed size for progress
          const entries = []
          zipfile.on('entry', (entry) => {
            entries.push(entry)
            totalSize += entry.uncompressedSize
          })
          
          zipfile.on('end', async () => {
            try {
              // Initialize progress tracker
              if (onProgress) {
                progressTracker = new ProgressTracker(totalSize, onProgress)
              }
              
              // Process all entries
              for (const entry of entries) {
                if (signal && signal.aborted) {
                  throw new CompressionError('Operation cancelled', COMPRESSION_CONFIG.ERRORS.OPERATION_CANCELLED)
                }
                
                await this._extractEntry(zipfile, entry, outputDir, progressTracker, preservePermissions)
                filesExtracted++
              }
              
              zipfile.close()
              
              if (progressTracker) {
                progressTracker.complete()
              }
              
              resolve({
                success: true,
                outputDir,
                filesExtracted,
                totalSize,
                format: 'zip'
              })
              
            } catch (error) {
              zipfile.close()
              if (error instanceof CompressionError) {
                reject(error)
              } else {
                reject(new CompressionError(error.message, COMPRESSION_CONFIG.ERRORS.UNKNOWN_ERROR))
              }
            }
          })
          
          zipfile.on('error', (error) => {
            reject(new CompressionError(
              `ZIP processing error: ${error.message}`,
              COMPRESSION_CONFIG.ERRORS.CORRUPTED_ARCHIVE
            ))
          })
          
          // Start reading entries
          zipfile.readEntry()
        })
        
      } catch (error) {
        if (zipfile) {
          zipfile.close()
        }
        
        if (error instanceof CompressionError) {
          reject(error)
        } else {
          reject(new CompressionError(error.message, COMPRESSION_CONFIG.ERRORS.UNKNOWN_ERROR))
        }
      }
    })
  }
  
  /**
   * Extract a single ZIP entry
   * @private
   */
  async _extractEntry(zipfile, entry, outputDir, progressTracker, preservePermissions) {
    const fileName = entry.fileName
    const outputPath = path.join(outputDir, fileName)
    
    // Validate path safety
    if (!fileService.isPathSafe(outputPath, outputDir)) {
      throw new CompressionError(
        `Unsafe path in archive: ${fileName}`,
        COMPRESSION_CONFIG.ERRORS.CORRUPTED_ARCHIVE
      )
    }
    
    // Create directory if entry is a directory
    if (fileName.endsWith('/')) {
      await fs.mkdir(outputPath, { recursive: true })
      return
    }
    
    // Create parent directories
    await fs.mkdir(path.dirname(outputPath), { recursive: true })
    
    return new Promise((resolve, reject) => {
      // Open entry stream
      zipfile.openReadStream(entry, (err, readStream) => {
        if (err) {
          return reject(new CompressionError(
            `Cannot read entry ${fileName}: ${err.message}`,
            COMPRESSION_CONFIG.ERRORS.CORRUPTED_ARCHIVE
          ))
        }
        
        // Create write stream
        const writeStream = fsSync.createWriteStream(outputPath)
        
        // Track progress
        if (progressTracker) {
          readStream.on('data', (chunk) => {
            progressTracker.update(chunk.length)
          })
        }
        
        // Handle errors
        readStream.on('error', (error) => {
          reject(new CompressionError(
            `Error reading entry ${fileName}: ${error.message}`,
            COMPRESSION_CONFIG.ERRORS.CORRUPTED_ARCHIVE
          ))
        })
        
        writeStream.on('error', (error) => {
          reject(new CompressionError(
            `Error writing file ${outputPath}: ${error.message}`,
            COMPRESSION_CONFIG.ERRORS.PERMISSION_DENIED
          ))
        })
        
        writeStream.on('finish', async () => {
          try {
            // Set file permissions if requested
            if (preservePermissions && entry.externalFileAttributes) {
              const mode = (entry.externalFileAttributes >>> 16) & 0o777
              if (mode) {
                await fs.chmod(outputPath, mode)
              }
            }
            
            // Set file times
            if (entry.lastModTime) {
              await fs.utimes(outputPath, entry.lastModTime, entry.lastModTime)
            }
            
            resolve()
          } catch (error) {
            // Non-critical errors (permissions, timestamps) shouldn't fail extraction
            console.warn(`Warning: Could not set metadata for ${outputPath}:`, error.message)
            resolve()
          }
        })
        
        // Pipe data
        readStream.pipe(writeStream)
      })
    })
  }
  
  /**
   * Get ZIP archive information
   * @param {string} archivePath - Path to ZIP file
   * @returns {Promise<Object>} Archive information
   */
  async getArchiveInfo(archivePath) {
    return new Promise((resolve, reject) => {
      yauzl.open(archivePath, { lazyEntries: true, autoClose: false }, (err, zipfile) => {
        if (err) {
          return reject(new CompressionError(
            `Cannot open ZIP file: ${err.message}`,
            COMPRESSION_CONFIG.ERRORS.CORRUPTED_ARCHIVE
          ))
        }
        
        const info = {
          format: 'zip',
          path: archivePath,
          entryCount: 0,
          totalSize: 0,
          compressedSize: 0,
          entries: []
        }
        
        zipfile.on('entry', (entry) => {
          info.entryCount++
          info.totalSize += entry.uncompressedSize
          info.compressedSize += entry.compressedSize
          
          info.entries.push({
            name: entry.fileName,
            size: entry.uncompressedSize,
            compressedSize: entry.compressedSize,
            lastModified: entry.lastModTime,
            isDirectory: entry.fileName.endsWith('/'),
            compressionRatio: entry.uncompressedSize > 0 ? 
              ((entry.uncompressedSize - entry.compressedSize) / entry.uncompressedSize * 100).toFixed(1) + '%' : '0%'
          })
        })
        
        zipfile.on('end', () => {
          zipfile.close()
          
          info.compressionRatio = info.totalSize > 0 ? 
            ((info.totalSize - info.compressedSize) / info.totalSize * 100).toFixed(1) + '%' : '0%'
          
          resolve(info)
        })
        
        zipfile.on('error', (error) => {
          zipfile.close()
          reject(new CompressionError(
            `Error reading ZIP info: ${error.message}`,
            COMPRESSION_CONFIG.ERRORS.CORRUPTED_ARCHIVE
          ))
        })
        
        zipfile.readEntry()
      })
    })
  }
}

/**
 * Abstract factory for compression formats
 */
export class CompressionFactory {
  static formats = new Map([
    ['zip', ZipFormat]
  ])
  
  /**
   * Create compression handler for specified format
   * @param {string} format - Compression format (zip, tar, 7z)
   * @returns {CompressionFormat} Format handler instance
   */
  static create(format) {
    const FormatClass = this.formats.get(format.toLowerCase())
    
    if (!FormatClass) {
      throw new CompressionError(
        `Unsupported compression format: ${format}`,
        COMPRESSION_CONFIG.ERRORS.UNSUPPORTED_FORMAT
      )
    }
    
    return new FormatClass()
  }
  
  /**
   * Register new compression format
   * @param {string} format - Format name
   * @param {Class} formatClass - Format implementation class
   */
  static register(format, formatClass) {
    this.formats.set(format.toLowerCase(), formatClass)
  }
  
  /**
   * Get list of supported formats
   * @returns {Array<string>} Supported format names
   */
  static getSupportedFormats() {
    return Array.from(this.formats.keys())
  }
}

/**
 * Main compression service class
 */
export class CompressionService {
  constructor() {
    this.activeOperations = new Map()
  }
  
  /**
   * Compress files to archive
   * @param {Array} files - Array of file paths or objects with {path, relativePath}
   * @param {string} outputPath - Output archive path
   * @param {Object} options - Compression options
   * @returns {Promise<Object>} Compression result
   */
  async compress(files, outputPath, options = {}) {
    const {
      format = 'zip',
      level = 'normal',
      password = null,
      onProgress = null
    } = options
    
    // Create abort controller for cancellation
    const controller = new AbortController()
    const operationId = this._generateOperationId()
    
    this.activeOperations.set(operationId, {
      controller,
      type: 'compress',
      startTime: Date.now()
    })
    
    try {
      // Normalize file inputs
      const normalizedFiles = await this._normalizeFileInputs(files)
      
      // Get format handler
      const formatHandler = CompressionFactory.create(format)
      
      // Perform compression
      const result = await formatHandler.compress(normalizedFiles, outputPath, {
        level,
        password,
        onProgress,
        signal: controller.signal
      })
      
      result.operationId = operationId
      return result
      
    } catch (error) {
      throw this._handleError(error)
    } finally {
      this.activeOperations.delete(operationId)
    }
  }
  
  /**
   * Decompress archive to directory
   * @param {string} archivePath - Path to archive file
   * @param {string} outputDir - Output directory path
   * @param {Object} options - Decompression options
   * @returns {Promise<Object>} Decompression result
   */
  async decompress(archivePath, outputDir, options = {}) {
    const {
      password = null,
      onProgress = null,
      preservePermissions = true
    } = options
    
    // Create abort controller for cancellation
    const controller = new AbortController()
    const operationId = this._generateOperationId()
    
    this.activeOperations.set(operationId, {
      controller,
      type: 'decompress',
      startTime: Date.now()
    })
    
    try {
      // Detect archive format
      const format = this._detectArchiveFormat(archivePath)
      
      // Get format handler
      const formatHandler = CompressionFactory.create(format)
      
      // Ensure output directory exists
      await fs.mkdir(outputDir, { recursive: true })
      
      // Perform decompression
      const result = await formatHandler.decompress(archivePath, outputDir, {
        password,
        onProgress,
        preservePermissions,
        signal: controller.signal
      })
      
      result.operationId = operationId
      return result
      
    } catch (error) {
      throw this._handleError(error)
    } finally {
      this.activeOperations.delete(operationId)
    }
  }
  
  /**
   * Get archive information
   * @param {string} archivePath - Path to archive file
   * @returns {Promise<Object>} Archive information
   */
  async getArchiveInfo(archivePath) {
    try {
      const format = this._detectArchiveFormat(archivePath)
      const formatHandler = CompressionFactory.create(format)
      return await formatHandler.getArchiveInfo(archivePath)
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
   * Normalize file inputs to consistent format
   * @private
   */
  async _normalizeFileInputs(files) {
    if (!Array.isArray(files)) {
      throw new CompressionError('Files must be an array', COMPRESSION_CONFIG.ERRORS.INVALID_INPUT)
    }
    
    const normalized = []
    
    for (const file of files) {
      if (typeof file === 'string') {
        // Simple file path
        const fileInfo = await fileService.getFileInfo(file)
        normalized.push({
          path: fileInfo.path,
          relativePath: path.basename(fileInfo.path)
        })
      } else if (file && typeof file === 'object' && file.path) {
        // File object with path and optional relativePath
        const fileInfo = await fileService.getFileInfo(file.path)
        normalized.push({
          path: fileInfo.path,
          relativePath: file.relativePath || path.basename(fileInfo.path)
        })
      } else {
        throw new CompressionError(
          `Invalid file input: ${JSON.stringify(file)}`,
          COMPRESSION_CONFIG.ERRORS.INVALID_INPUT
        )
      }
    }
    
    return normalized
  }
  
  /**
   * Detect archive format from file extension
   * @private
   */
  _detectArchiveFormat(archivePath) {
    const ext = path.extname(archivePath).toLowerCase()
    
    const formatMap = {
      '.zip': 'zip',
      '.tar': 'tar',
      '.tar.gz': 'tar',
      '.tgz': 'tar',
      '.7z': '7z'
    }
    
    // Check for compound extensions like .tar.gz
    if (archivePath.toLowerCase().endsWith('.tar.gz') || archivePath.toLowerCase().endsWith('.tar.bz2')) {
      return 'tar'
    }
    
    const format = formatMap[ext]
    if (!format) {
      throw new CompressionError(
        `Cannot detect archive format from extension: ${ext}`,
        COMPRESSION_CONFIG.ERRORS.UNSUPPORTED_FORMAT
      )
    }
    
    return format
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
    if (error.code === 'ENOENT') {
      return new CompressionError(
        'File or directory not found',
        COMPRESSION_CONFIG.ERRORS.INVALID_INPUT,
        error
      )
    }
    
    if (error.code === 'EACCES' || error.code === 'EPERM') {
      return new CompressionError(
        'Permission denied',
        COMPRESSION_CONFIG.ERRORS.PERMISSION_DENIED,
        error
      )
    }
    
    if (error.code === 'ENOSPC') {
      return new CompressionError(
        'Insufficient disk space',
        COMPRESSION_CONFIG.ERRORS.INSUFFICIENT_SPACE,
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
}

// Create and export singleton instance
export const compressionService = new CompressionService()
>>>>>>> 0616ec829ca44d386e16bcb71dd32a6f9695c140
