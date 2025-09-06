/**
 * Operation Cancellation Service
 * 
 * Provides comprehensive operation cancellation with:
 * - Safe operation interruption
 * - Resource cleanup and recovery
 * - Partial result preservation
 * - Cleanup confirmation and rollback
 * - Graceful cancellation with user feedback
 */

import { errorHandlingService, ERROR_CODES } from './errorHandlingService.js'
import { progressTrackingService } from './progressTrackingService.js'

/**
 * Cancellation reasons for better user feedback
 */
export const CANCELLATION_REASONS = {
  USER_REQUESTED: 'user_requested',
  TIMEOUT: 'timeout',
  ERROR: 'error',
  SYSTEM_SHUTDOWN: 'system_shutdown',
  RESOURCE_LIMIT: 'resource_limit',
  INVALID_STATE: 'invalid_state'
}

/**
 * Cleanup strategies for different operation types
 */
export const CLEANUP_STRATEGIES = {
  IMMEDIATE: 'immediate',     // Clean up immediately
  PRESERVE_PARTIAL: 'preserve_partial', // Keep partial results
  USER_CHOICE: 'user_choice', // Ask user what to do
  BACKGROUND: 'background'    // Clean up in background
}

/**
 * Operation state management
 */
export const OPERATION_STATES = {
  INITIALIZING: 'initializing',
  RUNNING: 'running',
  PAUSED: 'paused',
  CANCELLING: 'cancelling',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
  FAILED: 'failed'
}

/**
 * Cancellable Operation class to track operation state and resources
 */
export class CancellableOperation {
  constructor(operationId, operationType, options = {}) {
    this.operationId = operationId
    this.operationType = operationType
    this.state = OPERATION_STATES.INITIALIZING
    this.startTime = Date.now()
    this.endTime = null
    
    // Cancellation handling
    this.abortController = new AbortController()
    this.cancellationReason = null
    this.cancellationCallbacks = []
    this.cleanupCallbacks = []
    
    // Resource tracking
    this.resources = {
      tempFiles: [],
      tempDirectories: [],
      openStreams: [],
      processes: [],
      locks: []
    }
    
    // Progress and statistics
    this.partialResults = null
    this.cleanupStrategy = options.cleanupStrategy || CLEANUP_STRATEGIES.IMMEDIATE
    this.preservePartial = options.preservePartial || false
    this.maxCancellationTime = options.maxCancellationTime || 30000 // 30 seconds
    
    // Metadata
    this.metadata = {
      ...options.metadata,
      created: Date.now(),
      lastActivity: Date.now()
    }
  }
  
  /**
   * Get abort signal for operation cancellation
   * @returns {AbortSignal} Abort signal
   */
  getAbortSignal() {
    return this.abortController.signal
  }
  
  /**
   * Check if operation is cancelled
   * @returns {boolean} True if cancelled
   */
  isCancelled() {
    return this.abortController.signal.aborted || this.state === OPERATION_STATES.CANCELLED
  }
  
  /**
   * Check if operation can be cancelled
   * @returns {boolean} True if can be cancelled
   */
  canBeCancelled() {
    const cancellableStates = [
      OPERATION_STATES.INITIALIZING,
      OPERATION_STATES.RUNNING,
      OPERATION_STATES.PAUSED
    ]
    return cancellableStates.includes(this.state)
  }
  
  /**
   * Update operation state
   * @param {string} newState - New operation state
   */
  setState(newState) {
    const previousState = this.state
    this.state = newState
    this.metadata.lastActivity = Date.now()
    
    console.log(`Operation ${this.operationId} state changed: ${previousState} → ${newState}`)
  }
  
  /**
   * Add cancellation callback
   * @param {Function} callback - Callback to execute on cancellation
   */
  onCancellation(callback) {
    this.cancellationCallbacks.push(callback)
  }
  
  /**
   * Add cleanup callback
   * @param {Function} callback - Cleanup callback
   */
  onCleanup(callback) {
    this.cleanupCallbacks.push(callback)
  }
  
  /**
   * Register a resource for cleanup
   * @param {string} type - Resource type (tempFiles, openStreams, etc.)
   * @param {*} resource - Resource to register
   */
  registerResource(type, resource) {
    if (!this.resources[type]) {
      this.resources[type] = []
    }
    this.resources[type].push(resource)
  }
  
  /**
   * Update partial results
   * @param {*} results - Partial results to preserve
   */
  updatePartialResults(results) {
    this.partialResults = results
    this.metadata.lastActivity = Date.now()
  }
  
