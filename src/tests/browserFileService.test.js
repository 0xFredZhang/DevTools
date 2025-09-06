/**
 * Browser File Service Tests
 * 
 * Comprehensive test suite for browser-compatible file operations
 * including Electron dialog integration and file validation.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { BrowserFileService } from '../services/browserFileService.js'

describe('BrowserFileService', () => {
  let browserFileService
  let mockElectronAPI
  
  beforeEach(() => {
    // Mock window and electronAPI
    global.window = {
      electronAPI: {
        dialog: {
          showOpenDialog: vi.fn(),
          showSaveDialog: vi.fn()
        }
      }
    }
    mockElectronAPI = global.window.electronAPI
    
    browserFileService = new BrowserFileService()
  })
  
  afterEach(() => {
    vi.clearAllMocks()
    delete global.window
  })

  describe('Environment Detection', () => {
    it('should detect Electron environment when available', () => {
      expect(browserFileService.isElectronAvailable()).toBe(true)
    })
    
    it('should detect non-Electron environment', () => {
      delete global.window.electronAPI
      expect(browserFileService.isElectronAvailable()).toBe(false)
    })
    
    it('should handle missing window object', () => {
      delete global.window
      expect(browserFileService.isElectronAvailable()).toBe(false)
    })
  })

  describe('File Selection Dialog', () => {
    it('should show file selection dialog with default options', async () => {
      const mockResult = {
        canceled: false,
        filePaths: ['/test/file.txt']
      }
      mockElectronAPI.dialog.showOpenDialog.mockResolvedValue(mockResult)
      
      const result = await browserFileService.selectFile()
      
      expect(mockElectronAPI.dialog.showOpenDialog).toHaveBeenCalledWith({
        title: 'Select File',
        buttonLabel: 'Select',
        filters: [
          { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['openFile']
      })
      
      expect(result).toEqual({
        canceled: false,
        filePath: '/test/file.txt'
      })
    })
    
    it('should use custom dialog options', async () => {
      const mockResult = {
        canceled: false,
        filePaths: ['/test/archive.zip']
      }
      mockElectronAPI.dialog.showOpenDialog.mockResolvedValue(mockResult)
      
      const options = {
        title: 'Select Archive',
        filters: [
          { name: 'ZIP Files', extensions: ['zip'] }
        ]
      }
      
      await browserFileService.selectFile(options)
      
      expect(mockElectronAPI.dialog.showOpenDialog).toHaveBeenCalledWith({
        title: 'Select Archive',
        buttonLabel: 'Select',
        filters: [
          { name: 'ZIP Files', extensions: ['zip'] }
        ],
        properties: ['openFile']
      })
    })
    
    it('should handle canceled dialog', async () => {
      const mockResult = { canceled: true, filePaths: [] }
      mockElectronAPI.dialog.showOpenDialog.mockResolvedValue(mockResult)
      
      const result = await browserFileService.selectFile()
      
      expect(result).toEqual({ canceled: true })
    })
    
    it('should handle dialog errors', async () => {
      const error = new Error('Dialog failed')
      mockElectronAPI.dialog.showOpenDialog.mockRejectedValue(error)
      
      await expect(browserFileService.selectFile()).rejects.toThrow('Dialog failed')
    })
  })

  describe('Multiple File Selection', () => {
    it('should support multiple file selection', async () => {
      const mockResult = {
        canceled: false,
        filePaths: ['/test/file1.txt', '/test/file2.txt']
      }
      mockElectronAPI.dialog.showOpenDialog.mockResolvedValue(mockResult)
      
      const result = await browserFileService.selectFiles()
      
      expect(mockElectronAPI.dialog.showOpenDialog).toHaveBeenCalledWith({
        title: 'Select Files',
        buttonLabel: 'Select',
        filters: [
          { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['openFile', 'multiSelections']
      })
      
      expect(result).toEqual({
        canceled: false,
        filePaths: ['/test/file1.txt', '/test/file2.txt']
      })
    })
  })

  describe('Directory Selection', () => {
    it('should show directory selection dialog', async () => {
      const mockResult = {
        canceled: false,
        filePaths: ['/test/directory']
      }
      mockElectronAPI.dialog.showOpenDialog.mockResolvedValue(mockResult)
      
      const result = await browserFileService.selectDirectory()
      
      expect(mockElectronAPI.dialog.showOpenDialog).toHaveBeenCalledWith({
        title: 'Select Directory',
        buttonLabel: 'Select',
        properties: ['openDirectory']
      })
      
      expect(result).toEqual({
        canceled: false,
        directoryPath: '/test/directory'
      })
    })
  })

  describe('Save Dialog', () => {
    it('should show save dialog with default options', async () => {
      const mockResult = {
        canceled: false,
        filePath: '/test/output.zip'
      }
      mockElectronAPI.dialog.showSaveDialog.mockResolvedValue(mockResult)
      
      const result = await browserFileService.selectSavePath()
      
      expect(mockElectronAPI.dialog.showSaveDialog).toHaveBeenCalledWith({
        title: 'Save File',
        buttonLabel: 'Save',
        filters: [
          { name: 'All Files', extensions: ['*'] }
        ]
      })
      
      expect(result).toEqual({
        canceled: false,
        filePath: '/test/output.zip'
      })
    })
    
    it('should use custom save dialog options', async () => {
      const mockResult = {
        canceled: false,
        filePath: '/test/archive.zip'
      }
      mockElectronAPI.dialog.showSaveDialog.mockResolvedValue(mockResult)
      
      const options = {
        title: 'Save Archive',
        defaultPath: 'compressed.zip',
        filters: [
          { name: 'ZIP Files', extensions: ['zip'] }
        ]
      }
      
      await browserFileService.selectSavePath(options)
      
      expect(mockElectronAPI.dialog.showSaveDialog).toHaveBeenCalledWith({
        title: 'Save Archive',
        buttonLabel: 'Save',
        defaultPath: 'compressed.zip',
        filters: [
          { name: 'ZIP Files', extensions: ['zip'] }
        ]
      })
    })
    
    it('should handle canceled save dialog', async () => {
      const mockResult = { canceled: true }
      mockElectronAPI.dialog.showSaveDialog.mockResolvedValue(mockResult)
      
      const result = await browserFileService.selectSavePath()
      
      expect(result).toEqual({ canceled: true })
    })
  })

  describe('File Validation Integration', () => {
    beforeEach(() => {
      // Mock file service validation
      vi.spyOn(browserFileService.fileService, 'validateFileInfo').mockResolvedValue({
        isValid: true,
        path: '/test/file.txt',
        size: 1024,
        type: 'text/plain'
      })
    })
    
    it('should validate selected file', async () => {
      const mockResult = {
        canceled: false,
        filePaths: ['/test/file.txt']
      }
      mockElectronAPI.dialog.showOpenDialog.mockResolvedValue(mockResult)
      
      const result = await browserFileService.selectAndValidateFile()
      
      expect(browserFileService.fileService.validateFileInfo).toHaveBeenCalledWith('/test/file.txt')
      expect(result).toEqual({
        canceled: false,
        filePath: '/test/file.txt',
        fileInfo: {
          isValid: true,
          path: '/test/file.txt',
          size: 1024,
          type: 'text/plain'
        }
      })
    })
    
    it('should handle file validation errors', async () => {
      const mockResult = {
        canceled: false,
        filePaths: ['/test/invalid.txt']
      }
      mockElectronAPI.dialog.showOpenDialog.mockResolvedValue(mockResult)
      
      const validationError = new Error('File validation failed')
      browserFileService.fileService.validateFileInfo.mockRejectedValue(validationError)
      
      await expect(browserFileService.selectAndValidateFile()).rejects.toThrow('File validation failed')
    })
  })

  describe('Non-Electron Environment', () => {
    beforeEach(() => {
      delete global.window.electronAPI
    })
    
    it('should throw error when Electron is not available', async () => {
      await expect(browserFileService.selectFile()).rejects.toThrow('Electron dialog API not available')
    })
    
    it('should provide fallback for non-Electron environments', () => {
      expect(browserFileService.isElectronAvailable()).toBe(false)
      
      // Should suggest alternative approaches
      expect(() => browserFileService.suggestAlternativeApproach()).not.toThrow()
    })
  })

  describe('Error Handling', () => {
    it('should handle dialog API failures gracefully', async () => {
      const error = new Error('Permission denied')
      mockElectronAPI.dialog.showOpenDialog.mockRejectedValue(error)
      
      await expect(browserFileService.selectFile()).rejects.toThrow('Permission denied')
    })
    
    it('should provide helpful error messages', async () => {
      const error = new Error('ENOENT: no such file or directory')
      mockElectronAPI.dialog.showOpenDialog.mockRejectedValue(error)
      
      try {
        await browserFileService.selectFile()
        expect.fail('Should have thrown an error')
      } catch (e) {
        expect(e.message).toContain('ENOENT')
      }
    })
  })

  describe('Integration with File Service', () => {
    it('should delegate file operations to underlying file service', () => {
      expect(browserFileService.fileService).toBeDefined()
      expect(browserFileService.fileService.validateFileInfo).toBeDefined()
      expect(browserFileService.fileService.getFileInfo).toBeDefined()
    })
    
    it('should maintain compatibility with file service API', async () => {
      // Mock file service methods
      vi.spyOn(browserFileService.fileService, 'getFileInfo').mockResolvedValue({
        path: '/test/file.txt',
        size: 1024,
        type: 'text/plain',
        lastModified: new Date()
      })
      
      const fileInfo = await browserFileService.fileService.getFileInfo('/test/file.txt')
      
      expect(fileInfo).toHaveProperty('path')
      expect(fileInfo).toHaveProperty('size')
      expect(fileInfo).toHaveProperty('type')
    })
  })
})