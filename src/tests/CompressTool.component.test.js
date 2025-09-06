/**
 * CompressTool Component Integration Tests
 * 
 * Comprehensive test suite for the main compression tool component
 * including UI interactions, drag-and-drop, and workflow testing.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CompressTool from '../views/CompressTool.vue'

describe('CompressTool Component', () => {
  let wrapper
  let mockCompressionService
  let mockFileService
  let mockEncryptionService
  
  beforeEach(() => {
    // Mock all services
    mockCompressionService = {
      compress: vi.fn().mockResolvedValue({ 
        outputPath: '/test/output.zip',
        stats: { originalSize: 1000, compressedSize: 500, compressionRatio: 0.5 }
      }),
      decompress: vi.fn().mockResolvedValue({ 
        outputPath: '/test/extracted/',
        extractedFiles: ['file1.txt', 'file2.jpg']
      }),
      getArchiveInfo: vi.fn().mockResolvedValue({
        fileCount: 2,
        totalSize: 500,
        compression: 'deflate'
      })
    }
    
    mockFileService = {
      validateFileInfo: vi.fn().mockResolvedValue({
        isValid: true,
        path: '/test/file.txt',
        size: 1000,
        type: 'text/plain'
      }),
      getFileInfo: vi.fn().mockResolvedValue({
        path: '/test/file.txt',
        size: 1000,
        type: 'text/plain',
        lastModified: new Date()
      })
    }
    
    mockEncryptionService = {
      generatePassword: vi.fn().mockReturnValue('generated-password'),
      validatePassword: vi.fn().mockReturnValue({ isValid: true, strength: 'strong' })
    }
    
    // Mock global services
    global.compressionService = mockCompressionService
    global.fileService = mockFileService
    global.encryptionService = mockEncryptionService
    
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

  describe('Component Initialization', () => {
    it('should render with correct initial state', () => {
      expect(wrapper.find('h1').text()).toBe('压缩/解压缩')
      expect(wrapper.find('[role="tab"][aria-selected="true"]').text()).toBe('压缩文件')
      expect(wrapper.vm.activeTab).toBe('compress')
    })
    
    it('should have all required form elements in compress tab', () => {
      expect(wrapper.find('#compress-panel').exists()).toBe(true)
      expect(wrapper.find('.drag-drop-area').exists()).toBe(true)
      expect(wrapper.find('select[aria-label="Compression Level"]').exists()).toBe(true)
      expect(wrapper.find('input[type="password"]').exists()).toBe(true)
      expect(wrapper.find('button[type="submit"]').exists()).toBe(true)
    })
    
    it('should initialize with correct default values', () => {
      expect(wrapper.vm.compressionLevel).toBe('normal')
      expect(wrapper.vm.encryptionEnabled).toBe(false)
      expect(wrapper.vm.selectedFiles).toEqual([])
      expect(wrapper.vm.isProcessing).toBe(false)
    })
  })

  describe('Tab Navigation', () => {
    it('should switch between compress and decompress tabs', async () => {
      const decompressTab = wrapper.find('button[aria-controls="decompress-panel"]')
      
      await decompressTab.trigger('click')
      
      expect(wrapper.vm.activeTab).toBe('decompress')
      expect(wrapper.find('#decompress-panel').isVisible()).toBe(true)
      expect(wrapper.find('#compress-panel').isVisible()).toBe(false)
    })
    
    it('should update aria-selected attributes correctly', async () => {
      const compressTab = wrapper.find('button[aria-controls="compress-panel"]')
      const decompressTab = wrapper.find('button[aria-controls="decompress-panel"]')
      
      expect(compressTab.attributes('aria-selected')).toBe('true')
      expect(decompressTab.attributes('aria-selected')).toBe('false')
      
      await decompressTab.trigger('click')
      
      expect(compressTab.attributes('aria-selected')).toBe('false')
      expect(decompressTab.attributes('aria-selected')).toBe('true')
    })
  })

  describe('File Selection and Drag-and-Drop', () => {
    it('should handle file input change', async () => {
      const fileInput = wrapper.find('input[type="file"]')
      const mockFile = new File(['content'], 'test.txt', { type: 'text/plain' })
      
      Object.defineProperty(fileInput.element, 'files', {
        value: [mockFile],
        writable: false
      })
      
      await fileInput.trigger('change')
      
      expect(wrapper.vm.selectedFiles).toHaveLength(1)
      expect(wrapper.vm.selectedFiles[0].name).toBe('test.txt')
    })
    
    it('should handle drag over events', async () => {
      const dropArea = wrapper.find('.drag-drop-area')
      
      await dropArea.trigger('dragover', {
        preventDefault: vi.fn(),
        dataTransfer: { types: ['Files'] }
      })
      
      expect(wrapper.vm.isDragOver).toBe(true)
    })
    
    it('should handle drag leave events', async () => {
      wrapper.vm.isDragOver = true
      const dropArea = wrapper.find('.drag-drop-area')
      
      await dropArea.trigger('dragleave')
      
      expect(wrapper.vm.isDragOver).toBe(false)
    })
    
    it('should handle file drop', async () => {
      const dropArea = wrapper.find('.drag-drop-area')
      const mockFile = new File(['content'], 'dropped.txt', { type: 'text/plain' })
      
      await dropArea.trigger('drop', {
        preventDefault: vi.fn(),
        dataTransfer: {
          files: [mockFile]
        }
      })
      
      expect(wrapper.vm.selectedFiles).toHaveLength(1)
      expect(wrapper.vm.selectedFiles[0].name).toBe('dropped.txt')
      expect(wrapper.vm.isDragOver).toBe(false)
    })
    
    it('should validate file types and sizes', async () => {
      const mockLargeFile = new File(['x'.repeat(3 * 1024 * 1024 * 1024)], 'large.txt', { 
        type: 'text/plain' 
      })
      
      mockFileService.validateFileInfo.mockResolvedValueOnce({
        isValid: false,
        error: 'File too large'
      })
      
      await wrapper.vm.handleFileSelection([mockLargeFile])
      
      expect(wrapper.vm.validationErrors).toContain('File too large')
    })
  })

  describe('Compression Configuration', () => {
    it('should update compression level', async () => {
      const levelSelect = wrapper.find('select[aria-label="Compression Level"]')
      
      await levelSelect.setValue('maximum')
      
      expect(wrapper.vm.compressionLevel).toBe('maximum')
    })
    
    it('should toggle encryption', async () => {
      const encryptionCheckbox = wrapper.find('input[type="checkbox"][name="encryption"]')
      
      await encryptionCheckbox.setChecked(true)
      
      expect(wrapper.vm.encryptionEnabled).toBe(true)
      expect(wrapper.find('input[type="password"]').isVisible()).toBe(true)
    })
    
    it('should validate password when encryption is enabled', async () => {
      wrapper.vm.encryptionEnabled = true
      await nextTick()
      
      const passwordInput = wrapper.find('input[type="password"]')
      await passwordInput.setValue('weak')
      
      mockEncryptionService.validatePassword.mockReturnValueOnce({
        isValid: false,
        strength: 'weak',
        suggestions: ['Use longer password']
      })
      
      await passwordInput.trigger('blur')
      
      expect(wrapper.vm.passwordValidation.isValid).toBe(false)
      expect(wrapper.vm.passwordValidation.suggestions).toContain('Use longer password')
    })
    
    it('should generate strong password', async () => {
      wrapper.vm.encryptionEnabled = true
      await nextTick()
      
      const generateButton = wrapper.find('button[aria-label="Generate Password"]')
      await generateButton.trigger('click')
      
      expect(mockEncryptionService.generatePassword).toHaveBeenCalled()
      expect(wrapper.vm.password).toBe('generated-password')
    })
  })

  describe('Compression Process', () => {
    beforeEach(async () => {
      // Set up files and configuration
      wrapper.vm.selectedFiles = [
        new File(['content'], 'test.txt', { type: 'text/plain' })
      ]
      wrapper.vm.compressionLevel = 'normal'
      wrapper.vm.outputPath = '/test/output.zip'
    })
    
    it('should start compression process', async () => {
      const compressButton = wrapper.find('button[type="submit"]')
      
      await compressButton.trigger('click')
      
      expect(wrapper.vm.isProcessing).toBe(true)
      expect(mockCompressionService.compress).toHaveBeenCalledWith(
        expect.arrayContaining([expect.any(File)]),
        expect.objectContaining({
          level: 'normal',
          outputPath: '/test/output.zip'
        })
      )
    })
    
    it('should handle compression success', async () => {
      const compressButton = wrapper.find('button[type="submit"]')
      
      await compressButton.trigger('click')
      await nextTick()
      
      expect(wrapper.vm.compressionResult).toEqual({
        outputPath: '/test/output.zip',
        stats: { originalSize: 1000, compressedSize: 500, compressionRatio: 0.5 }
      })
      expect(wrapper.vm.isProcessing).toBe(false)
      expect(wrapper.find('.success-message').exists()).toBe(true)
    })
    
    it('should handle compression errors', async () => {
      mockCompressionService.compress.mockRejectedValueOnce(
        new Error('Compression failed')
      )
      
      const compressButton = wrapper.find('button[type="submit"]')
      await compressButton.trigger('click')
      await nextTick()
      
      expect(wrapper.vm.isProcessing).toBe(false)
      expect(wrapper.vm.error).toBe('Compression failed')
      expect(wrapper.find('.error-message').exists()).toBe(true)
    })
    
    it('should show progress during compression', async () => {
      let progressCallback
      mockCompressionService.compress.mockImplementationOnce((files, options) => {
        progressCallback = options.onProgress
        return new Promise((resolve) => {
          setTimeout(() => {
            progressCallback({ progress: 50, message: 'Compressing...' })
            setTimeout(() => {
              progressCallback({ progress: 100, message: 'Complete' })
              resolve({ outputPath: '/test/output.zip' })
            }, 10)
          }, 10)
        })
      })
      
      const compressButton = wrapper.find('button[type="submit"]')
      await compressButton.trigger('click')
      
      await nextTick()
      expect(wrapper.vm.progress.percentage).toBe(50)
      
      await new Promise(resolve => setTimeout(resolve, 50))
      expect(wrapper.vm.progress.percentage).toBe(100)
    })
  })

  describe('Decompression Process', () => {
    beforeEach(async () => {
      // Switch to decompress tab
      const decompressTab = wrapper.find('button[aria-controls="decompress-panel"]')
      await decompressTab.trigger('click')
      
      // Set up archive file
      wrapper.vm.selectedArchive = new File(['archive'], 'test.zip', { 
        type: 'application/zip' 
      })
    })
    
    it('should show archive information when file is selected', async () => {
      await wrapper.vm.loadArchiveInfo()
      
      expect(mockCompressionService.getArchiveInfo).toHaveBeenCalled()
      expect(wrapper.vm.archiveInfo).toEqual({
        fileCount: 2,
        totalSize: 500,
        compression: 'deflate'
      })
      expect(wrapper.find('.archive-info').exists()).toBe(true)
    })
    
    it('should start decompression process', async () => {
      const extractButton = wrapper.find('#decompress-panel button[type="submit"]')
      
      await extractButton.trigger('click')
      
      expect(wrapper.vm.isProcessing).toBe(true)
      expect(mockCompressionService.decompress).toHaveBeenCalledWith(
        wrapper.vm.selectedArchive,
        expect.objectContaining({
          outputPath: expect.any(String)
        })
      )
    })
    
    it('should handle password-protected archives', async () => {
      wrapper.vm.archiveRequiresPassword = true
      wrapper.vm.archivePassword = 'test123'
      await nextTick()
      
      const extractButton = wrapper.find('#decompress-panel button[type="submit"]')
      await extractButton.trigger('click')
      
      expect(mockCompressionService.decompress).toHaveBeenCalledWith(
        wrapper.vm.selectedArchive,
        expect.objectContaining({
          password: 'test123'
        })
      )
    })
  })

  describe('File Management', () => {
    it('should remove selected files', async () => {
      wrapper.vm.selectedFiles = [
        new File(['content1'], 'file1.txt', { type: 'text/plain' }),
        new File(['content2'], 'file2.txt', { type: 'text/plain' })
      ]
      await nextTick()
      
      const removeButtons = wrapper.findAll('[aria-label="Remove file"]')
      await removeButtons[0].trigger('click')
      
      expect(wrapper.vm.selectedFiles).toHaveLength(1)
      expect(wrapper.vm.selectedFiles[0].name).toBe('file2.txt')
    })
    
    it('should clear all selected files', async () => {
      wrapper.vm.selectedFiles = [
        new File(['content1'], 'file1.txt', { type: 'text/plain' }),
        new File(['content2'], 'file2.txt', { type: 'text/plain' })
      ]
      await nextTick()
      
      const clearButton = wrapper.find('[aria-label="Clear all files"]')
      await clearButton.trigger('click')
      
      expect(wrapper.vm.selectedFiles).toHaveLength(0)
    })
    
    it('should display file information correctly', async () => {
      const mockFile = new File(['x'.repeat(1024)], 'test.txt', { 
        type: 'text/plain' 
      })
      wrapper.vm.selectedFiles = [mockFile]
      await nextTick()
      
      const fileInfo = wrapper.find('.file-info')
      expect(fileInfo.text()).toContain('test.txt')
      expect(fileInfo.text()).toContain('1.00 KB')
      expect(fileInfo.text()).toContain('text/plain')
    })
  })

  describe('Error Handling and Validation', () => {
    it('should show validation errors for empty file selection', async () => {
      const compressButton = wrapper.find('button[type="submit"]')
      
      await compressButton.trigger('click')
      
      expect(wrapper.vm.validationErrors).toContain('请选择要压缩的文件')
    })
    
    it('should validate output path', async () => {
      wrapper.vm.selectedFiles = [new File(['content'], 'test.txt')]
      wrapper.vm.outputPath = ''
      
      const compressButton = wrapper.find('button[type="submit"]')
      await compressButton.trigger('click')
      
      expect(wrapper.vm.validationErrors).toContain('请选择输出路径')
    })
    
    it('should handle service errors gracefully', async () => {
      wrapper.vm.selectedFiles = [new File(['content'], 'test.txt')]
      mockCompressionService.compress.mockRejectedValueOnce(
        new Error('Service unavailable')
      )
      
      const compressButton = wrapper.find('button[type="submit"]')
      await compressButton.trigger('click')
      await nextTick()
      
      expect(wrapper.vm.error).toBe('Service unavailable')
      expect(wrapper.find('.error-message').text()).toContain('Service unavailable')
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      expect(wrapper.find('[role="tab"]').exists()).toBe(true)
      expect(wrapper.find('[role="tabpanel"]').exists()).toBe(true)
      expect(wrapper.find('[aria-label="Compression Level"]').exists()).toBe(true)
      expect(wrapper.find('[aria-describedby]').exists()).toBe(true)
    })
    
    it('should support keyboard navigation', async () => {
      const compressTab = wrapper.find('button[aria-controls="compress-panel"]')
      const decompressTab = wrapper.find('button[aria-controls="decompress-panel"]')
      
      await compressTab.trigger('keydown.right')
      expect(document.activeElement).toBe(decompressTab.element)
      
      await decompressTab.trigger('keydown.left')
      expect(document.activeElement).toBe(compressTab.element)
    })
    
    it('should announce status changes to screen readers', async () => {
      wrapper.vm.isProcessing = true
      await nextTick()
      
      expect(wrapper.find('[aria-live="polite"]').text()).toContain('正在处理')
      
      wrapper.vm.isProcessing = false
      wrapper.vm.compressionResult = { outputPath: '/test/output.zip' }
      await nextTick()
      
      expect(wrapper.find('[aria-live="polite"]').text()).toContain('压缩完成')
    })
  })

  describe('Performance Considerations', () => {
    it('should throttle progress updates', async () => {
      const mockProgressCallback = vi.fn()
      wrapper.vm.onProgress = mockProgressCallback
      
      // Simulate rapid progress updates
      for (let i = 0; i < 100; i++) {
        wrapper.vm.updateProgress({ progress: i, message: 'Processing...' })
      }
      
      // Should be throttled to prevent excessive updates
      expect(mockProgressCallback).toHaveBeenCalledTimes(1)
    })
    
    it('should handle large file lists efficiently', async () => {
      const largeFileList = Array.from({ length: 1000 }, (_, i) => 
        new File(['content'], `file${i}.txt`, { type: 'text/plain' })
      )
      
      const startTime = Date.now()
      wrapper.vm.selectedFiles = largeFileList
      await nextTick()
      const endTime = Date.now()
      
      // Should handle 1000 files quickly
      expect(endTime - startTime).toBeLessThan(100)
    })
  })

  describe('Integration with Background Services', () => {
    it('should show background operation indicator during processing', async () => {
      wrapper.vm.isProcessing = true
      await nextTick()
      
      expect(wrapper.findComponent({ name: 'BackgroundOperationIndicator' }).exists()).toBe(true)
    })
    
    it('should support operation cancellation', async () => {
      const mockCancellationToken = {
        cancel: vi.fn()
      }
      
      wrapper.vm.currentOperation = mockCancellationToken
      const cancelButton = wrapper.find('[aria-label="Cancel operation"]')
      
      await cancelButton.trigger('click')
      
      expect(mockCancellationToken.cancel).toHaveBeenCalled()
    })
  })
})