/**
 * Centralized Error Handling Service
 * 
 * Provides comprehensive error handling with:
 * - Specific error codes for different failure scenarios
 * - User-friendly Chinese error messages
 * - Error context and recovery suggestions
 * - Error logging and reporting capabilities
 */

/**
 * Comprehensive error codes for all application scenarios
 */
export const ERROR_CODES = {
  // File System Errors
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  FILE_ACCESS_DENIED: 'FILE_ACCESS_DENIED',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  FILE_CORRUPTED: 'FILE_CORRUPTED',
  FILE_LOCKED: 'FILE_LOCKED',
  DISK_FULL: 'DISK_FULL',
  INVALID_PATH: 'INVALID_PATH',
  
  // Compression Errors
  COMPRESSION_FAILED: 'COMPRESSION_FAILED',
  DECOMPRESSION_FAILED: 'DECOMPRESSION_FAILED',
  UNSUPPORTED_FORMAT: 'UNSUPPORTED_FORMAT',
  CORRUPTED_ARCHIVE: 'CORRUPTED_ARCHIVE',
  ARCHIVE_TOO_LARGE: 'ARCHIVE_TOO_LARGE',
  
  // Security Errors
  INVALID_PASSWORD: 'INVALID_PASSWORD',
  ENCRYPTION_FAILED: 'ENCRYPTION_FAILED',
  DECRYPTION_FAILED: 'DECRYPTION_FAILED',
  UNSAFE_PATH: 'UNSAFE_PATH',
  MALICIOUS_FILE: 'MALICIOUS_FILE',
  
  // Network Errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  CONNECTION_FAILED: 'CONNECTION_FAILED',
  
  // Operation Errors
  OPERATION_CANCELLED: 'OPERATION_CANCELLED',
  OPERATION_TIMEOUT: 'OPERATION_TIMEOUT',
  CONCURRENT_OPERATION: 'CONCURRENT_OPERATION',
  INVALID_OPERATION: 'INVALID_OPERATION',
  
  // System Errors
  INSUFFICIENT_MEMORY: 'INSUFFICIENT_MEMORY',
  SYSTEM_ERROR: 'SYSTEM_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
  
  // User Input Errors
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  
  // Generic Errors
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR'
}

/**
 * Chinese error messages mapping
 */
