/**
 * Enhanced Progress Tracking Service
 * 
 * Provides comprehensive progress tracking with:
 * - Real-time progress updates with file information
 * - Detailed statistics (speed, remaining time, etc.)
 * - Progress history for analysis
 * - Event-driven architecture for non-blocking UI
 * - Operation context and metadata
 */

/**
 * Progress event types
 */
export const PROGRESS_EVENTS = {
  STARTED: 'progress:started',
  UPDATED: 'progress:updated', 
  FILE_PROCESSED: 'progress:file_processed',
  COMPLETED: 'progress:completed',
  FAILED: 'progress:failed',
  CANCELLED: 'progress:cancelled'
}

/**
 * Operation types for progress tracking
 */
export const OPERATION_TYPES = {
  COMPRESS: 'compress',
  DECOMPRESS: 'decompress',
  VALIDATE: 'validate',
  ENCRYPT: 'encrypt',
  DECRYPT: 'decrypt'
}

/**
 * Enhanced Progress Information class
 */
export class ProgressInfo {
  constructor(operationId, operationType, options = {}) {
    this.operationId = operationId
    this.operationType = operationType
    this.startTime = Date.now()
    this.lastUpdateTime = this.startTime
    
    // Progress metrics
    this.totalFiles = options.totalFiles || 0
    this.processedFiles = 0
    this.totalSize = options.totalSize || 0
    this.processedSize = 0
    this.currentFile = null
    this.currentFileIndex = 0
    
    // Calculated metrics
    this.percentage = 0
    this.speed = 0 // bytes per second
    this.averageSpeed = 0
    this.remainingTime = 0 // seconds
    this.elapsedTime = 0 // seconds
    
    // Status information
    this.status = 'started'
    this.stage = options.initialStage || 'initializing'
    this.message = options.initialMessage || '准备开始...'
    
    // File processing history
    this.processedFilesList = []
    this.errors = []
    this.warnings = []
    
    // Performance metrics
    this.speedHistory = []
    this.compressionRatio = 0
    this.finalStats = null
  }
  
  /**
   * Update progress with new data
   * @param {Object} updates - Progress updates
   */
  update(updates) {
    const now = Date.now()
    const deltaTime = (now - this.lastUpdateTime) / 1000 // seconds
    
    // Update metrics
    if (updates.processedSize !== undefined) {
      const deltaSize = updates.processedSize - this.processedSize
      this.processedSize = updates.processedSize
      
      // Calculate instantaneous speed
      if (deltaTime > 0 && deltaSize > 0) {
        this.speed = deltaSize / deltaTime
        this.speedHistory.push({
          timestamp: now,
          speed: this.speed,
          size: this.processedSize
        })
        
        // Keep only last 10 speed measurements for average
        if (this.speedHistory.length > 10) {
          this.speedHistory = this.speedHistory.slice(-10)
        }
        
        // Calculate average speed
        if (this.speedHistory.length > 0) {
          const totalSpeed = this.speedHistory.reduce((sum, entry) => sum + entry.speed, 0)
          this.averageSpeed = totalSpeed / this.speedHistory.length
        }
      }
    }
    
    if (updates.processedFiles !== undefined) {
      this.processedFiles = updates.processedFiles
    }
    
    if (updates.currentFile !== undefined) {
      this.currentFile = updates.currentFile
      if (this.currentFile && !this.processedFilesList.find(f => f.name === this.currentFile.name)) {
        this.processedFilesList.push({
          name: this.currentFile.name,
          size: this.currentFile.size,
          timestamp: now,
          index: this.currentFileIndex++
        })
      }
    }
    
    if (updates.stage !== undefined) {
      this.stage = updates.stage
    }
    
    if (updates.message !== undefined) {
      this.message = updates.message
    }
    
    if (updates.status !== undefined) {
      this.status = updates.status
    }
    
    // Calculate derived metrics
    this.elapsedTime = Math.floor((now - this.startTime) / 1000)
    
    if (this.totalSize > 0) {
      this.percentage = Math.min(100, (this.processedSize / this.totalSize) * 100)
      
      // Estimate remaining time based on average speed
      if (this.averageSpeed > 0) {
        const remainingSize = this.totalSize - this.processedSize
        this.remainingTime = Math.ceil(remainingSize / this.averageSpeed)
      }
    } else if (this.totalFiles > 0) {
      this.percentage = Math.min(100, (this.processedFiles / this.totalFiles) * 100)
    }
    
    this.lastUpdateTime = now
  }
  
