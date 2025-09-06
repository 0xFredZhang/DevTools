/**
 * File System Operations Service
 * 
 * Provides secure file system operations with comprehensive validation,
 * cross-platform compatibility, and temporary file management.
 */

import fs from 'fs/promises'
import fsSync from 'fs'
import path from 'path'
import os from 'os'
import crypto from 'crypto'

/**
 * File validation and security configuration
 */
const FILE_CONFIG = {
  // Maximum file size (100MB)
  MAX_FILE_SIZE: 100 * 1024 * 1024,
  
  // Maximum directory depth for traversal protection
  MAX_PATH_DEPTH: 20,
  
  // Allowed file extensions for compression operations
  ALLOWED_EXTENSIONS: new Set([
    '.zip', '.rar', '.7z', '.tar', '.tar.gz', '.tgz', '.tar.bz2', '.tbz2',
    '.tar.xz', '.txz', '.gz', '.bz2', '.xz', '.lz', '.lzma', '.Z'
  ]),
  
  // Dangerous file extensions that should be blocked
  DANGEROUS_EXTENSIONS: new Set([
    '.exe', '.bat', '.cmd', '.com', '.scr', '.pif', '.vbs', '.js', '.jar',
    '.sh', '.bash', '.zsh', '.fish', '.ps1', '.psm1', '.msi', '.deb', '.rpm',
    '.dmg', '.pkg', '.app'
  ]),
  
  // Temporary file prefix
  TEMP_PREFIX: 'devtools_',
  
  // Cleanup interval for temp files (30 minutes)
  CLEANUP_INTERVAL: 30 * 60 * 1000
}

/**
 * Cross-platform path utilities
 */
class PathUtils {
  /**
   * Normalize path for current platform
   * @param {string} filePath - Path to normalize
   * @returns {string} Normalized path
   */
  static normalize(filePath) {
    if (!filePath || typeof filePath !== 'string') {
      throw new Error('Invalid file path provided')
    }
    
    // Convert to platform-specific separators
    const normalized = path.resolve(path.normalize(filePath))
    
    // Validate path depth to prevent traversal attacks
    const depth = normalized.split(path.sep).length
    if (depth > FILE_CONFIG.MAX_PATH_DEPTH) {
      throw new Error(`Path depth exceeds maximum allowed (${FILE_CONFIG.MAX_PATH_DEPTH})`)
    }
    
    return normalized
  }
  
  /**
   * Check if path is within allowed boundaries (no traversal)
   * @param {string} filePath - Path to check
   * @param {string} basePath - Base directory path
   * @returns {boolean} True if path is safe
   */
  static isPathSafe(filePath, basePath) {
    try {
      const resolvedPath = path.resolve(filePath)
      const resolvedBase = path.resolve(basePath)
      
      return resolvedPath.startsWith(resolvedBase + path.sep) || resolvedPath === resolvedBase
    } catch (error) {
      return false
    }
  }
  
  /**
   * Get file extension in lowercase
   * @param {string} filePath - File path
   * @returns {string} File extension
   */
  static getExtension(filePath) {
    return path.extname(filePath).toLowerCase()
  }
  
  /**
   * Generate safe temporary file path
   * @param {string} extension - File extension
   * @returns {string} Temporary file path
   */
  static generateTempPath(extension = '') {
    const tempDir = os.tmpdir()
    const randomId = crypto.randomBytes(16).toString('hex')
    const fileName = `${FILE_CONFIG.TEMP_PREFIX}${randomId}${extension}`
    return path.join(tempDir, fileName)
  }
}

/**
 * File validation and security checks
 */
class FileValidator {
  /**
   * Validate file for security and constraints
   * @param {string} filePath - Path to file
   * @returns {Promise<Object>} Validation result
   */
  static async validateFile(filePath) {
    const result = {
      valid: false,
      errors: [],
      warnings: [],
      stats: null
    }
    
    try {
      // Normalize and check path safety
      const normalizedPath = PathUtils.normalize(filePath)
      
      // Check file exists and get stats
      let stats
      try {
        stats = await fs.stat(normalizedPath)
        result.stats = stats
      } catch (error) {
        result.errors.push(`File not accessible: ${error.message}`)
        return result
      }
      
      // Check if it's a file (not directory)
      if (!stats.isFile()) {
        result.errors.push('Path does not point to a file')
        return result
      }
      
      // Check file size
      if (stats.size > FILE_CONFIG.MAX_FILE_SIZE) {
        result.errors.push(`File size exceeds maximum allowed (${FILE_CONFIG.MAX_FILE_SIZE / (1024 * 1024)}MB)`)
        return result
      }
      
      // Check file extension
      const extension = PathUtils.getExtension(normalizedPath)
      
      // Block dangerous extensions
      if (FILE_CONFIG.DANGEROUS_EXTENSIONS.has(extension)) {
        result.errors.push(`File type not allowed for security reasons: ${extension}`)
        return result
      }
      
      // Warn about non-standard compression formats
      if (extension && !FILE_CONFIG.ALLOWED_EXTENSIONS.has(extension)) {
        result.warnings.push(`File extension ${extension} may not be supported for compression operations`)
      }
      
      // Check file permissions
      try {
        await fs.access(normalizedPath, fs.constants.R_OK)
      } catch (error) {
        result.errors.push('File is not readable')
        return result
      }
      
      result.valid = result.errors.length === 0
      return result
      
    } catch (error) {
      result.errors.push(`Validation error: ${error.message}`)
      return result
    }
  }
  