const ERROR_MESSAGES = {
  [ERROR_CODES.FILE_NOT_FOUND]: {
    title: '文件未找到',
    message: '指定的文件或文件夹不存在',
    suggestion: '请检查文件路径是否正确，或者文件是否已被删除或移动'
  },
  [ERROR_CODES.FILE_ACCESS_DENIED]: {
    title: '文件访问被拒绝',
    message: '没有权限访问此文件或文件夹',
    suggestion: '请检查文件权限，或以管理员身份运行程序'
  },
  [ERROR_CODES.FILE_TOO_LARGE]: {
    title: '文件过大',
    message: '文件大小超出处理限制',
    suggestion: '请选择较小的文件，或者分批处理大文件'
  },
  [ERROR_CODES.FILE_CORRUPTED]: {
    title: '文件已损坏',
    message: '文件内容已损坏，无法正常读取',
    suggestion: '请尝试使用其他工具修复文件，或使用备份文件'
  },
  [ERROR_CODES.FILE_LOCKED]: {
    title: '文件被占用',
    message: '文件正在被其他程序使用',
    suggestion: '请关闭其他正在使用此文件的程序后重试'
  },
  [ERROR_CODES.DISK_FULL]: {
    title: '磁盘空间不足',
    message: '磁盘剩余空间不足以完成操作',
    suggestion: '请清理磁盘空间或选择其他存储位置'
  },
  [ERROR_CODES.INVALID_PATH]: {
    title: '路径无效',
    message: '指定的文件路径格式不正确',
    suggestion: '请检查路径格式，确保使用正确的路径分隔符'
  },
  
  [ERROR_CODES.COMPRESSION_FAILED]: {
    title: '压缩失败',
    message: '文件压缩过程中发生错误',
    suggestion: '请检查源文件完整性，或尝试使用不同的压缩设置'
  },
  [ERROR_CODES.DECOMPRESSION_FAILED]: {
    title: '解压失败',
    message: '文件解压过程中发生错误',
    suggestion: '请检查压缩文件完整性，或确认是否需要密码'
  },
  [ERROR_CODES.UNSUPPORTED_FORMAT]: {
    title: '不支持的格式',
    message: '不支持此压缩格式',
    suggestion: '请使用支持的格式（ZIP、TAR、7Z等）'
  },
  [ERROR_CODES.CORRUPTED_ARCHIVE]: {
    title: '压缩文件损坏',
    message: '压缩文件已损坏或格式不正确',
    suggestion: '请检查压缩文件完整性，或重新下载文件'
  },
  [ERROR_CODES.ARCHIVE_TOO_LARGE]: {
    title: '压缩文件过大',
    message: '压缩文件大小超出处理限制',
    suggestion: '请使用较小的压缩文件，或分卷解压'
  },
  
  [ERROR_CODES.INVALID_PASSWORD]: {
    title: '密码错误',
    message: '提供的密码不正确',
    suggestion: '请检查密码是否正确，注意大小写'
  },
  [ERROR_CODES.ENCRYPTION_FAILED]: {
    title: '加密失败',
    message: '文件加密过程中发生错误',
    suggestion: '请确保密码符合要求，并检查系统加密功能'
  },
  [ERROR_CODES.DECRYPTION_FAILED]: {
    title: '解密失败',
    message: '文件解密过程中发生错误',
    suggestion: '请确认密码正确，并检查文件是否已加密'
  },
  [ERROR_CODES.UNSAFE_PATH]: {
    title: '不安全的路径',
    message: '路径包含不安全的字符或结构',
    suggestion: '请使用安全的文件路径，避免使用特殊字符'
  },
  [ERROR_CODES.MALICIOUS_FILE]: {
    title: '恶意文件',
    message: '文件可能包含恶意内容',
    suggestion: '请确认文件来源安全，或使用杀毒软件扫描'
  },
  
  [ERROR_CODES.NETWORK_ERROR]: {
    title: '网络错误',
    message: '网络连接发生错误',
    suggestion: '请检查网络连接，或稍后重试'
  },
  [ERROR_CODES.TIMEOUT_ERROR]: {
    title: '操作超时',
    message: '操作执行时间超出限制',
    suggestion: '请检查网络状况，或尝试处理较小的文件'
  },
  [ERROR_CODES.CONNECTION_FAILED]: {
    title: '连接失败',
    message: '无法建立网络连接',
    suggestion: '请检查网络设置和防火墙配置'
  },
  
  [ERROR_CODES.OPERATION_CANCELLED]: {
    title: '操作已取消',
    message: '用户取消了当前操作',
    suggestion: '如需继续，请重新开始操作'
  },
  [ERROR_CODES.OPERATION_TIMEOUT]: {
    title: '操作超时',
    message: '操作执行时间过长已自动取消',
    suggestion: '请尝试处理较小的文件，或检查系统性能'
  },
  [ERROR_CODES.CONCURRENT_OPERATION]: {
    title: '操作冲突',
    message: '同时只能执行一个操作',
    suggestion: '请等待当前操作完成后再开始新操作'
  },
  [ERROR_CODES.INVALID_OPERATION]: {
    title: '无效操作',
    message: '当前操作不被允许',
    suggestion: '请检查操作条件是否满足'
  },
  
  [ERROR_CODES.INSUFFICIENT_MEMORY]: {
    title: '内存不足',
    message: '系统内存不足以完成操作',
    suggestion: '请关闭其他程序释放内存，或重启应用程序'
  },
  [ERROR_CODES.SYSTEM_ERROR]: {
    title: '系统错误',
    message: '系统发生未知错误',
    suggestion: '请重启应用程序，或联系技术支持'
  },
  [ERROR_CODES.SERVICE_UNAVAILABLE]: {
    title: '服务不可用',
    message: '所需的系统服务暂时不可用',
    suggestion: '请稍后重试，或重启应用程序'
  },
  [ERROR_CODES.CONFIGURATION_ERROR]: {
    title: '配置错误',
    message: '系统配置存在问题',
    suggestion: '请检查应用程序设置，或重新安装程序'
  },
  
  [ERROR_CODES.INVALID_INPUT]: {
    title: '输入无效',
    message: '提供的输入数据不符合要求',
    suggestion: '请检查输入格式和内容是否正确'
  },
  [ERROR_CODES.MISSING_REQUIRED_FIELD]: {
    title: '缺少必填项',
    message: '请填写所有必需的字段',
    suggestion: '请检查并完成所有标记为必填的字段'
  },
  [ERROR_CODES.VALIDATION_ERROR]: {
    title: '验证失败',
    message: '数据验证未通过',
    suggestion: '请检查输入数据是否符合格式要求'
  },
  
  [ERROR_CODES.UNKNOWN_ERROR]: {
    title: '未知错误',
    message: '发生了未知的错误',
    suggestion: '请重试操作，或联系技术支持'
  },
  [ERROR_CODES.INTERNAL_ERROR]: {
    title: '内部错误',
    message: '应用程序内部发生错误',
    suggestion: '请重启应用程序，如问题持续请联系技术支持'
  }
}

