/**
 * Notification Service
 * 
 * Provides comprehensive notification system with:
 * - Success notifications with detailed statistics
 * - Error notifications with recovery suggestions
 * - Progress notifications for long operations
 * - Customizable notification display and behavior
 * - Notification history and management
 */

import { ProgressUtils } from './progressTrackingService.js'

/**
 * Notification types
 */
export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
  PROGRESS: 'progress'
}

/**
 * Notification priorities
 */
export const NOTIFICATION_PRIORITIES = {
  LOW: 1,
  NORMAL: 2,
  HIGH: 3,
  URGENT: 4
}

/**
 * Notification display positions
 */
export const NOTIFICATION_POSITIONS = {
  TOP_RIGHT: 'top-right',
  TOP_LEFT: 'top-left',
  TOP_CENTER: 'top-center',
  BOTTOM_RIGHT: 'bottom-right',
  BOTTOM_LEFT: 'bottom-left',
  BOTTOM_CENTER: 'bottom-center'
}

/**
 * Notification class with comprehensive information
 */
export class Notification {
  constructor(options = {}) {
    this.id = this._generateId()
    this.type = options.type || NOTIFICATION_TYPES.INFO
    this.priority = options.priority || NOTIFICATION_PRIORITIES.NORMAL
    this.title = options.title || ''
    this.message = options.message || ''
    this.details = options.details || null
    this.statistics = options.statistics || null
    this.actions = options.actions || []
    this.timestamp = Date.now()
    this.duration = options.duration !== undefined ? options.duration : this._getDefaultDuration()
    this.persistent = options.persistent || false
    this.dismissible = options.dismissible !== false
    this.icon = options.icon || this._getDefaultIcon()
    this.progress = options.progress || null
    this.metadata = options.metadata || {}
    
    // State
    this.dismissed = false
    this.seen = false
    this.interacted = false
  }
  
  /**
   * Update notification content
   * @param {Object} updates - Updates to apply
   */
  update(updates) {
    Object.keys(updates).forEach(key => {
      if (key !== 'id' && key !== 'timestamp') {
        this[key] = updates[key]
      }
    })
  }
  
  /**
   * Mark notification as seen
   */
  markAsSeen() {
    this.seen = true
  }
  
  /**
   * Mark notification as interacted
   */
  markAsInteracted() {
    this.interacted = true
  }
  
  /**
   * Dismiss notification
   */
  dismiss() {
    if (this.dismissible) {
      this.dismissed = true
      return true
    }
    return false
  }
  
  /**
   * Get notification data for display
   * @returns {Object} Display data
   */
  getDisplayData() {
    return {
      id: this.id,
      type: this.type,
      priority: this.priority,
      title: this.title,
      message: this.message,
      details: this.details,
      statistics: this.statistics,
      actions: this.actions,
      timestamp: this.timestamp,
      duration: this.duration,
      persistent: this.persistent,
      dismissible: this.dismissible,
      icon: this.icon,
      progress: this.progress,
      dismissed: this.dismissed,
      seen: this.seen,
      interacted: this.interacted
    }
  }
  
  /**
   * Generate unique notification ID
   * @private
   */
  _generateId() {
    return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  /**
   * Get default duration based on type
   * @private
   */
  _getDefaultDuration() {
    const durations = {
      [NOTIFICATION_TYPES.SUCCESS]: 5000,
      [NOTIFICATION_TYPES.ERROR]: 0, // Persistent
      [NOTIFICATION_TYPES.WARNING]: 8000,
      [NOTIFICATION_TYPES.INFO]: 4000,
      [NOTIFICATION_TYPES.PROGRESS]: 0 // Persistent until updated
    }
    
    return durations[this.type] || 4000
  }
  
  /**
   * Get default icon based on type
   * @private
   */
  _getDefaultIcon() {
    const icons = {
      [NOTIFICATION_TYPES.SUCCESS]: '✅',
      [NOTIFICATION_TYPES.ERROR]: '❌',
      [NOTIFICATION_TYPES.WARNING]: '⚠️',
      [NOTIFICATION_TYPES.INFO]: 'ℹ️',
      [NOTIFICATION_TYPES.PROGRESS]: '⏳'
    }
    
    return icons[this.type] || 'ℹ️'
  }
}

/**
 * Notification Service for managing all notifications
 */
export class NotificationService {
  constructor() {
    this.notifications = new Map()
    this.listeners = new Map()
    this.history = []
    this.maxHistory = 500
    this.maxActiveNotifications = 20
    
    // Configuration
    this.config = {
      position: NOTIFICATION_POSITIONS.TOP_RIGHT,
      enableSounds: true,
      enableDesktopNotifications: true,
      showStatistics: true,
      autoCleanup: true,
      cleanupInterval: 300000 // 5 minutes
    }
    
    // Start cleanup timer
    if (this.config.autoCleanup) {
      this._startCleanupTimer()
    }
  }
  
