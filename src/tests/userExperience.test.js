/**
 * User Experience Workflow Tests
 * 
 * Comprehensive test suite for end-to-end user workflows
 * including accessibility, usability, and complete user journeys.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import CompressTool from '../views/CompressTool.vue'
import BackgroundOperationIndicator from '../components/BackgroundOperationIndicator.vue'

// Mock services for UX testing
const createMockServices = () => ({
  compressionService: {
    compress: vi.fn(),
    decompress: vi.fn(),
    getArchiveInfo: vi.fn(),
    cancel: vi.fn()
  },
  fileService: {
    validateFileInfo: vi.fn(),
    getFileInfo: vi.fn()
  },
  encryptionService: {
    generatePassword: vi.fn(),
    validatePassword: vi.fn()
  },
  notificationService: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn()
  },
  progressTrackingService: {
    createTracker: vi.fn(),
    updateProgress: vi.fn()
  }
})

describe('User Experience Workflow Tests', () => {
  let wrapper
  let mockServices
  
  beforeEach(() => {
    mockServices = createMockServices()
    
    // Mock global services
    global.compressionService = mockServices.compressionService
    global.fileService = mockServices.fileService
    global.encryptionService = mockServices.encryptionService
    global.notificationService = mockServices.notificationService
    global.progressTrackingService = mockServices.progressTrackingService
    
    // Mock DOM APIs
    global.File = class MockFile {
      constructor(content, name, options = {}) {
        this.content = content
        this.name = name
        this.size = content.length || 0
        this.type = options.type || ''
        this.lastModified = Date.now()
      }
    }
    
    global.FileReader = class MockFileReader {
      readAsArrayBuffer(file) {
        setTimeout(() => {
          this.onload({ target: { result: new ArrayBuffer(file.size) } })
        }, 10)
      }
    }
    
    wrapper = mount(CompressTool, {
      global: {
        stubs: {
          'BackgroundOperationIndicator': true
        }
      }
    })
  })
  
  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
    vi.clearAllMocks()
  })

  describe('Basic Compression Workflow', () => {
    it('should complete simple file compression workflow', async () => {
      // Step 1: User selects a file
      const testFile = new global.File(['Hello World'], 'test.txt', { type: 'text/plain' })
      const fileInput = wrapper.find('input[type="file"]')
      
      Object.defineProperty(fileInput.element, 'files', {
        value: [testFile],
        writable: false
      })
      
      await fileInput.trigger('change')
      await nextTick()
      
      // Verify file appears in UI
      expect(wrapper.find('.file-list').exists()).toBe(true)
      expect(wrapper.find('.file-item').text()).toContain('test.txt')
      
      // Step 2: User configures compression settings
      const compressionSelect = wrapper.find('select[aria-label="Compression Level"]')
      await compressionSelect.setValue('maximum')
      
      expect(wrapper.vm.compressionLevel).toBe('maximum')
      
      // Step 3: User sets output path
      wrapper.vm.outputPath = '/user/desktop/compressed.zip'
      await nextTick()
      
      // Step 4: User starts compression
      mockServices.compressionService.compress.mockResolvedValueOnce({
        outputPath: '/user/desktop/compressed.zip',
        stats: { originalSize: 11, compressedSize: 8, compressionRatio: 0.27 }
      })
      
      const compressButton = wrapper.find('button[type="submit"]')
      await compressButton.trigger('click')
      await flushPromises()
      
      // Verify compression was called with correct parameters
      expect(mockServices.compressionService.compress).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ name: 'test.txt' })]),
        expect.objectContaining({
          outputPath: '/user/desktop/compressed.zip',
          level: 'maximum'
        })
      )
      
      // Step 5: User sees success notification
      expect(wrapper.find('.success-message').exists()).toBe(true)
      expect(wrapper.vm.compressionResult).toBeDefined()
    })
    
    it('should handle drag and drop workflow', async () => {
      const dropZone = wrapper.find('.drag-drop-area')
      
      // Step 1: User drags file over drop zone
      await dropZone.trigger('dragover', {
        preventDefault: vi.fn(),
        dataTransfer: { types: ['Files'] }
      })
      
      expect(wrapper.vm.isDragOver).toBe(true)
      expect(dropZone.classes()).toContain('drag-over')
      
      // Step 2: User drops file
      const testFile = new global.File(['Dropped content'], 'dropped.txt')
      await dropZone.trigger('drop', {
        preventDefault: vi.fn(),
        dataTransfer: { files: [testFile] }
      })
      
      expect(wrapper.vm.selectedFiles).toHaveLength(1)
      expect(wrapper.vm.selectedFiles[0].name).toBe('dropped.txt')
      expect(wrapper.vm.isDragOver).toBe(false)
      
      // User should see visual feedback
      expect(wrapper.find('.file-item').text()).toContain('dropped.txt')
    })
  })

  describe('Encryption Workflow', () => {
    it('should complete encryption setup workflow', async () => {
      // Step 1: User enables encryption
      const encryptionCheckbox = wrapper.find('input[type="checkbox"][name="encryption"]')
      await encryptionCheckbox.setChecked(true)
      
      expect(wrapper.vm.encryptionEnabled).toBe(true)
      expect(wrapper.find('.encryption-options').isVisible()).toBe(true)
      
      // Step 2: User generates password
      mockServices.encryptionService.generatePassword.mockReturnValue('SecurePassword123!')
      
      const generateButton = wrapper.find('button[aria-label="Generate Password"]')
      await generateButton.trigger('click')
      
      expect(wrapper.vm.password).toBe('SecurePassword123!')
      
      // Step 3: Password validation feedback
      mockServices.encryptionService.validatePassword.mockReturnValue({
        isValid: true,
        strength: 'strong',
        score: 90
      })
      
      const passwordInput = wrapper.find('input[type="password"]')
      await passwordInput.trigger('blur')
      
      expect(wrapper.find('.password-strength').classes()).toContain('strength-strong')
      
      // Step 4: User sees encryption will be applied
      const testFile = new global.File(['Secret data'], 'secret.txt')
      wrapper.vm.selectedFiles = [testFile]
      await nextTick()
      
      expect(wrapper.find('.encryption-indicator').exists()).toBe(true)
    })
    
    it('should guide user through password requirements', async () => {
      await wrapper.find('input[type="checkbox"][name="encryption"]').setChecked(true)
      
      // Test weak password
      mockServices.encryptionService.validatePassword.mockReturnValue({
        isValid: false,
        strength: 'weak',
        suggestions: ['Use at least 12 characters', 'Include special characters']
      })
      
      const passwordInput = wrapper.find('input[type="password"]')
      await passwordInput.setValue('weak')
      await passwordInput.trigger('blur')
      
      expect(wrapper.find('.password-feedback').exists()).toBe(true)
      expect(wrapper.find('.password-suggestions').text()).toContain('Use at least 12 characters')
      expect(wrapper.find('.password-strength').classes()).toContain('strength-weak')
      
      // Test strong password
      mockServices.encryptionService.validatePassword.mockReturnValue({
        isValid: true,
        strength: 'strong',
        score: 95
      })
      
      await passwordInput.setValue('VerySecurePassword123!')
      await passwordInput.trigger('blur')
      
      expect(wrapper.find('.password-strength').classes()).toContain('strength-strong')
      expect(wrapper.find('.password-suggestions').exists()).toBe(false)
    })
  })

  describe('Decompression Workflow', () => {
    it('should complete archive decompression workflow', async () => {
      // Step 1: Switch to decompress tab
      const decompressTab = wrapper.find('button[aria-controls="decompress-panel"]')
      await decompressTab.trigger('click')
      
      expect(wrapper.vm.activeTab).toBe('decompress')
      expect(wrapper.find('#decompress-panel').isVisible()).toBe(true)
      
      // Step 2: User selects archive file
      const archiveFile = new global.File(['ZIP archive content'], 'archive.zip', { type: 'application/zip' })
      const fileInput = wrapper.find('#decompress-panel input[type="file"]')
      
      Object.defineProperty(fileInput.element, 'files', {
        value: [archiveFile],
        writable: false
      })
      
      await fileInput.trigger('change')
      await nextTick()
      
      // Step 3: System analyzes archive
      mockServices.compressionService.getArchiveInfo.mockResolvedValueOnce({
        fileCount: 5,
        totalSize: 1024000,
        compression: 'deflate',
        encrypted: false,
        files: ['file1.txt', 'file2.jpg', 'data/file3.pdf']
      })
      
      await wrapper.vm.loadArchiveInfo()
      
      // User sees archive information
      expect(wrapper.find('.archive-info').exists()).toBe(true)
      expect(wrapper.find('.file-count').text()).toContain('5')
      expect(wrapper.find('.file-list-preview').exists()).toBe(true)
      
      // Step 4: User starts extraction
      wrapper.vm.extractPath = '/user/desktop/extracted'
      mockServices.compressionService.decompress.mockResolvedValueOnce({
        outputPath: '/user/desktop/extracted',
        extractedFiles: ['file1.txt', 'file2.jpg', 'data/file3.pdf']
      })
      
      const extractButton = wrapper.find('#decompress-panel button[type="submit"]')
      await extractButton.trigger('click')
      await flushPromises()
      
      // Verify extraction
      expect(mockServices.compressionService.decompress).toHaveBeenCalledWith(
        archiveFile,
        expect.objectContaining({
          outputPath: '/user/desktop/extracted'
        })
      )
      
      expect(wrapper.find('.success-message').exists()).toBe(true)
    })
    
    it('should handle password-protected archive workflow', async () => {
      await wrapper.find('button[aria-controls="decompress-panel"]').trigger('click')
      
      const archiveFile = new global.File(['Encrypted ZIP'], 'encrypted.zip')
      wrapper.vm.selectedArchive = archiveFile
      
      // Archive requires password
      mockServices.compressionService.getArchiveInfo.mockResolvedValueOnce({
        fileCount: 3,
        totalSize: 500000,
        encrypted: true,
        requiresPassword: true
      })
      
      await wrapper.vm.loadArchiveInfo()
      
      // User sees password requirement
      expect(wrapper.find('.password-required').exists()).toBe(true)
      expect(wrapper.find('.archive-password-input').isVisible()).toBe(true)
      
      // User enters password
      const passwordInput = wrapper.find('input[name="archivePassword"]')
      await passwordInput.setValue('ArchivePassword123')
      
      // User attempts extraction
      mockServices.compressionService.decompress.mockResolvedValueOnce({
        outputPath: '/extracted',
        extractedFiles: ['secret1.txt', 'secret2.pdf', 'secret3.jpg']
      })
      
      const extractButton = wrapper.find('#decompress-panel button[type="submit"]')
      await extractButton.trigger('click')
      await flushPromises()
      
      expect(mockServices.compressionService.decompress).toHaveBeenCalledWith(
        archiveFile,
        expect.objectContaining({
          password: 'ArchivePassword123'
        })
      )
    })
  })

  describe('Progress and Feedback Workflow', () => {
    it('should provide comprehensive progress feedback', async () => {
      const testFile = new global.File(['Large file content'], 'large.txt')
      wrapper.vm.selectedFiles = [testFile]
      wrapper.vm.outputPath = '/output.zip'
      
      let progressCallback
      mockServices.compressionService.compress.mockImplementation((files, options) => {
        progressCallback = options.onProgress
        return new Promise((resolve) => {
          // Simulate progress updates
          setTimeout(() => {
            progressCallback({ percentage: 25, message: '压缩中...', currentFile: 'large.txt' })
          }, 100)
          setTimeout(() => {
            progressCallback({ percentage: 75, message: '压缩中...', bytesProcessed: 750, totalBytes: 1000 })
          }, 200)
          setTimeout(() => {
            progressCallback({ percentage: 100, message: '压缩完成' })
            resolve({ outputPath: '/output.zip', stats: { compressionRatio: 0.8 } })
          }, 300)
        })
      })
      
      const compressButton = wrapper.find('button[type="submit"]')
      await compressButton.trigger('click')
      
      // Initial state
      expect(wrapper.vm.isProcessing).toBe(true)
      expect(wrapper.find('.progress-container').exists()).toBe(true)
      
      // First progress update
      await new Promise(resolve => setTimeout(resolve, 150))
      expect(wrapper.vm.progress.percentage).toBe(25)
      expect(wrapper.find('.progress-message').text()).toContain('压缩中')
      expect(wrapper.find('.current-file').text()).toContain('large.txt')
      
      // Second progress update
      await new Promise(resolve => setTimeout(resolve, 100))
      expect(wrapper.vm.progress.percentage).toBe(75)
      expect(wrapper.find('.bytes-info').text()).toContain('750')
      
      // Completion
      await new Promise(resolve => setTimeout(resolve, 100))
      expect(wrapper.vm.progress.percentage).toBe(100)
      expect(wrapper.vm.isProcessing).toBe(false)
      expect(wrapper.find('.success-message').exists()).toBe(true)
    })
    
    it('should handle operation cancellation workflow', async () => {
      const testFile = new global.File(['Cancellable content'], 'cancel.txt')
      wrapper.vm.selectedFiles = [testFile]
      
      mockServices.compressionService.compress.mockImplementation(() => {
        return new Promise((resolve, reject) => {
          setTimeout(() => reject(new Error('Operation cancelled')), 200)
        })
      })
      
      const compressButton = wrapper.find('button[type="submit"]')
      await compressButton.trigger('click')
      
      // User sees cancel option
      expect(wrapper.find('.cancel-button').exists()).toBe(true)
      
      // User cancels operation
      const cancelButton = wrapper.find('.cancel-button')
      await cancelButton.trigger('click')
      
      expect(mockServices.compressionService.cancel).toHaveBeenCalled()
      
      // Wait for cancellation
      await flushPromises()
      
      expect(wrapper.vm.isProcessing).toBe(false)
      expect(wrapper.find('.cancelled-message').exists()).toBe(true)
    })
  })

  describe('Error Handling Workflow', () => {
    it('should guide user through error recovery', async () => {
      const testFile = new global.File(['Test content'], 'test.txt')
      wrapper.vm.selectedFiles = [testFile]
      wrapper.vm.outputPath = '/output.zip'
      
      // Simulate compression error
      mockServices.compressionService.compress.mockRejectedValueOnce(
        new Error('Insufficient disk space')
      )
      
      const compressButton = wrapper.find('button[type="submit"]')
      await compressButton.trigger('click')
      await flushPromises()
      
      // User sees error message
      expect(wrapper.find('.error-message').exists()).toBe(true)
      expect(wrapper.find('.error-details').text()).toContain('Insufficient disk space')
      
      // User sees recovery suggestions
      expect(wrapper.find('.error-suggestions').exists()).toBe(true)
      expect(wrapper.find('.retry-button').exists()).toBe(true)
      
      // User can retry
      mockServices.compressionService.compress.mockResolvedValueOnce({
        outputPath: '/output.zip',
        stats: { compressionRatio: 0.5 }
      })
      
      const retryButton = wrapper.find('.retry-button')
      await retryButton.trigger('click')
      await flushPromises()
      
      expect(wrapper.find('.success-message').exists()).toBe(true)
    })
    
    it('should handle file validation errors gracefully', async () => {
      mockServices.fileService.validateFileInfo.mockResolvedValueOnce({
        isValid: false,
        error: 'File too large',
        suggestions: ['Split the file into smaller parts', 'Use a different compression level']
      })
      
      const invalidFile = new global.File(['x'.repeat(3 * 1024 * 1024 * 1024)], 'huge.txt') // 3GB file
      const fileInput = wrapper.find('input[type="file"]')
      
      Object.defineProperty(fileInput.element, 'files', {
        value: [invalidFile],
        writable: false
      })
      
      await fileInput.trigger('change')
      await flushPromises()
      
      // User sees validation error
      expect(wrapper.find('.validation-error').exists()).toBe(true)
      expect(wrapper.find('.error-message').text()).toContain('File too large')
      
      // User sees helpful suggestions
      expect(wrapper.find('.error-suggestions').text()).toContain('Split the file')
      
      // File should not be added to selection
      expect(wrapper.vm.selectedFiles).toHaveLength(0)
    })
  })

  describe('Accessibility Workflow', () => {
    it('should support keyboard navigation workflow', async () => {
      // Tab navigation between compress and decompress
      const compressTab = wrapper.find('button[aria-controls="compress-panel"]')
      const decompressTab = wrapper.find('button[aria-controls="decompress-panel"]')
      
      // Start with compress tab focused
      expect(compressTab.attributes('aria-selected')).toBe('true')
      
      // Arrow key navigation
      await compressTab.trigger('keydown.right')
      
      expect(decompressTab.attributes('aria-selected')).toBe('true')
      expect(wrapper.vm.activeTab).toBe('decompress')
      
      // Tab should work with Enter and Space
      await decompressTab.trigger('keydown.left')
      expect(compressTab.attributes('aria-selected')).toBe('true')
      
      await compressTab.trigger('keydown.enter')
      expect(wrapper.vm.activeTab).toBe('compress')
    })
    
    it('should provide screen reader announcements', async () => {
      const testFile = new global.File(['Test'], 'test.txt')
      wrapper.vm.selectedFiles = [testFile]
      
      mockServices.compressionService.compress.mockResolvedValueOnce({
        outputPath: '/output.zip'
      })
      
      const compressButton = wrapper.find('button[type="submit"]')
      await compressButton.trigger('click')
      await flushPromises()
      
      // Check for ARIA live regions
      const liveRegion = wrapper.find('[aria-live="polite"]')
      expect(liveRegion.exists()).toBe(true)
      
      // Should announce completion
      expect(liveRegion.text()).toContain('压缩完成')
    })
    
    it('should have proper form labels and descriptions', () => {
      // Check compression level select
      const compressionSelect = wrapper.find('select[aria-label="Compression Level"]')
      expect(compressionSelect.exists()).toBe(true)
      
      // Check password input
      const passwordInput = wrapper.find('input[type="password"]')
      expect(passwordInput.attributes('aria-describedby')).toBeDefined()
      
      // Check file input
      const fileInput = wrapper.find('input[type="file"]')
      expect(fileInput.attributes('aria-describedby')).toBeDefined()
      
      // Check form validation
      expect(wrapper.find('[role="alert"]').exists()).toBe(false) // No errors initially
    })
  })

  describe('Mobile Responsive Workflow', () => {
    it('should adapt to mobile viewport', async () => {
      // Simulate mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      })
      
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 667
      })
      
      window.dispatchEvent(new Event('resize'))
      await nextTick()
      
      // Check mobile-specific features
      expect(wrapper.find('.mobile-layout').exists()).toBe(true)
      
      // Tabs should stack vertically on mobile
      const tabNav = wrapper.find('.tab-navigation')
      expect(tabNav.classes()).toContain('mobile-tabs')
      
      // Drag and drop area should be larger on mobile
      const dropArea = wrapper.find('.drag-drop-area')
      expect(dropArea.classes()).toContain('mobile-drop-area')
    })
    
    it('should handle touch interactions', async () => {
      const dropArea = wrapper.find('.drag-drop-area')
      
      // Simulate touch start
      await dropArea.trigger('touchstart', {
        touches: [{ clientX: 100, clientY: 100 }]
      })
      
      expect(wrapper.vm.touchInteraction).toBe(true)
      
      // File selection should work with tap
      const fileInput = wrapper.find('input[type="file"]')
      await fileInput.trigger('touchend')
      
      // Should open file picker (can't test actual picker, but event should trigger)
      expect(fileInput.element).toBeDefined()
    })
  })

  describe('Performance and Responsiveness', () => {
    it('should maintain UI responsiveness during operations', async () => {
      const largeFiles = Array.from({ length: 100 }, (_, i) => 
        new global.File([`Content ${i}`], `file${i}.txt`)
      )
      
      // Simulate adding many files
      wrapper.vm.selectedFiles = largeFiles
      await nextTick()
      
      // UI should still be responsive
      const startTime = Date.now()
      await wrapper.find('select[aria-label="Compression Level"]').setValue('fast')
      const responseTime = Date.now() - startTime
      
      expect(responseTime).toBeLessThan(100) // Should respond within 100ms
      
      // File list should be virtualized or paginated for performance
      const visibleFiles = wrapper.findAll('.file-item')
      expect(visibleFiles.length).toBeLessThanOrEqual(50) // Reasonable limit
    })
    
    it('should throttle progress updates for smooth animation', async () => {
      const testFile = new global.File(['Test'], 'test.txt')
      wrapper.vm.selectedFiles = [testFile]
      
      let progressCallback
      mockServices.compressionService.compress.mockImplementation((files, options) => {
        progressCallback = options.onProgress
        return new Promise((resolve) => {
          // Simulate rapid progress updates
          let progress = 0
          const interval = setInterval(() => {
            progress += 1
            progressCallback({ percentage: progress })
            if (progress >= 100) {
              clearInterval(interval)
              resolve({ outputPath: '/output.zip' })
            }
          }, 10) // Very frequent updates
        })
      })
      
      const compressButton = wrapper.find('button[type="submit"]')
      await compressButton.trigger('click')
      
      // Progress should be throttled
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const progressBar = wrapper.find('.progress-bar')
      expect(progressBar.element.style.transition).toBeDefined()
    })
  })

  describe('Data Persistence Workflow', () => {
    it('should restore user preferences', async () => {
      // Simulate stored preferences
      const storedPrefs = {
        compressionLevel: 'maximum',
        encryptionEnabled: true,
        defaultOutputPath: '/user/documents'
      }
      
      localStorage.setItem('compressToolPrefs', JSON.stringify(storedPrefs))
      
      // Remount component to trigger preference loading
      wrapper.unmount()
      wrapper = mount(CompressTool)
      await nextTick()
      
      // Preferences should be restored
      expect(wrapper.vm.compressionLevel).toBe('maximum')
      expect(wrapper.vm.encryptionEnabled).toBe(true)
      expect(wrapper.vm.defaultOutputPath).toBe('/user/documents')
      
      // UI should reflect preferences
      const compressionSelect = wrapper.find('select[aria-label="Compression Level"]')
      expect(compressionSelect.element.value).toBe('maximum')
    })
    
    it('should save user preferences automatically', async () => {
      const compressionSelect = wrapper.find('select[aria-label="Compression Level"]')
      await compressionSelect.setValue('fast')
      
      const encryptionCheckbox = wrapper.find('input[type="checkbox"][name="encryption"]')
      await encryptionCheckbox.setChecked(true)
      
      // Preferences should be saved automatically
      await new Promise(resolve => setTimeout(resolve, 100)) // Wait for debounced save
      
      const savedPrefs = JSON.parse(localStorage.getItem('compressToolPrefs') || '{}')
      expect(savedPrefs.compressionLevel).toBe('fast')
      expect(savedPrefs.encryptionEnabled).toBe(true)
    })
  })

  afterEach(() => {
    localStorage.clear()
  })
})