  /**
   * Add error to progress tracking
   * @param {Object} error - Error information
   */
  addError(error) {
    this.errors.push({
      timestamp: Date.now(),
      error: error,
      context: {
        currentFile: this.currentFile,
        stage: this.stage,
        processedFiles: this.processedFiles
      }
    })
  }
  
  /**
   * Add warning to progress tracking
   * @param {Object} warning - Warning information
   */
  addWarning(warning) {
    this.warnings.push({
      timestamp: Date.now(),
      warning: warning,
      context: {
        currentFile: this.currentFile,
        stage: this.stage
      }
    })
  }
  
  /**
   * Complete progress tracking with final statistics
   * @param {Object} finalStats - Final operation statistics
   */
  complete(finalStats = {}) {
    this.status = 'completed'
    this.percentage = 100
    this.message = '操作完成'
    this.finalStats = {
      ...finalStats,
      totalElapsedTime: this.elapsedTime,
      averageSpeed: this.averageSpeed,
      processedFiles: this.processedFiles,
      processedSize: this.processedSize,
      errors: this.errors.length,
      warnings: this.warnings.length
    }
    
    // Calculate compression ratio if applicable
    if (finalStats.originalSize && finalStats.compressedSize) {
      this.compressionRatio = ((finalStats.originalSize - finalStats.compressedSize) / finalStats.originalSize * 100)
    }
  }
  
  /**
   * Mark progress as failed
   * @param {Object} error - Error that caused failure
   */
  fail(error) {
    this.status = 'failed'
    this.message = '操作失败'
    this.addError(error)
  }
  
  /**
   * Mark progress as cancelled
   */
  cancel() {
    this.status = 'cancelled'
    this.message = '操作已取消'
    this.percentage = Math.min(100, this.percentage) // Keep current progress
  }
  
  /**
   * Get current progress snapshot
   * @returns {Object} Current progress data
   */
  getSnapshot() {
    return {
      operationId: this.operationId,
      operationType: this.operationType,
      status: this.status,
      stage: this.stage,
      message: this.message,
      
      // Progress metrics
      percentage: Math.round(this.percentage * 100) / 100,
      processedFiles: this.processedFiles,
      totalFiles: this.totalFiles,
      processedSize: this.processedSize,
      totalSize: this.totalSize,
      currentFile: this.currentFile,
      
      // Performance metrics
      speed: this.speed,
      averageSpeed: this.averageSpeed,
      elapsedTime: this.elapsedTime,
      remainingTime: this.remainingTime,
      
      // Status information
      errors: this.errors.length,
      warnings: this.warnings.length,
      compressionRatio: this.compressionRatio,
      
      // Timestamps
      startTime: this.startTime,
      lastUpdateTime: this.lastUpdateTime
    }
  }
  
  /**
   * Get detailed progress report
   * @returns {Object} Detailed progress information
   */
  getDetailedReport() {
    return {
      ...this.getSnapshot(),
      processedFilesList: this.processedFilesList,
      speedHistory: this.speedHistory,
      errors: this.errors,
      warnings: this.warnings,
      finalStats: this.finalStats
    }
  }
  
  /**
   * Get user-friendly status message
   * @returns {string} Formatted status message
   */
  getStatusMessage() {
    if (this.status === 'completed') {
      return `✅ 操作成功完成 - 处理了 ${this.processedFiles} 个文件`
    } else if (this.status === 'failed') {
      return `❌ 操作失败 - ${this.errors.length} 个错误`
    } else if (this.status === 'cancelled') {
      return `⏹️ 操作已取消 - 已处理 ${this.processedFiles}/${this.totalFiles} 个文件`
    } else if (this.currentFile) {
      return `📁 正在处理: ${this.currentFile.name} (${this.processedFiles}/${this.totalFiles})`
    } else {
      return this.message
    }
  }
}

/**
 * Enhanced Progress Tracking Service
 */
export class ProgressTrackingService {
  constructor() {
    this.activeOperations = new Map()
    this.completedOperations = new Map()
    this.listeners = new Map()
    this.maxCompletedOperations = 50 // Keep last 50 completed operations
    
    // Performance monitoring
    this.performanceStats = {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      cancelledOperations: 0,
      averageSpeed: 0,
      totalDataProcessed: 0
    }
  }
  
  /**
   * Start tracking a new operation
   * @param {string} operationId - Unique operation identifier
   * @param {string} operationType - Type of operation
   * @param {Object} options - Operation options
   * @returns {ProgressInfo} Progress tracking instance
   */
  startOperation(operationId, operationType, options = {}) {
    if (this.activeOperations.has(operationId)) {
      throw new Error(`Operation ${operationId} is already being tracked`)
    }
    
    const progressInfo = new ProgressInfo(operationId, operationType, options)
    this.activeOperations.set(operationId, progressInfo)
    
    // Emit started event
    this._emitEvent(PROGRESS_EVENTS.STARTED, progressInfo.getSnapshot())
    
    return progressInfo
  }
  