  /**
   * Cancel the operation
   * @param {string} reason - Cancellation reason
   * @param {Object} details - Additional cancellation details
   * @returns {Promise<Object>} Cancellation result
   */
  async cancel(reason = CANCELLATION_REASONS.USER_REQUESTED, details = {}) {
    if (!this.canBeCancelled()) {
      throw new Error(`Cannot cancel operation in state: ${this.state}`)
    }
    
    console.log(`Cancelling operation ${this.operationId} - Reason: ${reason}`)
    
    this.setState(OPERATION_STATES.CANCELLING)
    this.cancellationReason = reason
    
    const cancellationStart = Date.now()
    
    try {
      // Signal cancellation to all abort signals
      this.abortController.abort()
      
      // Execute cancellation callbacks
      const cancellationPromises = this.cancellationCallbacks.map(async callback => {
        try {
          await callback(reason, details)
        } catch (error) {
          console.error('Error in cancellation callback:', error)
        }
      })
      
      // Wait for cancellation callbacks with timeout
      await Promise.race([
        Promise.allSettled(cancellationPromises),
        new Promise(resolve => setTimeout(resolve, this.maxCancellationTime))
      ])
      
      // Perform cleanup based on strategy
      const cleanupResult = await this._performCleanup(reason, details)
      
      this.setState(OPERATION_STATES.CANCELLED)
      this.endTime = Date.now()
      
      const result = {
        success: true,
        operationId: this.operationId,
        reason: reason,
        details: details,
        cleanupResult: cleanupResult,
        partialResults: this.preservePartial ? this.partialResults : null,
        cancellationTime: Date.now() - cancellationStart,
        totalTime: this.endTime - this.startTime
      }
      
      console.log(`Operation ${this.operationId} cancelled successfully in ${result.cancellationTime}ms`)
      
      return result
      
    } catch (error) {
      console.error(`Error cancelling operation ${this.operationId}:`, error)
      
      this.setState(OPERATION_STATES.FAILED)
      this.endTime = Date.now()
      
      throw errorHandlingService.createError(
        ERROR_CODES.OPERATION_CANCELLED,
        {
          operationId: this.operationId,
          reason: reason,
          cancellationTime: Date.now() - cancellationStart
        },
        error
      )
    }
  }
  
  /**
   * Force immediate cancellation (emergency stop)
   * @returns {Promise<Object>} Force cancellation result
   */
  async forceCancel() {
    console.warn(`Force cancelling operation ${this.operationId}`)
    
    // Immediately abort all operations
    this.abortController.abort()
    this.setState(OPERATION_STATES.CANCELLED)
    this.endTime = Date.now()
    
    // Attempt cleanup in background
    setTimeout(async () => {
      try {
        await this._performCleanup(CANCELLATION_REASONS.ERROR, { force: true })
      } catch (error) {
        console.error('Error in force cleanup:', error)
      }
    }, 0)
    
    return {
      success: true,
      operationId: this.operationId,
      reason: CANCELLATION_REASONS.ERROR,
      forced: true,
      totalTime: this.endTime - this.startTime
    }
  }
  
  /**
   * Get operation summary
   * @returns {Object} Operation summary
   */
  getSummary() {
    return {
      operationId: this.operationId,
      operationType: this.operationType,
      state: this.state,
      startTime: this.startTime,
      endTime: this.endTime,
      duration: this.endTime ? this.endTime - this.startTime : Date.now() - this.startTime,
      cancelled: this.isCancelled(),
      cancellationReason: this.cancellationReason,
      hasPartialResults: !!this.partialResults,
      resourceCount: Object.values(this.resources).reduce((sum, arr) => sum + arr.length, 0),
      metadata: this.metadata
    }
  }
  
  /**
   * Perform cleanup based on strategy
   * @private
   */
  async _performCleanup(reason, details) {
    const cleanupStart = Date.now()
    const results = {
      strategy: this.cleanupStrategy,
      tempFilesCleanup: 0,
      tempDirectoriesCleanup: 0,
      streamsCleanup: 0,
      processesCleanup: 0,
      errors: []
    }
    
    try {
      // Execute custom cleanup callbacks first
      const cleanupPromises = this.cleanupCallbacks.map(async callback => {
        try {
          await callback(reason, details)
        } catch (error) {
          results.errors.push({
            type: 'callback',
            error: error.message
          })
          console.error('Error in cleanup callback:', error)
        }
      })
      
      await Promise.allSettled(cleanupPromises)
      
      // Clean up resources based on strategy
      if (this.cleanupStrategy === CLEANUP_STRATEGIES.IMMEDIATE || details.force) {
        await this._cleanupAllResources(results)
      } else if (this.cleanupStrategy === CLEANUP_STRATEGIES.BACKGROUND) {
        // Schedule background cleanup
        setTimeout(() => this._cleanupAllResources(results), 1000)
      }
      // For PRESERVE_PARTIAL and USER_CHOICE, cleanup is handled elsewhere
      
    } catch (error) {
      results.errors.push({
        type: 'cleanup',
        error: error.message
      })
      console.error('Error during cleanup:', error)
    }
    
    results.cleanupTime = Date.now() - cleanupStart
    return results
  }
  