/**
 * Enhanced Application Error class with comprehensive details
 */
export class AppError extends Error {
  constructor(code = ERROR_CODES.UNKNOWN_ERROR, details = {}, originalError = null) {
    const errorInfo = ERROR_MESSAGES[code] || ERROR_MESSAGES[ERROR_CODES.UNKNOWN_ERROR]
    
    super(errorInfo.message)
    
    this.name = 'AppError'
    this.code = code
    this.title = errorInfo.title
    this.message = errorInfo.message
    this.suggestion = errorInfo.suggestion
    this.details = details
    this.originalError = originalError
    this.timestamp = new Date().toISOString()
    this.context = {
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A',
      platform: typeof process !== 'undefined' ? process.platform : 'unknown',
      timestamp: this.timestamp
    }
  }
  
  /**
   * Get user-friendly error message
   * @returns {string} Formatted error message
   */
  getUserMessage() {
    let message = `${this.title}: ${this.message}`
    if (this.suggestion) {
      message += `\n建议: ${this.suggestion}`
    }
    return message
  }
  
  /**
   * Get detailed error information for logging
   * @returns {Object} Detailed error information
   */
  getDetails() {
    return {
      code: this.code,
      title: this.title,
      message: this.message,
      suggestion: this.suggestion,
      details: this.details,
      timestamp: this.timestamp,
      context: this.context,
      originalError: this.originalError ? {
        message: this.originalError.message,
        stack: this.originalError.stack
      } : null
    }
  }
  
  /**
   * Convert to JSON for logging or transmission
   * @returns {Object} JSON representation
   */
  toJSON() {
    return this.getDetails()
  }
}

/**
 * Error severity levels
 */
export const ERROR_SEVERITY = {
  LOW: 'low',       // Minor issues, doesn't block functionality
  MEDIUM: 'medium', // Significant issues, partial functionality affected
  HIGH: 'high',     // Major issues, core functionality affected
  CRITICAL: 'critical' // Critical issues, application unusable
}

/**
 * Error category mappings for better organization
 */
const ERROR_CATEGORIES = {
  [ERROR_CODES.FILE_NOT_FOUND]: ERROR_SEVERITY.MEDIUM,
  [ERROR_CODES.FILE_ACCESS_DENIED]: ERROR_SEVERITY.MEDIUM,
  [ERROR_CODES.FILE_TOO_LARGE]: ERROR_SEVERITY.LOW,
  [ERROR_CODES.FILE_CORRUPTED]: ERROR_SEVERITY.HIGH,
  [ERROR_CODES.FILE_LOCKED]: ERROR_SEVERITY.MEDIUM,
  [ERROR_CODES.DISK_FULL]: ERROR_SEVERITY.HIGH,
  [ERROR_CODES.INVALID_PATH]: ERROR_SEVERITY.LOW,
  
  [ERROR_CODES.COMPRESSION_FAILED]: ERROR_SEVERITY.HIGH,
  [ERROR_CODES.DECOMPRESSION_FAILED]: ERROR_SEVERITY.HIGH,
  [ERROR_CODES.UNSUPPORTED_FORMAT]: ERROR_SEVERITY.LOW,
  [ERROR_CODES.CORRUPTED_ARCHIVE]: ERROR_SEVERITY.HIGH,
  [ERROR_CODES.ARCHIVE_TOO_LARGE]: ERROR_SEVERITY.MEDIUM,
  
  [ERROR_CODES.INVALID_PASSWORD]: ERROR_SEVERITY.MEDIUM,
  [ERROR_CODES.ENCRYPTION_FAILED]: ERROR_SEVERITY.HIGH,
  [ERROR_CODES.DECRYPTION_FAILED]: ERROR_SEVERITY.HIGH,
  [ERROR_CODES.UNSAFE_PATH]: ERROR_SEVERITY.HIGH,
  [ERROR_CODES.MALICIOUS_FILE]: ERROR_SEVERITY.CRITICAL,
  
  [ERROR_CODES.NETWORK_ERROR]: ERROR_SEVERITY.MEDIUM,
  [ERROR_CODES.TIMEOUT_ERROR]: ERROR_SEVERITY.MEDIUM,
  [ERROR_CODES.CONNECTION_FAILED]: ERROR_SEVERITY.MEDIUM,
  
  [ERROR_CODES.OPERATION_CANCELLED]: ERROR_SEVERITY.LOW,
  [ERROR_CODES.OPERATION_TIMEOUT]: ERROR_SEVERITY.MEDIUM,
  [ERROR_CODES.CONCURRENT_OPERATION]: ERROR_SEVERITY.LOW,
  [ERROR_CODES.INVALID_OPERATION]: ERROR_SEVERITY.LOW,
  
  [ERROR_CODES.INSUFFICIENT_MEMORY]: ERROR_SEVERITY.CRITICAL,
  [ERROR_CODES.SYSTEM_ERROR]: ERROR_SEVERITY.CRITICAL,
  [ERROR_CODES.SERVICE_UNAVAILABLE]: ERROR_SEVERITY.HIGH,
  [ERROR_CODES.CONFIGURATION_ERROR]: ERROR_SEVERITY.HIGH,
  
  [ERROR_CODES.INVALID_INPUT]: ERROR_SEVERITY.LOW,
  [ERROR_CODES.MISSING_REQUIRED_FIELD]: ERROR_SEVERITY.LOW,
  [ERROR_CODES.VALIDATION_ERROR]: ERROR_SEVERITY.LOW,
  
  [ERROR_CODES.UNKNOWN_ERROR]: ERROR_SEVERITY.HIGH,
  [ERROR_CODES.INTERNAL_ERROR]: ERROR_SEVERITY.CRITICAL
}