  /**
   * Validate directory for operations
   * @param {string} dirPath - Directory path
   * @returns {Promise<Object>} Validation result
   */
  static async validateDirectory(dirPath) {
    const result = {
      valid: false,
      errors: [],
      warnings: [],
      stats: null
    }
    
    try {
      const normalizedPath = PathUtils.normalize(dirPath)
      
      let stats
      try {
        stats = await fs.stat(normalizedPath)
        result.stats = stats
      } catch (error) {
        result.errors.push(`Directory not accessible: ${error.message}`)
        return result
      }
      
      if (!stats.isDirectory()) {
        result.errors.push('Path does not point to a directory')
        return result
      }
      
      // Check directory permissions
      try {
        await fs.access(normalizedPath, fs.constants.R_OK | fs.constants.W_OK)
      } catch (error) {
        result.errors.push('Directory is not readable/writable')
        return result
      }
      
      result.valid = result.errors.length === 0
      return result
      
    } catch (error) {
      result.errors.push(`Directory validation error: ${error.message}`)
      return result
    }
  }
}

/**
 * Temporary file management with automatic cleanup
 */
class TempFileManager {
  constructor() {
    this.tempFiles = new Map()
    this.cleanupInterval = null
    this.startCleanupTimer()
  }
  
  /**
   * Create temporary file
   * @param {string} extension - File extension
   * @returns {Promise<string>} Temporary file path
   */
  async createTempFile(extension = '') {
    const tempPath = PathUtils.generateTempPath(extension)
    const timestamp = Date.now()
    
    try {
      // Create empty file
      await fs.writeFile(tempPath, '')
      
      // Track for cleanup
      this.tempFiles.set(tempPath, {
        created: timestamp,
        accessed: timestamp
      })
      
      return tempPath
    } catch (error) {
      throw new Error(`Failed to create temporary file: ${error.message}`)
    }
  }
  
  /**
   * Create temporary directory
   * @returns {Promise<string>} Temporary directory path
   */
  async createTempDir() {
    const tempPath = PathUtils.generateTempPath()
    const timestamp = Date.now()
    
    try {
      await fs.mkdir(tempPath, { recursive: true })
      
      this.tempFiles.set(tempPath, {
        created: timestamp,
        accessed: timestamp,
        isDirectory: true
      })
      
      return tempPath
    } catch (error) {
      throw new Error(`Failed to create temporary directory: ${error.message}`)
    }
  }
  
  /**
   * Update access time for temp file
   * @param {string} tempPath - Temporary file path
   */
  updateAccess(tempPath) {
    if (this.tempFiles.has(tempPath)) {
      const info = this.tempFiles.get(tempPath)
      info.accessed = Date.now()
    }
  }
  
  /**
   * Clean up specific temporary file/directory
   * @param {string} tempPath - Path to clean up
   */
  async cleanup(tempPath) {
    try {
      const info = this.tempFiles.get(tempPath)
      if (!info) return
      
      if (info.isDirectory) {
        await fs.rm(tempPath, { recursive: true, force: true })
      } else {
        await fs.unlink(tempPath)
      }
      
      this.tempFiles.delete(tempPath)
    } catch (error) {
      // Log error but don't throw - cleanup should be resilient
      console.error(`Failed to cleanup temp file ${tempPath}:`, error.message)
    }
  }
  
  /**
   * Clean up all temporary files
   */
  async cleanupAll() {
    const cleanupPromises = Array.from(this.tempFiles.keys()).map(path => this.cleanup(path))
    await Promise.allSettled(cleanupPromises)
  }
  
  /**
   * Clean up old temporary files (older than cleanup interval)
   */
  async cleanupOld() {
    const now = Date.now()
    const oldPaths = []
    
    for (const [path, info] of this.tempFiles.entries()) {
      if (now - info.accessed > FILE_CONFIG.CLEANUP_INTERVAL) {
        oldPaths.push(path)
      }
    }
    
    const cleanupPromises = oldPaths.map(path => this.cleanup(path))
    await Promise.allSettled(cleanupPromises)
  }
  
