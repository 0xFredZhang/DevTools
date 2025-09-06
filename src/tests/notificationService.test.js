/**
 * Notification Service Tests
 * 
 * Comprehensive test suite for notification system
 * including success, error, progress notifications and management.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { 
  NotificationService, 
  Notification,
  NOTIFICATION_TYPES, 
  NOTIFICATION_PRIORITIES,
  NOTIFICATION_POSITIONS
} from '../services/notificationService.js'

describe('NotificationService', () => {
  let notificationService
  let mockDOM
  
  beforeEach(() => {
    // Mock DOM environment
    global.document = {
      createElement: vi.fn().mockReturnValue({
        classList: {
          add: vi.fn(),
          remove: vi.fn(),
          contains: vi.fn()
        },
        setAttribute: vi.fn(),
        appendChild: vi.fn(),
        removeChild: vi.fn(),
        innerHTML: '',
        style: {},
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      }),
      body: {
        appendChild: vi.fn(),
        removeChild: vi.fn()
      },
      querySelector: vi.fn(),
      querySelectorAll: vi.fn().mockReturnValue([])
    }
    
    global.setTimeout = vi.fn().mockImplementation((callback, delay) => {
      callback()
      return 123
    })
    global.clearTimeout = vi.fn()
    
    notificationService = new NotificationService()
  })
  
  afterEach(() => {
    vi.clearAllMocks()
    delete global.document
    delete global.setTimeout
    delete global.clearTimeout
  })

  describe('Notification Class', () => {
    it('should create notification with all required properties', () => {
      const notification = new Notification({
        id: 'test-1',
        type: NOTIFICATION_TYPES.SUCCESS,
        title: 'Operation Complete',
        message: 'File compressed successfully',
        priority: NOTIFICATION_PRIORITIES.HIGH
      })
      
      expect(notification.id).toBe('test-1')
      expect(notification.type).toBe(NOTIFICATION_TYPES.SUCCESS)
      expect(notification.title).toBe('Operation Complete')
      expect(notification.message).toBe('File compressed successfully')
      expect(notification.priority).toBe(NOTIFICATION_PRIORITIES.HIGH)
      expect(notification.timestamp).toBeInstanceOf(Date)
      expect(notification.isRead).toBe(false)
      expect(notification.isDismissed).toBe(false)
    })
    
    it('should auto-generate ID if not provided', () => {
      const notification = new Notification({
        type: NOTIFICATION_TYPES.INFO,
        title: 'Test',
        message: 'Test message'
      })
      
      expect(notification.id).toBeDefined()
      expect(typeof notification.id).toBe('string')
    })
    
    it('should set default values', () => {
      const notification = new Notification({
        title: 'Test',
        message: 'Test message'
      })
      
      expect(notification.type).toBe(NOTIFICATION_TYPES.INFO)
      expect(notification.priority).toBe(NOTIFICATION_PRIORITIES.NORMAL)
      expect(notification.position).toBe(NOTIFICATION_POSITIONS.TOP_RIGHT)
      expect(notification.duration).toBe(5000)
    })
  })

  describe('Notification Creation', () => {
    it('should create success notification', () => {
      const notification = notificationService.success(
        'Compression Complete',
        'Files compressed successfully',
        { compressionRatio: 0.75 }
      )
      
      expect(notification.type).toBe(NOTIFICATION_TYPES.SUCCESS)
      expect(notification.title).toBe('Compression Complete')
      expect(notification.message).toBe('Files compressed successfully')
      expect(notification.data.compressionRatio).toBe(0.75)
    })
    
    it('should create error notification', () => {
      const notification = notificationService.error(
        'Compression Failed',
        'Unable to compress file',
        { errorCode: 'DISK_FULL' }
      )
      
      expect(notification.type).toBe(NOTIFICATION_TYPES.ERROR)
      expect(notification.title).toBe('Compression Failed')
      expect(notification.priority).toBe(NOTIFICATION_PRIORITIES.HIGH)
      expect(notification.data.errorCode).toBe('DISK_FULL')
    })
    
    it('should create warning notification', () => {
      const notification = notificationService.warning(
        'Large File Warning',
        'File size exceeds 1GB'
      )
      
      expect(notification.type).toBe(NOTIFICATION_TYPES.WARNING)
      expect(notification.priority).toBe(NOTIFICATION_PRIORITIES.HIGH)
    })
    
    it('should create info notification', () => {
      const notification = notificationService.info(
        'Processing Started',
        'File compression has started'
      )
      
      expect(notification.type).toBe(NOTIFICATION_TYPES.INFO)
      expect(notification.priority).toBe(NOTIFICATION_PRIORITIES.NORMAL)
    })
    
    it('should create progress notification', () => {
      const notification = notificationService.progress(
        'Compressing Files',
        'Processing file 1 of 10',
        { progress: 10, total: 100 }
      )
      
      expect(notification.type).toBe(NOTIFICATION_TYPES.PROGRESS)
      expect(notification.data.progress).toBe(10)
      expect(notification.data.total).toBe(100)
    })
  })

  describe('Notification Display', () => {
    it('should display notification in DOM', () => {
      const notification = notificationService.success('Test', 'Test message')
      
      notificationService.show(notification)
      
      expect(global.document.createElement).toHaveBeenCalledWith('div')
      expect(global.document.body.appendChild).toHaveBeenCalled()
    })
    
    it('should apply correct CSS classes for notification type', () => {
      const mockElement = global.document.createElement()
      global.document.createElement.mockReturnValue(mockElement)
      
      const notification = notificationService.error('Error', 'Error message')
      notificationService.show(notification)
      
      expect(mockElement.classList.add).toHaveBeenCalledWith(
        expect.stringContaining('notification-error')
      )
    })
    
    it('should position notification correctly', () => {
      const mockElement = global.document.createElement()
      global.document.createElement.mockReturnValue(mockElement)
      
      const notification = notificationService.info('Test', 'Test message')
      notification.position = NOTIFICATION_POSITIONS.BOTTOM_LEFT
      
      notificationService.show(notification)
      
      expect(mockElement.classList.add).toHaveBeenCalledWith(
        expect.stringContaining('bottom-left')
      )
    })
    
    it('should set auto-dismiss timer for non-permanent notifications', () => {
      const notification = notificationService.info('Test', 'Test message')
      notification.duration = 3000
      
      notificationService.show(notification)
      
      expect(global.setTimeout).toHaveBeenCalledWith(
        expect.any(Function),
        3000
      )
    })
    
    it('should not set timer for permanent notifications', () => {
      const notification = notificationService.error('Error', 'Error message')
      notification.isPersistent = true
      
      notificationService.show(notification)
      
      expect(global.setTimeout).not.toHaveBeenCalled()
    })
  })

  describe('Notification Management', () => {
    it('should track active notifications', () => {
      const notification1 = notificationService.success('Success 1', 'Message 1')
      const notification2 = notificationService.info('Info 1', 'Message 2')
      
      notificationService.show(notification1)
      notificationService.show(notification2)
      
      const activeNotifications = notificationService.getActiveNotifications()
      expect(activeNotifications).toHaveLength(2)
      expect(activeNotifications).toContain(notification1)
      expect(activeNotifications).toContain(notification2)
    })
    
    it('should dismiss notification by ID', () => {
      const notification = notificationService.success('Success', 'Message')
      notificationService.show(notification)
      
      const dismissed = notificationService.dismiss(notification.id)
      
      expect(dismissed).toBe(true)
      expect(notification.isDismissed).toBe(true)
      expect(notificationService.getActiveNotifications()).toHaveLength(0)
    })
    
    it('should dismiss all notifications', () => {
      const notification1 = notificationService.success('Success 1', 'Message 1')
      const notification2 = notificationService.info('Info 1', 'Message 2')
      
      notificationService.show(notification1)
      notificationService.show(notification2)
      
      notificationService.dismissAll()
      
      expect(notificationService.getActiveNotifications()).toHaveLength(0)
      expect(notification1.isDismissed).toBe(true)
      expect(notification2.isDismissed).toBe(true)
    })
    
    it('should clear notification history', () => {
      notificationService.success('Success', 'Message')
      notificationService.error('Error', 'Message')
      
      expect(notificationService.getNotificationHistory()).toHaveLength(2)
      
      notificationService.clearHistory()
      
      expect(notificationService.getNotificationHistory()).toHaveLength(0)
    })
  })

  describe('Notification Filtering and Querying', () => {
    beforeEach(() => {
      notificationService.success('Success 1', 'Success message')
      notificationService.error('Error 1', 'Error message')
      notificationService.warning('Warning 1', 'Warning message')
      notificationService.info('Info 1', 'Info message')
    })
    
    it('should filter notifications by type', () => {
      const errorNotifications = notificationService.getNotificationsByType(
        NOTIFICATION_TYPES.ERROR
      )
      
      expect(errorNotifications).toHaveLength(1)
      expect(errorNotifications[0].type).toBe(NOTIFICATION_TYPES.ERROR)
    })
    
    it('should filter notifications by priority', () => {
      const highPriorityNotifications = notificationService.getNotificationsByPriority(
        NOTIFICATION_PRIORITIES.HIGH
      )
      
      expect(highPriorityNotifications.length).toBeGreaterThan(0)
      highPriorityNotifications.forEach(notification => {
        expect(notification.priority).toBe(NOTIFICATION_PRIORITIES.HIGH)
      })
    })
    
    it('should get unread notifications', () => {
      const allNotifications = notificationService.getNotificationHistory()
      allNotifications[0].isRead = true
      
      const unreadNotifications = notificationService.getUnreadNotifications()
      
      expect(unreadNotifications).toHaveLength(3)
      expect(unreadNotifications.every(n => !n.isRead)).toBe(true)
    })
    
    it('should search notifications by content', () => {
      const results = notificationService.searchNotifications('Success')
      
      expect(results).toHaveLength(1)
      expect(results[0].title).toContain('Success')
    })
  })

  describe('Notification Templates', () => {
    it('should use compression success template', () => {
      const stats = {
        originalSize: 1024 * 1024,
        compressedSize: 512 * 1024,
        compressionRatio: 0.5,
        filesCount: 5
      }
      
      const notification = notificationService.compressionSuccess(stats)
      
      expect(notification.type).toBe(NOTIFICATION_TYPES.SUCCESS)
      expect(notification.message).toContain('50%')
      expect(notification.message).toContain('5 个文件')
      expect(notification.data.stats).toBe(stats)
    })
    
    it('should use compression error template', () => {
      const error = {
        code: 'DISK_FULL',
        message: 'Insufficient disk space'
      }
      
      const notification = notificationService.compressionError(error)
      
      expect(notification.type).toBe(NOTIFICATION_TYPES.ERROR)
      expect(notification.title).toContain('压缩失败')
      expect(notification.data.errorCode).toBe('DISK_FULL')
      expect(notification.actions).toBeDefined()
      expect(notification.actions.length).toBeGreaterThan(0)
    })
    
    it('should use progress update template', () => {
      const progress = {
        current: 3,
        total: 10,
        currentFile: 'document.pdf',
        percentage: 30
      }
      
      const notification = notificationService.progressUpdate(progress)
      
      expect(notification.type).toBe(NOTIFICATION_TYPES.PROGRESS)
      expect(notification.message).toContain('3/10')
      expect(notification.message).toContain('30%')
      expect(notification.message).toContain('document.pdf')
    })
  })

  describe('Notification Actions', () => {
    it('should support action buttons', () => {
      const notification = notificationService.error(
        'Compression Failed',
        'Unable to compress file'
      )
      
      notification.addAction('retry', '重试', () => console.log('Retry'))
      notification.addAction('details', '查看详情', () => console.log('Details'))
      
      expect(notification.actions).toHaveLength(2)
      expect(notification.actions[0].id).toBe('retry')
      expect(notification.actions[0].label).toBe('重试')
      expect(notification.actions[0].callback).toBeInstanceOf(Function)
    })
    
    it('should execute action callbacks', () => {
      const mockCallback = vi.fn()
      const notification = notificationService.info('Test', 'Test message')
      
      notification.addAction('test', 'Test', mockCallback)
      
      const action = notification.actions[0]
      action.callback()
      
      expect(mockCallback).toHaveBeenCalled()
    })
  })

  describe('Notification Queue Management', () => {
    it('should queue notifications when limit is reached', () => {
      // Set a low limit for testing
      notificationService.setMaxActiveNotifications(2)
      
      const notification1 = notificationService.success('Success 1', 'Message 1')
      const notification2 = notificationService.success('Success 2', 'Message 2')
      const notification3 = notificationService.success('Success 3', 'Message 3')
      
      notificationService.show(notification1)
      notificationService.show(notification2)
      notificationService.show(notification3)
      
      expect(notificationService.getActiveNotifications()).toHaveLength(2)
      expect(notificationService.getQueuedNotifications()).toHaveLength(1)
    })
    
    it('should process queue when active notification is dismissed', () => {
      notificationService.setMaxActiveNotifications(1)
      
      const notification1 = notificationService.success('Success 1', 'Message 1')
      const notification2 = notificationService.success('Success 2', 'Message 2')
      
      notificationService.show(notification1)
      notificationService.show(notification2)
      
      expect(notificationService.getActiveNotifications()).toHaveLength(1)
      expect(notificationService.getQueuedNotifications()).toHaveLength(1)
      
      notificationService.dismiss(notification1.id)
      
      expect(notificationService.getActiveNotifications()).toHaveLength(1)
      expect(notificationService.getQueuedNotifications()).toHaveLength(0)
    })
  })

  describe('Notification Persistence', () => {
    it('should save notifications to storage', () => {
      const mockStorage = {
        setItem: vi.fn(),
        getItem: vi.fn(),
        removeItem: vi.fn()
      }
      
      global.localStorage = mockStorage
      
      notificationService.success('Success', 'Message')
      notificationService.saveToStorage()
      
      expect(mockStorage.setItem).toHaveBeenCalledWith(
        'notifications',
        expect.any(String)
      )
      
      delete global.localStorage
    })
    
    it('should load notifications from storage', () => {
      const mockNotifications = [
        { id: '1', type: 'success', title: 'Test', message: 'Test' }
      ]
      
      const mockStorage = {
        getItem: vi.fn().mockReturnValue(JSON.stringify(mockNotifications))
      }
      
      global.localStorage = mockStorage
      
      notificationService.loadFromStorage()
      
      expect(mockStorage.getItem).toHaveBeenCalledWith('notifications')
      expect(notificationService.getNotificationHistory()).toHaveLength(1)
      
      delete global.localStorage
    })
  })

  describe('Configuration and Customization', () => {
    it('should support custom notification positions', () => {
      notificationService.setDefaultPosition(NOTIFICATION_POSITIONS.BOTTOM_CENTER)
      
      const notification = notificationService.info('Test', 'Test message')
      
      expect(notification.position).toBe(NOTIFICATION_POSITIONS.BOTTOM_CENTER)
    })
    
    it('should support custom duration settings', () => {
      notificationService.setDefaultDuration(NOTIFICATION_TYPES.SUCCESS, 10000)
      
      const notification = notificationService.success('Success', 'Message')
      
      expect(notification.duration).toBe(10000)
    })
    
    it('should support notification themes', () => {
      notificationService.setTheme('dark')
      
      const notification = notificationService.info('Test', 'Test message')
      notificationService.show(notification)
      
      const mockElement = global.document.createElement()
      expect(mockElement.classList.add).toHaveBeenCalledWith(
        expect.stringContaining('dark-theme')
      )
    })
  })

  describe('Analytics and Statistics', () => {
    it('should track notification statistics', () => {
      notificationService.success('Success 1', 'Message')
      notificationService.success('Success 2', 'Message')
      notificationService.error('Error 1', 'Message')
      
      const stats = notificationService.getStatistics()
      
      expect(stats.total).toBe(3)
      expect(stats.byType.success).toBe(2)
      expect(stats.byType.error).toBe(1)
      expect(stats.dismissed).toBe(0)
      expect(stats.read).toBe(0)
    })
    
    it('should track user interaction metrics', () => {
      const notification = notificationService.success('Success', 'Message')
      notificationService.show(notification)
      
      // Simulate user interactions
      notificationService.markAsRead(notification.id)
      notificationService.dismiss(notification.id)
      
      const metrics = notificationService.getInteractionMetrics()
      
      expect(metrics.readRate).toBeGreaterThan(0)
      expect(metrics.dismissalRate).toBeGreaterThan(0)
    })
  })
})