/**
 * Centralized Error Handling Service
 */
export class ErrorHandlingService {
  constructor() {
    this.errorLog = []
    this.maxLogSize = 1000 // Keep last 1000 errors
    this.listeners = new Map()
  }
  
  /**
   * Handle error with comprehensive processing
   * @param {Error|string} error - Error to handle
   * @param {string} context - Context where error occurred
   * @param {Object} additionalDetails - Additional error details
   * @returns {AppError} Processed application error
   */
  handleError(error, context = 'unknown', additionalDetails = {}) {
    let appError
    
    if (error instanceof AppError) {
      // Already an AppError, just add context
      appError = error
      appError.details = { ...appError.details, context, ...additionalDetails }
    } else if (error instanceof Error) {
      // Convert standard Error to AppError
      const errorCode = this._mapErrorToCode(error)
      appError = new AppError(errorCode, { context, ...additionalDetails }, error)
    } else if (typeof error === 'string') {
      // String error message
      appError = new AppError(ERROR_CODES.UNKNOWN_ERROR, { 
        context, 
        customMessage: error, 
        ...additionalDetails 
      })
    } else {
      // Unknown error type
      appError = new AppError(ERROR_CODES.INTERNAL_ERROR, { 
        context, 
        unknownError: error, 
        ...additionalDetails 
      })
    }
    
    // Log error
    this._logError(appError)
    
    // Notify listeners
    this._notifyListeners(appError)
    
    return appError
  }
  
  /**
   * Create specific error with code and details
   * @param {string} code - Error code
   * @param {Object} details - Error details
   * @param {Error} originalError - Original error if any
   * @returns {AppError} Created application error
   */
  createError(code, details = {}, originalError = null) {
    return new AppError(code, details, originalError)
  }
  
  /**
   * Get error severity level
   * @param {string} code - Error code
   * @returns {string} Severity level
   */
  getErrorSeverity(code) {
    return ERROR_CATEGORIES[code] || ERROR_SEVERITY.MEDIUM
  }
  
  /**
   * Check if error is recoverable
   * @param {string} code - Error code
   * @returns {boolean} True if error is recoverable
   */
  isRecoverable(code) {
    const criticalErrors = [
      ERROR_CODES.INSUFFICIENT_MEMORY,
      ERROR_CODES.SYSTEM_ERROR,
      ERROR_CODES.MALICIOUS_FILE,
      ERROR_CODES.INTERNAL_ERROR
    ]
    
    return !criticalErrors.includes(code)
  }
  