  /**
   * Show success notification with statistics
   * @param {string} title - Notification title
   * @param {string} message - Notification message
   * @param {Object} statistics - Operation statistics
   * @param {Object} options - Additional options
   * @returns {Notification} Created notification
   */
  showSuccess(title, message, statistics = null, options = {}) {
    const notification = new Notification({
      type: NOTIFICATION_TYPES.SUCCESS,
      title,
      message,
      statistics,
      priority: NOTIFICATION_PRIORITIES.NORMAL,
      ...options
    })
    
    // Add default success actions
    if (!options.actions) {
      notification.actions = this._getSuccessActions(statistics)
    }
    
    this._addNotification(notification)
    
    // Show desktop notification if enabled
    if (this.config.enableDesktopNotifications) {
      this._showDesktopNotification(notification)
    }
    
    return notification
  }
  
  /**
   * Show compression success notification
   * @param {Object} compressionResult - Compression operation result
   * @returns {Notification} Created notification
   */
  showCompressionSuccess(compressionResult) {
    const statistics = {
      filesProcessed: compressionResult.filesProcessed,
      originalSize: compressionResult.totalSize,
      compressedSize: compressionResult.compressedSize || 0,
      compressionRatio: 0,
      format: compressionResult.format,
      duration: compressionResult.duration || 0,
      averageSpeed: compressionResult.averageSpeed || 0
    }
    
    if (statistics.originalSize > 0 && statistics.compressedSize > 0) {
      statistics.compressionRatio = ((statistics.originalSize - statistics.compressedSize) / statistics.originalSize * 100)
    }
    
    const title = '压缩成功'
    let message = `成功压缩 ${statistics.filesProcessed} 个文件为 ${statistics.format.toUpperCase()} 格式`
    
    if (statistics.compressionRatio > 0) {
      message += `，压缩率 ${statistics.compressionRatio.toFixed(1)}%`
    }
    
    return this.showSuccess(title, message, statistics, {
      details: {
        originalSize: ProgressUtils.formatFileSize(statistics.originalSize),
        compressedSize: ProgressUtils.formatFileSize(statistics.compressedSize),
        savedSpace: ProgressUtils.formatFileSize(statistics.originalSize - statistics.compressedSize),
        duration: ProgressUtils.formatDuration(statistics.duration),
        averageSpeed: ProgressUtils.formatSpeed(statistics.averageSpeed)
      }
    })
  }
  
  /**
   * Show decompression success notification
   * @param {Object} decompressionResult - Decompression operation result
   * @returns {Notification} Created notification
   */
  showDecompressionSuccess(decompressionResult) {
    const statistics = {
      filesExtracted: decompressionResult.filesExtracted,
      totalSize: decompressionResult.totalSize,
      format: decompressionResult.format,
      duration: decompressionResult.duration || 0,
      averageSpeed: decompressionResult.averageSpeed || 0,
      outputPath: decompressionResult.outputDir
    }
    
    const title = '解压成功'
    const message = `成功解压 ${statistics.filesExtracted} 个文件，总大小 ${ProgressUtils.formatFileSize(statistics.totalSize)}`
    
    return this.showSuccess(title, message, statistics, {
      details: {
        extractedFiles: statistics.filesExtracted,
        totalSize: ProgressUtils.formatFileSize(statistics.totalSize),
        duration: ProgressUtils.formatDuration(statistics.duration),
        averageSpeed: ProgressUtils.formatSpeed(statistics.averageSpeed),
        outputPath: statistics.outputPath
      }
    })
  }
  
  /**
   * Show error notification
   * @param {string} title - Error title
   * @param {string} message - Error message
   * @param {Object} error - Error object
   * @param {Object} options - Additional options
   * @returns {Notification} Created notification
   */
  showError(title, message, error = null, options = {}) {
    const notification = new Notification({
      type: NOTIFICATION_TYPES.ERROR,
      title,
      message,
      details: error ? {
        code: error.code,
        suggestion: error.suggestion,
        originalMessage: error.originalError?.message
      } : null,
      priority: NOTIFICATION_PRIORITIES.HIGH,
      persistent: true,
      duration: 0,
      ...options
    })
    
    // Add error-specific actions
    if (!options.actions) {
      notification.actions = this._getErrorActions(error)
    }
    
    this._addNotification(notification)
    
    // Show desktop notification for errors
    if (this.config.enableDesktopNotifications) {
      this._showDesktopNotification(notification)
    }
    
    return notification
  }
  
