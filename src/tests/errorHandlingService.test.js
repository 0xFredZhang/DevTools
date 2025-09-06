/**
 * Error Handling Service Tests
 * 
 * Comprehensive test suite for centralized error handling
 * including error categorization, user messages, and recovery.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ErrorHandlingService, ERROR_CODES, AppError } from '../services/errorHandlingService.js'

describe('ErrorHandlingService', () => {
  let errorService
  let mockLogger
  
  beforeEach(() => {
    // Mock console for logging tests
    mockLogger = {
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    }
    vi.spyOn(console, 'log').mockImplementation(mockLogger.log)
    vi.spyOn(console, 'warn').mockImplementation(mockLogger.warn)
    vi.spyOn(console, 'error').mockImplementation(mockLogger.error)
    
    errorService = new ErrorHandlingService()
  })
  
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Error Code Constants', () => {
    it('should define all required error codes', () => {
      // File System Errors
      expect(ERROR_CODES.FILE_NOT_FOUND).toBe('FILE_NOT_FOUND')
      expect(ERROR_CODES.FILE_ACCESS_DENIED).toBe('FILE_ACCESS_DENIED')
      expect(ERROR_CODES.FILE_TOO_LARGE).toBe('FILE_TOO_LARGE')
      expect(ERROR_CODES.DISK_FULL).toBe('DISK_FULL')
      
      // Compression Errors
      expect(ERROR_CODES.COMPRESSION_FAILED).toBe('COMPRESSION_FAILED')
      expect(ERROR_CODES.DECOMPRESSION_FAILED).toBe('DECOMPRESSION_FAILED')
      expect(ERROR_CODES.CORRUPTED_ARCHIVE).toBe('CORRUPTED_ARCHIVE')
      
      // Security Errors
      expect(ERROR_CODES.INVALID_PASSWORD).toBe('INVALID_PASSWORD')
      expect(ERROR_CODES.ENCRYPTION_FAILED).toBe('ENCRYPTION_FAILED')
      expect(ERROR_CODES.UNSAFE_PATH).toBe('UNSAFE_PATH')
      
      // Operation Errors
      expect(ERROR_CODES.OPERATION_CANCELLED).toBe('OPERATION_CANCELLED')
      expect(ERROR_CODES.OPERATION_TIMEOUT).toBe('OPERATION_TIMEOUT')
    })
  })

  describe('AppError Class', () => {
    it('should create AppError with required properties', () => {
      const error = new AppError(
        ERROR_CODES.FILE_NOT_FOUND, 
        'File not found', 
        { filePath: '/test/file.txt' }
      )
      
      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(AppError)
      expect(error.code).toBe(ERROR_CODES.FILE_NOT_FOUND)
      expect(error.message).toBe('File not found')
      expect(error.context).toEqual({ filePath: '/test/file.txt' })
      expect(error.timestamp).toBeInstanceOf(Date)
    })
    
    it('should have proper error name', () => {
      const error = new AppError(ERROR_CODES.COMPRESSION_FAILED, 'Compression failed')
      expect(error.name).toBe('AppError')
    })
    
    it('should maintain stack trace', () => {
      const error = new AppError(ERROR_CODES.ENCRYPTION_FAILED, 'Encryption failed')
      expect(error.stack).toBeDefined()
      expect(typeof error.stack).toBe('string')
    })
  })

  describe('Error Creation', () => {
    it('should create error with all properties', () => {
      const context = { operation: 'compress', fileName: 'test.txt' }
      const error = errorService.createError(
        ERROR_CODES.COMPRESSION_FAILED,
        'Compression operation failed',
        context
      )
      
      expect(error).toBeInstanceOf(AppError)
      expect(error.code).toBe(ERROR_CODES.COMPRESSION_FAILED)
      expect(error.message).toBe('Compression operation failed')
      expect(error.context).toBe(context)
    })
    
    it('should create error without context', () => {
      const error = errorService.createError(
        ERROR_CODES.NETWORK_ERROR,
        'Network connection failed'
      )
      
      expect(error.code).toBe(ERROR_CODES.NETWORK_ERROR)
      expect(error.context).toEqual({})
    })
    
    it('should validate error code', () => {
      expect(() => {
        errorService.createError('INVALID_CODE', 'Test message')
      }).toThrow('Invalid error code: INVALID_CODE')
    })
  })

  describe('Error Message Localization', () => {
    it('should provide Chinese error messages', () => {
      const messages = {
        [ERROR_CODES.FILE_NOT_FOUND]: errorService.getLocalizedMessage(ERROR_CODES.FILE_NOT_FOUND),
        [ERROR_CODES.COMPRESSION_FAILED]: errorService.getLocalizedMessage(ERROR_CODES.COMPRESSION_FAILED),
        [ERROR_CODES.INVALID_PASSWORD]: errorService.getLocalizedMessage(ERROR_CODES.INVALID_PASSWORD),
        [ERROR_CODES.DISK_FULL]: errorService.getLocalizedMessage(ERROR_CODES.DISK_FULL)
      }
      
      expect(messages[ERROR_CODES.FILE_NOT_FOUND]).toContain('文件不存在')
      expect(messages[ERROR_CODES.COMPRESSION_FAILED]).toContain('压缩失败')
      expect(messages[ERROR_CODES.INVALID_PASSWORD]).toContain('密码错误')
      expect(messages[ERROR_CODES.DISK_FULL]).toContain('磁盘空间不足')
    })
    
    it('should fallback to English for unknown codes', () => {
      const message = errorService.getLocalizedMessage('UNKNOWN_ERROR')
      expect(message).toContain('Unknown error')
    })
    
    it('should support message interpolation', () => {
      const context = { fileName: 'test.zip', maxSize: '2GB' }
      const message = errorService.getLocalizedMessage(ERROR_CODES.FILE_TOO_LARGE, context)
      
      expect(message).toContain('test.zip')
      expect(message).toContain('2GB')
    })
  })

  describe('Error Recovery Suggestions', () => {
    it('should provide recovery suggestions for file errors', () => {
      const suggestions = errorService.getRecoverySuggestions(ERROR_CODES.FILE_NOT_FOUND)
      
      expect(suggestions).toBeInstanceOf(Array)
      expect(suggestions.length).toBeGreaterThan(0)
      expect(suggestions[0]).toContain('检查文件路径')
    })
    
    it('should provide suggestions for permission errors', () => {
      const suggestions = errorService.getRecoverySuggestions(ERROR_CODES.FILE_ACCESS_DENIED)
      
      expect(suggestions.some(s => s.includes('管理员权限'))).toBe(true)
      expect(suggestions.some(s => s.includes('文件权限'))).toBe(true)
    })
    
    it('should provide suggestions for space errors', () => {
      const suggestions = errorService.getRecoverySuggestions(ERROR_CODES.DISK_FULL)
      
      expect(suggestions.some(s => s.includes('清理磁盘'))).toBe(true)
      expect(suggestions.some(s => s.includes('选择其他位置'))).toBe(true)
    })
    
    it('should return empty array for unknown error codes', () => {
      const suggestions = errorService.getRecoverySuggestions('UNKNOWN_ERROR')
      expect(suggestions).toEqual([])
    })
  })

  describe('Error Categorization', () => {
    it('should categorize file system errors', () => {
      expect(errorService.getErrorCategory(ERROR_CODES.FILE_NOT_FOUND)).toBe('FILE_SYSTEM')
      expect(errorService.getErrorCategory(ERROR_CODES.FILE_ACCESS_DENIED)).toBe('FILE_SYSTEM')
      expect(errorService.getErrorCategory(ERROR_CODES.DISK_FULL)).toBe('FILE_SYSTEM')
    })
    
    it('should categorize compression errors', () => {
      expect(errorService.getErrorCategory(ERROR_CODES.COMPRESSION_FAILED)).toBe('COMPRESSION')
      expect(errorService.getErrorCategory(ERROR_CODES.CORRUPTED_ARCHIVE)).toBe('COMPRESSION')
      expect(errorService.getErrorCategory(ERROR_CODES.UNSUPPORTED_FORMAT)).toBe('COMPRESSION')
    })
    
    it('should categorize security errors', () => {
      expect(errorService.getErrorCategory(ERROR_CODES.INVALID_PASSWORD)).toBe('SECURITY')
      expect(errorService.getErrorCategory(ERROR_CODES.ENCRYPTION_FAILED)).toBe('SECURITY')
      expect(errorService.getErrorCategory(ERROR_CODES.MALICIOUS_FILE)).toBe('SECURITY')
    })
    
    it('should categorize operation errors', () => {
      expect(errorService.getErrorCategory(ERROR_CODES.OPERATION_CANCELLED)).toBe('OPERATION')
      expect(errorService.getErrorCategory(ERROR_CODES.OPERATION_TIMEOUT)).toBe('OPERATION')
    })
  })

  describe('Error Severity Levels', () => {
    it('should assign critical severity to data loss errors', () => {
      expect(errorService.getErrorSeverity(ERROR_CODES.FILE_CORRUPTED)).toBe('CRITICAL')
      expect(errorService.getErrorSeverity(ERROR_CODES.MALICIOUS_FILE)).toBe('CRITICAL')
    })
    
    it('should assign high severity to access errors', () => {
      expect(errorService.getErrorSeverity(ERROR_CODES.FILE_ACCESS_DENIED)).toBe('HIGH')
      expect(errorService.getErrorSeverity(ERROR_CODES.ENCRYPTION_FAILED)).toBe('HIGH')
    })
    
    it('should assign medium severity to operation errors', () => {
      expect(errorService.getErrorSeverity(ERROR_CODES.COMPRESSION_FAILED)).toBe('MEDIUM')
      expect(errorService.getErrorSeverity(ERROR_CODES.NETWORK_ERROR)).toBe('MEDIUM')
    })
    
    it('should assign low severity to user cancellations', () => {
      expect(errorService.getErrorSeverity(ERROR_CODES.OPERATION_CANCELLED)).toBe('LOW')
    })
  })

  describe('Error Logging', () => {
    it('should log error with proper format', () => {
      const error = new AppError(
        ERROR_CODES.COMPRESSION_FAILED,
        'Test compression failed',
        { fileName: 'test.zip' }
      )
      
      errorService.logError(error)
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR]'),
        expect.stringContaining('COMPRESSION_FAILED'),
        expect.stringContaining('test.zip')
      )
    })
    
    it('should log different severity levels appropriately', () => {
      const criticalError = new AppError(ERROR_CODES.FILE_CORRUPTED, 'File corrupted')
      const lowError = new AppError(ERROR_CODES.OPERATION_CANCELLED, 'Cancelled')
      
      errorService.logError(criticalError)
      errorService.logError(lowError)
      
      expect(mockLogger.error).toHaveBeenCalledTimes(1) // Critical error
      expect(mockLogger.warn).toHaveBeenCalledTimes(1)  // Low error
    })
    
    it('should include stack trace for debugging', () => {
      const error = new AppError(ERROR_CODES.COMPRESSION_FAILED, 'Test error')
      
      errorService.logError(error, { includeStack: true })
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('Stack:')
      )
    })
  })

  describe('Error Handling Strategies', () => {
    it('should suggest retry for transient errors', () => {
      const strategy = errorService.getHandlingStrategy(ERROR_CODES.NETWORK_ERROR)
      
      expect(strategy.shouldRetry).toBe(true)
      expect(strategy.maxRetries).toBeGreaterThan(0)
      expect(strategy.retryDelay).toBeGreaterThan(0)
    })
    
    it('should not suggest retry for permanent errors', () => {
      const strategy = errorService.getHandlingStrategy(ERROR_CODES.FILE_NOT_FOUND)
      
      expect(strategy.shouldRetry).toBe(false)
      expect(strategy.requiresUserAction).toBe(true)
    })
    
    it('should suggest fallback for recoverable errors', () => {
      const strategy = errorService.getHandlingStrategy(ERROR_CODES.DISK_FULL)
      
      expect(strategy.hasFallback).toBe(true)
      expect(strategy.fallbackOptions).toBeInstanceOf(Array)
      expect(strategy.fallbackOptions.length).toBeGreaterThan(0)
    })
  })

  describe('Error Context Enhancement', () => {
    it('should enhance error context with system information', () => {
      const error = new AppError(ERROR_CODES.COMPRESSION_FAILED, 'Test error')
      
      const enhancedError = errorService.enhanceError(error, {
        operation: 'compress',
        fileName: 'test.zip',
        fileSize: 1024
      })
      
      expect(enhancedError.context.operation).toBe('compress')
      expect(enhancedError.context.fileName).toBe('test.zip')
      expect(enhancedError.context.fileSize).toBe(1024)
      expect(enhancedError.context.timestamp).toBeInstanceOf(Date)
      expect(enhancedError.context.userAgent).toBeDefined()
    })
    
    it('should add performance metrics to error context', () => {
      const startTime = Date.now()
      const error = new AppError(ERROR_CODES.OPERATION_TIMEOUT, 'Operation timed out')
      
      // Simulate some time passing
      const enhancedError = errorService.enhanceError(error, { startTime })
      
      expect(enhancedError.context.duration).toBeGreaterThanOrEqual(0)
      expect(enhancedError.context.startTime).toBe(startTime)
    })
  })

  describe('Error Reporting', () => {
    it('should format error report for debugging', () => {
      const error = new AppError(
        ERROR_CODES.COMPRESSION_FAILED,
        'Compression failed',
        { fileName: 'test.zip', operation: 'compress' }
      )
      
      const report = errorService.generateErrorReport(error)
      
      expect(report).toHaveProperty('errorCode')
      expect(report).toHaveProperty('message')
      expect(report).toHaveProperty('context')
      expect(report).toHaveProperty('timestamp')
      expect(report).toHaveProperty('category')
      expect(report).toHaveProperty('severity')
      expect(report).toHaveProperty('suggestions')
      expect(report).toHaveProperty('handlingStrategy')
    })
    
    it('should include relevant system information in reports', () => {
      const error = new AppError(ERROR_CODES.INSUFFICIENT_MEMORY, 'Out of memory')
      const report = errorService.generateErrorReport(error)
      
      expect(report.systemInfo).toBeDefined()
      expect(report.systemInfo.platform).toBeDefined()
      expect(report.systemInfo.nodeVersion).toBeDefined()
    })
  })

  describe('Error Middleware Integration', () => {
    it('should handle promise rejections', async () => {
      const asyncOperation = async () => {
        throw new AppError(ERROR_CODES.NETWORK_ERROR, 'Network failed')
      }
      
      const result = await errorService.handleAsyncOperation(asyncOperation)
      
      expect(result.success).toBe(false)
      expect(result.error).toBeInstanceOf(AppError)
      expect(result.error.code).toBe(ERROR_CODES.NETWORK_ERROR)
    })
    
    it('should wrap non-AppError exceptions', async () => {
      const asyncOperation = async () => {
        throw new Error('Generic error')
      }
      
      const result = await errorService.handleAsyncOperation(asyncOperation)
      
      expect(result.success).toBe(false)
      expect(result.error).toBeInstanceOf(AppError)
      expect(result.error.code).toBe(ERROR_CODES.UNKNOWN_ERROR)
      expect(result.error.context.originalError).toBeInstanceOf(Error)
    })
  })
})