  /**
   * Start automatic cleanup timer
   */
  startCleanupTimer() {
    if (this.cleanupInterval) return
    
    this.cleanupInterval = setInterval(async () => {
      await this.cleanupOld()
    }, FILE_CONFIG.CLEANUP_INTERVAL)
    
    // Don't keep process alive for cleanup timer (Node.js only)
    // In browser environment, this is not needed
    if (typeof this.cleanupInterval.unref === 'function') {
      this.cleanupInterval.unref()
    }
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
    return Array.from(this.tempFiles.entries()).map(([path, info]) => ({
      path,
      ...info
    }))
  }
}

/**
 * Main File Service class
 */
export class FileService {
  constructor() {
    this.tempManager = new TempFileManager()
    
    // Handle process cleanup
    process.on('exit', () => this.cleanup())
    process.on('SIGINT', () => this.cleanup())
    process.on('SIGTERM', () => this.cleanup())
  }
  
  /**
   * Select file with validation
   * @param {string} filePath - File path to validate
   * @returns {Promise<Object>} Selection result with validation
   */
  async selectFile(filePath) {
    const validation = await FileValidator.validateFile(filePath)
    
    if (!validation.valid) {
      throw new Error(`File validation failed: ${validation.errors.join(', ')}`)
    }
    
    const normalizedPath = PathUtils.normalize(filePath)
    
    return {
      path: normalizedPath,
      stats: validation.stats,
      warnings: validation.warnings,
      extension: PathUtils.getExtension(normalizedPath)
    }
  }
  
  /**
   * Select directory with validation
   * @param {string} dirPath - Directory path to validate
   * @returns {Promise<Object>} Selection result with validation
   */
  async selectDirectory(dirPath) {
    const validation = await FileValidator.validateDirectory(dirPath)
    
    if (!validation.valid) {
      throw new Error(`Directory validation failed: ${validation.errors.join(', ')}`)
    }
    
    const normalizedPath = PathUtils.normalize(dirPath)
    
    return {
      path: normalizedPath,
      stats: validation.stats,
      warnings: validation.warnings
    }
  }
  
  /**
   * Create temporary file for extraction operations
   * @param {string} extension - File extension
   * @returns {Promise<string>} Temporary file path
   */
  async createTempFile(extension = '') {
    return await this.tempManager.createTempFile(extension)
  }
  
  /**
   * Create temporary directory for extraction operations
   * @returns {Promise<string>} Temporary directory path
   */
  async createTempDirectory() {
    return await this.tempManager.createTempDir()
  }
  
  /**
   * Update access time for temporary file
   * @param {string} tempPath - Temporary file path
   */
  updateTempAccess(tempPath) {
    this.tempManager.updateAccess(tempPath)
  }
  
  /**
   * Clean up specific temporary file
   * @param {string} tempPath - Path to clean up
   */
  async cleanupTemp(tempPath) {
    await this.tempManager.cleanup(tempPath)
  }
  
  /**
   * Check if path is safe (no directory traversal)
   * @param {string} filePath - Path to check
   * @param {string} basePath - Base directory
   * @returns {boolean} True if path is safe
   */
  isPathSafe(filePath, basePath) {
    return PathUtils.isPathSafe(filePath, basePath)
  }
  
  /**
   * Get normalized cross-platform path
   * @param {string} filePath - Path to normalize
   * @returns {string} Normalized path
   */
  normalizePath(filePath) {
    return PathUtils.normalize(filePath)
  }
  
  /**
   * Get file information
   * @param {string} filePath - File path
   * @returns {Promise<Object>} File information
   */
  async getFileInfo(filePath) {
    const normalizedPath = PathUtils.normalize(filePath)
    
    try {
      const stats = await fs.stat(normalizedPath)
      
      return {
        path: normalizedPath,
        size: stats.size,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
        created: stats.birthtime,
        modified: stats.mtime,
        accessed: stats.atime,
        extension: PathUtils.getExtension(normalizedPath)
      }
    } catch (error) {
      throw new Error(`Failed to get file info: ${error.message}`)
    }
  }
  
  /**
   * Check if file/directory exists
   * @param {string} filePath - Path to check
   * @returns {Promise<boolean>} True if exists
   */
  async exists(filePath) {
    try {
      await fs.access(PathUtils.normalize(filePath))
      return true
    } catch {
      return false
    }
  }
  
  /**
   * Get temporary files information
   * @returns {Array} Array of temporary file info
   */
  getTempFilesInfo() {
    return this.tempManager.getTempFilesInfo()
  }
  
  /**
   * Clean up all resources
   */
  async cleanup() {
    await this.tempManager.cleanupAll()
    this.tempManager.stopCleanupTimer()
  }
}

// Create singleton instance
export const fileService = new FileService()

// Export utilities for direct use
export { PathUtils, FileValidator }