  /**
   * Show warning notification
   * @param {string} title - Warning title
   * @param {string} message - Warning message
   * @param {Object} options - Additional options
   * @returns {Notification} Created notification
   */
  showWarning(title, message, options = {}) {
    const notification = new Notification({
      type: NOTIFICATION_TYPES.WARNING,
      title,
      message,
      priority: NOTIFICATION_PRIORITIES.NORMAL,
      ...options
    })
    
    this._addNotification(notification)
    return notification
  }
  
  /**
   * Show info notification
   * @param {string} title - Info title
   * @param {string} message - Info message
   * @param {Object} options - Additional options
   * @returns {Notification} Created notification
   */
  showInfo(title, message, options = {}) {
    const notification = new Notification({
      type: NOTIFICATION_TYPES.INFO,
      title,
      message,
      priority: NOTIFICATION_PRIORITIES.LOW,
      ...options
    })
    
    this._addNotification(notification)
    return notification
  }
  
  /**
   * Show or update progress notification
   * @param {string} operationId - Operation identifier
   * @param {string} title - Progress title
   * @param {string} message - Progress message
   * @param {number} percentage - Progress percentage
   * @param {Object} options - Additional options
   * @returns {Notification} Created or updated notification
   */
  showProgress(operationId, title, message, percentage, options = {}) {
    const existingNotification = Array.from(this.notifications.values())
      .find(n => n.metadata.operationId === operationId && n.type === NOTIFICATION_TYPES.PROGRESS)
    
    if (existingNotification) {
      // Update existing progress notification
      existingNotification.update({
        title,
        message,
        progress: { percentage },
        ...options
      })
      
      this._emitEvent('notification:updated', existingNotification.getDisplayData())
      return existingNotification
    } else {
      // Create new progress notification
      const notification = new Notification({
        type: NOTIFICATION_TYPES.PROGRESS,
        title,
        message,
        progress: { percentage },
        persistent: true,
        duration: 0,
        metadata: { operationId },
        ...options
      })
      
      this._addNotification(notification)
      return notification
    }
  }
  
  /**
   * Complete progress notification
   * @param {string} operationId - Operation identifier
   */
  completeProgress(operationId) {
    const progressNotification = Array.from(this.notifications.values())
      .find(n => n.metadata.operationId === operationId && n.type === NOTIFICATION_TYPES.PROGRESS)
    
    if (progressNotification) {
      this.dismissNotification(progressNotification.id)
    }
  }
  
  /**
   * Get notification by ID
   * @param {string} notificationId - Notification ID
   * @returns {Notification|null} Notification or null
   */
  getNotification(notificationId) {
    return this.notifications.get(notificationId) || null
  }
  
  /**
   * Get all active notifications
   * @returns {Array} Array of active notifications
   */
  getActiveNotifications() {
    return Array.from(this.notifications.values())
      .filter(n => !n.dismissed)
      .sort((a, b) => b.priority - a.priority || b.timestamp - a.timestamp)
      .map(n => n.getDisplayData())
  }
  
  /**
   * Get notification history
   * @param {number} limit - Number of notifications to return
   * @returns {Array} Notification history
   */
  getHistory(limit = 50) {
    return this.history
      .slice(-limit)
      .reverse()
      .map(n => n.getDisplayData())
  }
  
  /**
   * Dismiss notification
   * @param {string} notificationId - Notification ID to dismiss
   * @returns {boolean} True if dismissed successfully
   */
  dismissNotification(notificationId) {
    const notification = this.notifications.get(notificationId)
    
    if (notification && notification.dismiss()) {
      this._emitEvent('notification:dismissed', notification.getDisplayData())
      
      // Move to history if not already there
      if (!this.history.find(n => n.id === notificationId)) {
        this.history.push(notification)
        this._trimHistory()
      }
      
      // Remove from active notifications after a delay
      setTimeout(() => {
        this.notifications.delete(notificationId)
      }, 1000)
      
      return true
    }
    
    return false
  }
  
  /**
   * Dismiss all notifications
   */
  dismissAllNotifications() {
    const notifications = Array.from(this.notifications.values())
    
    notifications.forEach(notification => {
      this.dismissNotification(notification.id)
    })
  }
  
  /**
   * Clear notification history
   */
  clearHistory() {
    this.history = []
    this._emitEvent('notification:history_cleared')
  }
  