  /**
   * Update operation progress
   * @param {string} operationId - Operation identifier
   * @param {Object} updates - Progress updates
   */
  updateProgress(operationId, updates) {
    const progressInfo = this.activeOperations.get(operationId)
    if (!progressInfo) {
      console.warn(`No active operation found with ID: ${operationId}`)
      return
    }
    
    progressInfo.update(updates)
    
    // Emit update event
    this._emitEvent(PROGRESS_EVENTS.UPDATED, progressInfo.getSnapshot())
    
    // Emit file processed event if a file was completed
    if (updates.currentFile && updates.fileCompleted) {
      this._emitEvent(PROGRESS_EVENTS.FILE_PROCESSED, {
        operationId,
        file: updates.currentFile,
        progress: progressInfo.getSnapshot()
      })
    }
  }
  
  /**
   * Complete operation tracking
   * @param {string} operationId - Operation identifier
   * @param {Object} finalStats - Final operation statistics
   */
  completeOperation(operationId, finalStats = {}) {
    const progressInfo = this.activeOperations.get(operationId)
    if (!progressInfo) {
      console.warn(`No active operation found with ID: ${operationId}`)
      return
    }
    
    progressInfo.complete(finalStats)
    
    // Move to completed operations
    this.activeOperations.delete(operationId)
    this.completedOperations.set(operationId, progressInfo)
    
    // Update performance stats
    this.performanceStats.totalOperations++
    this.performanceStats.successfulOperations++
    this.performanceStats.totalDataProcessed += progressInfo.processedSize
    this._updateAverageSpeed()
    
    // Emit completed event
    this._emitEvent(PROGRESS_EVENTS.COMPLETED, progressInfo.getSnapshot())
    
    // Cleanup old completed operations
    this._cleanupCompletedOperations()
  }
  
  /**
   * Fail operation tracking
   * @param {string} operationId - Operation identifier
   * @param {Object} error - Error that caused failure
   */
  failOperation(operationId, error) {
    const progressInfo = this.activeOperations.get(operationId)
    if (!progressInfo) {
      console.warn(`No active operation found with ID: ${operationId}`)
      return
    }
    
    progressInfo.fail(error)
    
    // Move to completed operations
    this.activeOperations.delete(operationId)
    this.completedOperations.set(operationId, progressInfo)
    
    // Update performance stats
    this.performanceStats.totalOperations++
    this.performanceStats.failedOperations++
    
    // Emit failed event
    this._emitEvent(PROGRESS_EVENTS.FAILED, {
      ...progressInfo.getSnapshot(),
      error: error
    })
    
    this._cleanupCompletedOperations()
  }
  
  /**
   * Cancel operation tracking
   * @param {string} operationId - Operation identifier
   */
  cancelOperation(operationId) {
    const progressInfo = this.activeOperations.get(operationId)
    if (!progressInfo) {
      console.warn(`No active operation found with ID: ${operationId}`)
      return false
    }
    
    progressInfo.cancel()
    
    // Move to completed operations
    this.activeOperations.delete(operationId)
    this.completedOperations.set(operationId, progressInfo)
    
    // Update performance stats
    this.performanceStats.totalOperations++
    this.performanceStats.cancelledOperations++
    
    // Emit cancelled event
    this._emitEvent(PROGRESS_EVENTS.CANCELLED, progressInfo.getSnapshot())
    
    this._cleanupCompletedOperations()
    
    return true
  }
  
  /**
   * Get progress information for an operation
   * @param {string} operationId - Operation identifier
   * @returns {Object|null} Progress snapshot or null if not found
   */
  getProgress(operationId) {
    const progressInfo = this.activeOperations.get(operationId) || 
                        this.completedOperations.get(operationId)
    
    return progressInfo ? progressInfo.getSnapshot() : null
  }
  
  /**
   * Get detailed progress report
   * @param {string} operationId - Operation identifier
   * @returns {Object|null} Detailed progress report or null if not found
   */
  getDetailedProgress(operationId) {
    const progressInfo = this.activeOperations.get(operationId) || 
                        this.completedOperations.get(operationId)
    
    return progressInfo ? progressInfo.getDetailedReport() : null
  }
  
  /**
   * Get all active operations
   * @returns {Array} Array of active operation snapshots
   */
  getActiveOperations() {
    return Array.from(this.activeOperations.values()).map(info => info.getSnapshot())
  }
  