  /**
   * Clean up all registered resources
   * @private
   */
  async _cleanupAllResources(results) {
    // Clean up temporary files
    for (const tempFile of this.resources.tempFiles) {
      try {
        const fs = await import('fs/promises')
        await fs.unlink(tempFile)
        results.tempFilesCleanup++
      } catch (error) {
        results.errors.push({
          type: 'tempFile',
          resource: tempFile,
          error: error.message
        })
      }
    }
    
    // Clean up temporary directories
    for (const tempDir of this.resources.tempDirectories) {
      try {
        const fs = await import('fs/promises')
        await fs.rm(tempDir, { recursive: true, force: true })
        results.tempDirectoriesCleanup++
      } catch (error) {
        results.errors.push({
          type: 'tempDirectory',
          resource: tempDir,
          error: error.message
        })
      }
    }
    
    // Close open streams
    for (const stream of this.resources.openStreams) {
      try {
        if (stream && typeof stream.destroy === 'function') {
          stream.destroy()
        } else if (stream && typeof stream.close === 'function') {
          stream.close()
        }
        results.streamsCleanup++
      } catch (error) {
        results.errors.push({
          type: 'stream',
          error: error.message
        })
      }
    }
    
    // Terminate processes
    for (const process of this.resources.processes) {
      try {
        if (process && typeof process.kill === 'function') {
          process.kill()
        }
        results.processesCleanup++
      } catch (error) {
        results.errors.push({
          type: 'process',
          error: error.message
        })
      }
    }
  }
}

/**
 * Operation Cancellation Service
 */
export class OperationCancellationService {
  constructor() {
    this.operations = new Map()
    this.cleanupQueue = []
    this.cleanupInterval = null
    this.maxOperations = 100
    
    // Start background cleanup
    this._startBackgroundCleanup()
    
    // Handle process cleanup
    if (typeof process !== 'undefined') {
      process.on('beforeExit', () => this.cancelAllOperations())
      process.on('SIGINT', () => this.cancelAllOperations())
      process.on('SIGTERM', () => this.cancelAllOperations())
    }
  }
  
  /**
   * Create a new cancellable operation
   * @param {string} operationId - Unique operation identifier
   * @param {string} operationType - Type of operation
   * @param {Object} options - Operation options
   * @returns {CancellableOperation} Cancellable operation instance
   */
  createOperation(operationId, operationType, options = {}) {
    if (this.operations.has(operationId)) {
      throw new Error(`Operation ${operationId} already exists`)
    }
    
    // Clean up old operations if needed
    if (this.operations.size >= this.maxOperations) {
      this._cleanupOldOperations()
    }
    
    const operation = new CancellableOperation(operationId, operationType, options)
    this.operations.set(operationId, operation)
    
    // Start progress tracking
    progressTrackingService.startOperation(operationId, operationType, options)
    
    console.log(`Created cancellable operation: ${operationId} (${operationType})`)
    
    return operation
  }
  
  /**
   * Get operation by ID
   * @param {string} operationId - Operation identifier
   * @returns {CancellableOperation|null} Operation or null if not found
   */
  getOperation(operationId) {
    return this.operations.get(operationId) || null
  }
  
  /**
   * Cancel specific operation
   * @param {string} operationId - Operation to cancel
   * @param {string} reason - Cancellation reason
   * @param {Object} details - Additional details
   * @returns {Promise<Object>} Cancellation result
   */
  async cancelOperation(operationId, reason = CANCELLATION_REASONS.USER_REQUESTED, details = {}) {
    const operation = this.operations.get(operationId)
    
    if (!operation) {
      throw errorHandlingService.createError(
        ERROR_CODES.INVALID_OPERATION,
        { operationId, reason: 'Operation not found' }
      )
    }
    
    try {
      const result = await operation.cancel(reason, details)
      
      // Update progress tracking
      progressTrackingService.cancelOperation(operationId)
      
      // Schedule for cleanup if needed
      if (operation.cleanupStrategy === CLEANUP_STRATEGIES.BACKGROUND) {
        this.cleanupQueue.push({
          operationId,
          scheduledAt: Date.now(),
          cleanupAfter: Date.now() + 60000 // Clean up after 1 minute
        })
      }
      
      return result
      
    } catch (error) {
      progressTrackingService.failOperation(operationId, error)
      throw error
    }
  }
  