  /**
   * Add event listener
   * @param {string} eventType - Event type
   * @param {Function} callback - Callback function
   */
  addEventListener(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, [])
    }
    this.listeners.get(eventType).push(callback)
  }
  
  /**
   * Remove event listener
   * @param {string} eventType - Event type
   * @param {Function} callback - Callback to remove
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
   * Update configuration
   * @param {Object} newConfig - New configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig }
  }
  
  /**
   * Get notification statistics
   * @returns {Object} Notification statistics
   */
  getStatistics() {
    const notifications = Array.from(this.notifications.values()).concat(this.history)
    
    return {
      total: notifications.length,
      active: this.notifications.size,
      dismissed: notifications.filter(n => n.dismissed).length,
      byType: {
        success: notifications.filter(n => n.type === NOTIFICATION_TYPES.SUCCESS).length,
        error: notifications.filter(n => n.type === NOTIFICATION_TYPES.ERROR).length,
        warning: notifications.filter(n => n.type === NOTIFICATION_TYPES.WARNING).length,
        info: notifications.filter(n => n.type === NOTIFICATION_TYPES.INFO).length,
        progress: notifications.filter(n => n.type === NOTIFICATION_TYPES.PROGRESS).length
      },
      interactions: {
        seen: notifications.filter(n => n.seen).length,
        interacted: notifications.filter(n => n.interacted).length
      }
    }
  }
  
  /**
   * Add notification to active list
   * @private
   */
  _addNotification(notification) {
    // Remove old notifications if limit exceeded
    if (this.notifications.size >= this.maxActiveNotifications) {
      this._cleanupOldNotifications()
    }
    
    this.notifications.set(notification.id, notification)
    
    // Auto dismiss non-persistent notifications
    if (!notification.persistent && notification.duration > 0) {
      setTimeout(() => {
        this.dismissNotification(notification.id)
      }, notification.duration)
    }
    
    this._emitEvent('notification:created', notification.getDisplayData())
    
    return notification
  }
  
  /**
   * Get default success actions
   * @private
   */
  _getSuccessActions(statistics) {
    const actions = [
      {
        label: '查看详情',
        action: 'view_details',
        primary: false
      }
    ]
    
    if (statistics && statistics.outputPath) {
      actions.unshift({
        label: '打开文件夹',
        action: 'open_folder',
        primary: true
      })
    }
    
    return actions
  }
  
  /**
   * Get default error actions
   * @private
   */
  _getErrorActions(error) {
    const actions = [
      {
        label: '重试',
        action: 'retry',
        primary: true
      },
      {
        label: '查看详情',
        action: 'view_details',
        primary: false
      }
    ]
    
    if (error && error.suggestion) {
      actions.splice(1, 0, {
        label: '查看建议',
        action: 'view_suggestion',
        primary: false
      })
    }
    
    return actions
  }
  
  /**
   * Emit event to listeners
   * @private
   */
  _emitEvent(eventType, data) {
    const callbacks = this.listeners.get(eventType) || []
    callbacks.forEach(callback => {
      try {
        callback(data)
      } catch (error) {
        console.error(`Error in notification event listener for ${eventType}:`, error)
      }
    })
  }
  
  /**
   * Show desktop notification if supported
   * @private
   */
  _showDesktopNotification(notification) {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
      return
    }
    
    try {
      const desktopNotification = new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico', // Adjust path as needed
        badge: '/favicon.ico',
        tag: notification.id
      })
      
      desktopNotification.onclick = () => {
        window.focus()
        notification.markAsInteracted()
      }
      
    } catch (error) {
      console.warn('Failed to show desktop notification:', error)
    }
  }
  
  /**
   * Clean up old notifications
   * @private
   */
  _cleanupOldNotifications() {
    const cutoffTime = Date.now() - 300000 // 5 minutes ago
    const toRemove = []
    
    for (const [id, notification] of this.notifications.entries()) {
      if (notification.dismissed && notification.timestamp < cutoffTime) {
        toRemove.push(id)
      }
    }
    
    toRemove.forEach(id => this.notifications.delete(id))
  }
  
  /**
   * Trim notification history to max size
   * @private
   */
  _trimHistory() {
    if (this.history.length > this.maxHistory) {
      this.history = this.history.slice(-this.maxHistory)
    }
  }
  
  /**
   * Start cleanup timer for dismissed notifications
   * @private
   */
  _startCleanupTimer() {
    setInterval(() => {
      this._cleanupOldNotifications()
    }, this.config.cleanupInterval)
  }
}

//  and export singleton instance
export const notificationService = new NotificationService()

// Request desktop notification permission on load
if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
  Notification.requestPermission().catch(error => {
    console.warn('Desktop notification permission denied:', error)
  })
}