  /**
   * Get recent completed operations
   * @param {number} count - Number of recent operations to return
   * @returns {Array} Array of completed operation snapshots
   */
  getRecentOperations(count = 10) {
    const completed = Array.from(this.completedOperations.values())
      .sort((a, b) => b.startTime - a.startTime)
      .slice(0, count)
    
    return completed.map(info => info.getSnapshot())
  }
  
  /**
   * Get performance statistics
   * @returns {Object} Performance statistics
   */
  getPerformanceStats() {
    return { ...this.performanceStats }
  }
  
  /**
   * Add progress event listener
   * @param {string} eventType - Event type to listen for
   * @param {Function} callback - Callback function
   */
  addEventListener(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, [])
    }
    this.listeners.get(eventType).push(callback)
  }
  
  /**
   * Remove progress event listener
   * @param {string} eventType - Event type
   * @param {Function} callback - Callback function to remove
   */
  removeEventListener(eventType, callback) {
    const callbacks = this.listeners.get(eventType)
    if (callbacks) {
      const index = callbacks.indexOf(callback)
      if (index > -1) {
        callbacks.splice(index, 1)
      }
    }
  }
  
  /**
   * Clear all completed operations
   */
  clearHistory() {
    this.completedOperations.clear()
  }
  
  /**
   * Emit progress event to listeners
   * @private
   */
  _emitEvent(eventType, data) {
    const callbacks = this.listeners.get(eventType) || []
    callbacks.forEach(callback => {
      try {
        callback(data)
      } catch (error) {
        console.error(`Error in progress event listener for ${eventType}:`, error)
      }
    })
  }
  
  /**
   * Update average speed calculation
   * @private
   */
  _updateAverageSpeed() {
    if (this.performanceStats.successfulOperations === 0) {
      this.performanceStats.averageSpeed = 0
      return
    }
    
    const totalTime = Array.from(this.completedOperations.values())
      .filter(op => op.status === 'completed')
      .reduce((sum, op) => sum + op.elapsedTime, 0)
    
    if (totalTime > 0) {
      this.performanceStats.averageSpeed = this.performanceStats.totalDataProcessed / totalTime
    }
  }
  
  /**
   * Clean up old completed operations
   * @private
   */
  _cleanupCompletedOperations() {
    if (this.completedOperations.size <= this.maxCompletedOperations) {
      return
    }
    
    // Sort by start time and keep only the most recent ones
    const sorted = Array.from(this.completedOperations.entries())
      .sort((a, b) => b[1].startTime - a[1].startTime)
    
    this.completedOperations.clear()
    
    // Keep only the most recent operations
    sorted.slice(0, this.maxCompletedOperations).forEach(([id, info]) => {
      this.completedOperations.set(id, info)
    })
  }
}

/**
 * Utility functions for progress display
 */
export class ProgressUtils {
  /**
   * Format file size for display
   * @param {number} bytes - Size in bytes
   * @returns {string} Formatted size string
   */
  static formatFileSize(bytes) {
    if (bytes === 0) return '0 B'
    
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
  
  /**
   * Format duration for display
   * @param {number} seconds - Duration in seconds
   * @returns {string} Formatted duration string
   */
  static formatDuration(seconds) {
    if (seconds < 60) return `${Math.round(seconds)}秒`
    
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    
    if (minutes < 60) {
      return `${minutes}分${Math.round(remainingSeconds)}秒`
    }
    
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    
    return `${hours}小时${remainingMinutes}分`
  }
  
  /**
   * Format speed for display
   * @param {number} bytesPerSecond - Speed in bytes per second
   * @returns {string} Formatted speed string
   */
  static formatSpeed(bytesPerSecond) {
    return this.formatFileSize(bytesPerSecond) + '/秒'
  }
  
  /**
   * Get progress color based on percentage
   * @param {number} percentage - Progress percentage
   * @returns {string} CSS color class or value
   */
  static getProgressColor(percentage) {
    if (percentage < 25) return 'bg-red-500'
    if (percentage < 50) return 'bg-yellow-500'
    if (percentage < 75) return 'bg-blue-500'
    return 'bg-green-500'
  }
  
  /**
   * Calculate ETA (Estimated Time of Arrival)
   * @param {number} processed - Bytes processed
   * @param {number} total - Total bytes
   * @param {number} speed - Current speed in bytes per second
   * @returns {number} ETA in seconds
   */
  static calculateETA(processed, total, speed) {
    if (speed <= 0 || processed >= total) return 0
    
    const remaining = total - processed
    return Math.ceil(remaining / speed)
  }
}

// Create and export singleton instance
export const progressTrackingService = new ProgressTrackingService()