  /**
   * Add error event listener
   * @param {string} type - Event type ('error', 'critical')
   * @param {Function} callback - Callback function
   */
  addEventListener(type, callback) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, [])
    }
    this.listeners.get(type).push(callback)
  }
  
  /**
   * Remove error event listener
   * @param {string} type - Event type
   * @param {Function} callback - Callback function to remove
   */
  removeEventListener(type, callback) {
    const callbacks = this.listeners.get(type)
    if (callbacks) {
      const index = callbacks.indexOf(callback)
      if (index > -1) {
        callbacks.splice(index, 1)
      }
    }
  }
  
  /**
   * Get recent error history
   * @param {number} count - Number of recent errors to return
   * @returns {Array} Recent errors
   */
  getRecentErrors(count = 10) {
    return this.errorLog.slice(-count)
  }
  
  /**
   * Get error statistics
   * @returns {Object} Error statistics
   */
  getErrorStats() {
    const stats = {
      total: this.errorLog.length,
      bySeverity: {},
      byCode: {},
      recent: this.errorLog.slice(-10)
    }
    
    // Count by severity
    Object.values(ERROR_SEVERITY).forEach(severity => {
      stats.bySeverity[severity] = 0
    })
    
    // Analyze errors
    this.errorLog.forEach(error => {
      const severity = this.getErrorSeverity(error.code)
      stats.bySeverity[severity]++
      
      stats.byCode[error.code] = (stats.byCode[error.code] || 0) + 1
    })
    
    return stats
  }
  
  /**
   * Clear error log
   */
  clearErrorLog() {
    this.errorLog = []
  }
  
  /**
   * Map standard errors to application error codes
   * @private
   */
  _mapErrorToCode(error) {
    // Node.js error codes
    if (error.code === 'ENOENT') return ERROR_CODES.FILE_NOT_FOUND
    if (error.code === 'EACCES' || error.code === 'EPERM') return ERROR_CODES.FILE_ACCESS_DENIED
    if (error.code === 'ENOSPC') return ERROR_CODES.DISK_FULL
    if (error.code === 'EMFILE' || error.code === 'ENOMEM') return ERROR_CODES.INSUFFICIENT_MEMORY
    if (error.code === 'ETIMEDOUT') return ERROR_CODES.TIMEOUT_ERROR
    if (error.code === 'ECONNREFUSED') return ERROR_CODES.CONNECTION_FAILED
    
    // Message-based detection
    const message = error.message.toLowerCase()
    if (message.includes('password')) return ERROR_CODES.INVALID_PASSWORD
    if (message.includes('corrupt')) return ERROR_CODES.FILE_CORRUPTED
    if (message.includes('format')) return ERROR_CODES.UNSUPPORTED_FORMAT
    if (message.includes('permission')) return ERROR_CODES.FILE_ACCESS_DENIED
    if (message.includes('not found')) return ERROR_CODES.FILE_NOT_FOUND
    if (message.includes('cancelled')) return ERROR_CODES.OPERATION_CANCELLED
    if (message.includes('timeout')) return ERROR_CODES.TIMEOUT_ERROR
    if (message.includes('network')) return ERROR_CODES.NETWORK_ERROR
    
    return ERROR_CODES.UNKNOWN_ERROR
  }
  
  /**
   * Log error to internal storage
   * @private
   */
  _logError(appError) {
    const logEntry = {
      ...appError.getDetails(),
      id: this._generateErrorId(),
      severity: this.getErrorSeverity(appError.code)
    }
    
    this.errorLog.push(logEntry)
    
    // Keep log size under limit
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(-this.maxLogSize)
    }
    
    // Console logging based on severity
    const severity = this.getErrorSeverity(appError.code)
    if (severity === ERROR_SEVERITY.CRITICAL) {
      console.error('CRITICAL ERROR:', appError.getDetails())
    } else if (severity === ERROR_SEVERITY.HIGH) {
      console.error('HIGH SEVERITY ERROR:', appError.getUserMessage())
    } else {
      console.warn('Error:', appError.getUserMessage())
    }
  }
  
  /**
   * Notify error listeners
   * @private
   */
  _notifyListeners(appError) {
    const severity = this.getErrorSeverity(appError.code)
    
    // Notify general error listeners
    const errorListeners = this.listeners.get('error') || []
    errorListeners.forEach(callback => {
      try {
        callback(appError)
      } catch (err) {
        console.error('Error in error listener:', err)
      }
    })
    
    // Notify critical error listeners for severe errors
    if (severity === ERROR_SEVERITY.CRITICAL) {
      const criticalListeners = this.listeners.get('critical') || []
      criticalListeners.forEach(callback => {
        try {
          callback(appError)
        } catch (err) {
          console.error('Error in critical error listener:', err)
        }
      })
    }
  }
  
  /**
   * Generate unique error ID
   * @private
   */
  _generateErrorId() {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

// Create and export singleton instance
export const errorHandlingService = new ErrorHandlingService()