  /**
   * Force cancel operation (emergency stop)
   * @param {string} operationId - Operation to force cancel
   * @returns {Promise<Object>} Force cancellation result
   */
  async forceCancelOperation(operationId) {
    const operation = this.operations.get(operationId)
    
    if (!operation) {
      throw errorHandlingService.createError(
        ERROR_CODES.INVALID_OPERATION,
        { operationId, reason: 'Operation not found' }
      )
    }
    
    const result = await operation.forceCancel()
    
    // Update progress tracking
    progressTrackingService.cancelOperation(operationId)
    
    return result
  }
  
  /**
   * Cancel all active operations
   * @param {string} reason - Cancellation reason
   * @returns {Promise<Array>} Array of cancellation results
   */
  async cancelAllOperations(reason = CANCELLATION_REASONS.SYSTEM_SHUTDOWN) {
    console.log(`Cancelling all operations - Reason: ${reason}`)
    
    const activeOperations = Array.from(this.operations.values())
      .filter(op => op.canBeCancelled())
    
    if (activeOperations.length === 0) {
      return []
    }
    
    const cancellationPromises = activeOperations.map(async operation => {
      try {
        return await operation.cancel(reason, { batch: true })
      } catch (error) {
        console.error(`Error cancelling operation ${operation.operationId}:`, error)
        return {
          success: false,
          operationId: operation.operationId,
          error: error.message
        }
      }
    })
    
    const results = await Promise.allSettled(cancellationPromises)
    
    // Update progress tracking for all operations
    activeOperations.forEach(op => {
      progressTrackingService.cancelOperation(op.operationId)
    })
    
    console.log(`Cancelled ${results.length} operations`)
    
    return results.map(result => result.status === 'fulfilled' ? result.value : result.reason)
  }
  
  /**
   * Get all active operations
   * @returns {Array} Array of active operations
   */
  getActiveOperations() {
    return Array.from(this.operations.values())
      .filter(op => [
        OPERATION_STATES.INITIALIZING,
        OPERATION_STATES.RUNNING,
        OPERATION_STATES.PAUSED,
        OPERATION_STATES.CANCELLING
      ].includes(op.state))
      .map(op => op.getSummary())
  }
  
  /**
   * Get operation statistics
   * @returns {Object} Operation statistics
   */
  getOperationStats() {
    const operations = Array.from(this.operations.values())
    
    return {
      total: operations.length,
      active: operations.filter(op => op.canBeCancelled()).length,
      cancelled: operations.filter(op => op.state === OPERATION_STATES.CANCELLED).length,
      completed: operations.filter(op => op.state === OPERATION_STATES.COMPLETED).length,
      failed: operations.filter(op => op.state === OPERATION_STATES.FAILED).length,
      cleanupQueue: this.cleanupQueue.length
    }
  }
  
  /**
   * Check if any operations are running
   * @returns {boolean} True if any operations are active
   */
  hasActiveOperations() {
    return Array.from(this.operations.values()).some(op => op.canBeCancelled())
  }
  
  /**
   * Start background cleanup process
   * @private
   */
  _startBackgroundCleanup() {
    if (this.cleanupInterval) return
    
    this.cleanupInterval = setInterval(() => {
      this._processCleanupQueue()
      this._cleanupOldOperations()
    }, 30000) // Run every 30 seconds
    
    // Don't keep process alive for cleanup
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref()
    }
  }
  
  /**
   * Process scheduled cleanup queue
   * @private
   */
  _processCleanupQueue() {
    const now = Date.now()
    const toCleanup = this.cleanupQueue.filter(item => item.cleanupAfter <= now)
    
    toCleanup.forEach(async item => {
      try {
        const operation = this.operations.get(item.operationId)
        if (operation) {
          await operation._cleanupAllResources({})
          this.operations.delete(item.operationId)
        }
      } catch (error) {
        console.error(`Error in background cleanup for ${item.operationId}:`, error)
      }
    })
    
    // Remove processed items from queue
    this.cleanupQueue = this.cleanupQueue.filter(item => item.cleanupAfter > now)
  }
  
  /**
   * Clean up old completed operations
   * @private
   */
  _cleanupOldOperations() {
    const cutoffTime = Date.now() - 3600000 // 1 hour ago
    const toRemove = []
    
    for (const [operationId, operation] of this.operations.entries()) {
      if (operation.endTime && operation.endTime < cutoffTime) {
        toRemove.push(operationId)
      }
    }
    
    toRemove.forEach(operationId => {
      this.operations.delete(operationId)
    })
    
    if (toRemove.length > 0) {
      console.log(`Cleaned up ${toRemove.length} old operations`)
    }
  }
  
  /**
   * Stop background cleanup and cancel all operations
   */
  async shutdown() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    
    await this.cancelAllOperations(CANCELLATION_REASONS.SYSTEM_SHUTDOWN)
  }
}

// Create and export singleton instance
export const operationCancellationService = new OperationCancellationService()