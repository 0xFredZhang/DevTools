/**
 * Comprehensive tests for CompressionService
 * 
 * Tests all aspects of the compression service including:
 * - ZIP compression with different levels
 * - ZIP decompression with directory structure preservation
 * - Progress tracking callbacks
 * - Error handling with specific error codes
 * - Large file streaming
 * - Multiple files and directory compression
 * - Archive information extraction
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'fs/promises'
import fsSync from 'fs'
import path from 'path'
import os from 'os'
import crypto from 'crypto'

import {
  CompressionService,
  CompressionFactory,
  CompressionError,
  COMPRESSION_CONFIG,
  compressionService
} from '../services/compressionService.js'

describe('CompressionService', () => {
  let testDir
  let tempFiles = []
  let tempDirs = []
  
  beforeEach(async () => {
    // Create test directory
    testDir = path.join(os.tmpdir(), `compression_test_${crypto.randomUUID()}`)
    await fs.mkdir(testDir, { recursive: true })
    tempDirs.push(testDir)
  })
  
  afterEach(async () => {
    // Clean up test files and directories
    for (const file of tempFiles) {
      try {
        await fs.unlink(file)
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    
    for (const dir of tempDirs) {
      try {
        await fs.rm(dir, { recursive: true, force: true })
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    
    tempFiles = []
    tempDirs = []
  })
  
  // Helper function to create test files
  const createTestFile = async (name, content = 'test content', size = null) => {
    const filePath = path.join(testDir, name)
    
    if (size) {
      // Create file of specific size for large file tests
      const buffer = Buffer.alloc(size)
      buffer.fill('A')
      await fs.writeFile(filePath, buffer)
    } else {
      await fs.writeFile(filePath, content)
    }
    
    tempFiles.push(filePath)
    return filePath
  }
  
  // Helper function to create test directory structure
  const createTestDir = async (name, files = []) => {
    const dirPath = path.join(testDir, name)
    await fs.mkdir(dirPath, { recursive: true })
    tempDirs.push(dirPath)
    
    for (const file of files) {
      const filePath = path.join(dirPath, file.name)
      await fs.writeFile(filePath, file.content || 'test content')
      tempFiles.push(filePath)
    }
    
    return dirPath
  }
  
  describe('CompressionFactory', () => {
    it('should create ZIP format handler', () => {
      const handler = CompressionFactory.create('zip')
      expect(handler).toBeDefined()
      expect(handler.constructor.name).toBe('ZipFormat')
    })
    
    it('should throw error for unsupported format', () => {
      expect(() => {
        CompressionFactory.create('unsupported')
      }).toThrow(CompressionError)
      
      try {
        CompressionFactory.create('unsupported')
      } catch (error) {
        expect(error.code).toBe(COMPRESSION_CONFIG.ERRORS.UNSUPPORTED_FORMAT)
      }
    })
    
    it('should return supported formats', () => {
      const formats = CompressionFactory.getSupportedFormats()
      expect(formats).toContain('zip')
      expect(Array.isArray(formats)).toBe(true)
    })
    
    it('should allow registering new formats', () => {
      class TestFormat {
        async compress() { return { success: true } }
        async decompress() { return { success: true } }
        async getArchiveInfo() { return { format: 'test' } }
      }
      
      CompressionFactory.register('test', TestFormat)
      const handler = CompressionFactory.create('test')
      expect(handler).toBeInstanceOf(TestFormat)
    })
  })
  
  describe('CompressionError', () => {
    it('should create error with code and details', () => {
      const error = new CompressionError('Test error', COMPRESSION_CONFIG.ERRORS.INVALID_INPUT, { extra: 'data' })
      
      expect(error.message).toBe('Test error')
      expect(error.code).toBe(COMPRESSION_CONFIG.ERRORS.INVALID_INPUT)
      expect(error.details.extra).toBe('data')
      expect(error.name).toBe('CompressionError')
      expect(error.timestamp).toBeDefined()
    })
    
    it('should provide user-friendly messages', () => {
      const error = new CompressionError('Test', COMPRESSION_CONFIG.ERRORS.FILE_TOO_LARGE)
      const userMessage = error.getUserMessage()
      
      expect(userMessage).toBe('文件大小超过 2GB 限制')
      expect(typeof userMessage).toBe('string')
    })
    
    it('should default to unknown error message', () => {
      const error = new CompressionError('Test', 'UNKNOWN_CODE')
      const userMessage = error.getUserMessage()
      
      expect(userMessage).toBe('发生未知错误')
    })
  })
  
  describe('ZIP Compression', () => {
    it('should compress single file successfully', async () => {
      const testFile = await createTestFile('test.txt', 'Hello, World!')
      const outputPath = path.join(testDir, 'test.zip')
      
      const result = await compressionService.compress([testFile], outputPath, {
        format: 'zip',
        level: 'normal'
      })
      
      expect(result.success).toBe(true)
      expect(result.outputPath).toBe(outputPath)
      expect(result.filesProcessed).toBe(1)
      expect(result.format).toBe('zip')
      
      // Verify ZIP file was created
      const stats = await fs.stat(outputPath)
      expect(stats.isFile()).toBe(true)
      expect(stats.size).toBeGreaterThan(0)
    })
    
    it('should compress multiple files successfully', async () => {
      const file1 = await createTestFile('file1.txt', 'Content 1')
      const file2 = await createTestFile('file2.txt', 'Content 2')
      const outputPath = path.join(testDir, 'multiple.zip')
      
      const result = await compressionService.compress([file1, file2], outputPath, {
        format: 'zip',
        level: 'fast'
      })
      
      expect(result.success).toBe(true)
      expect(result.filesProcessed).toBe(2)
      
      // Verify archive info
      const info = await compressionService.getArchiveInfo(outputPath)
      expect(info.entryCount).toBe(2)
      expect(info.entries.some(e => e.name === 'file1.txt')).toBe(true)
      expect(info.entries.some(e => e.name === 'file2.txt')).toBe(true)
    })
    
    it('should compress directory with nested structure', async () => {
      const subDir = await createTestDir('subdir', [
        { name: 'nested.txt', content: 'Nested content' },
        { name: 'another.txt', content: 'Another file' }
      ])
      
      const outputPath = path.join(testDir, 'directory.zip')
      
      const result = await compressionService.compress([subDir], outputPath, {
        format: 'zip',
        level: 'maximum'
      })
      
      expect(result.success).toBe(true)
      expect(result.filesProcessed).toBe(1)
      
      // Verify directory structure in archive
      const info = await compressionService.getArchiveInfo(outputPath)
      expect(info.entryCount).toBeGreaterThan(2) // Directory + files
      
      const hasDirectory = info.entries.some(e => e.isDirectory && e.name.includes('subdir'))
      const hasNestedFile = info.entries.some(e => e.name.includes('nested.txt'))
      const hasAnotherFile = info.entries.some(e => e.name.includes('another.txt'))
      
      expect(hasDirectory).toBe(true)
      expect(hasNestedFile).toBe(true)
      expect(hasAnotherFile).toBe(true)
    })
    
    it('should handle different compression levels', async () => {
      const content = 'A'.repeat(1000) // Repeating content compresses well
      const testFile = await createTestFile('compressible.txt', content)
      
      const fastPath = path.join(testDir, 'fast.zip')
      const normalPath = path.join(testDir, 'normal.zip')
      const maxPath = path.join(testDir, 'max.zip')
      
      // Compress with different levels
      await compressionService.compress([testFile], fastPath, { level: 'fast' })
      await compressionService.compress([testFile], normalPath, { level: 'normal' })
      await compressionService.compress([testFile], maxPath, { level: 'maximum' })
      
      // Check file sizes (maximum should be smallest)
      const fastStats = await fs.stat(fastPath)
      const normalStats = await fs.stat(normalPath)
      const maxStats = await fs.stat(maxPath)
      
      expect(maxStats.size).toBeLessThanOrEqual(normalStats.size)
      expect(normalStats.size).toBeLessThanOrEqual(fastStats.size)
    })
    
    it('should track progress during compression', async () => {
      const largeContent = 'A'.repeat(100000) // 100KB
      const testFile = await createTestFile('large.txt', largeContent)
      const outputPath = path.join(testDir, 'progress.zip')
      
      const progressUpdates = []
      
      const result = await compressionService.compress([testFile], outputPath, {
        onProgress: (progress) => {
          progressUpdates.push(progress)
          
          // Validate progress structure
          expect(progress.progress).toBeGreaterThanOrEqual(0)
          expect(progress.progress).toBeLessThanOrEqual(100)
          expect(progress.processedSize).toBeGreaterThanOrEqual(0)
          expect(progress.totalSize).toBeGreaterThan(0)
          expect(progress.elapsed).toBeGreaterThanOrEqual(0)
          expect(typeof progress.speed).toBe('number')
        }
      })
      
      expect(result.success).toBe(true)
      expect(progressUpdates.length).toBeGreaterThan(0)
      
      // Check final progress update
      const finalUpdate = progressUpdates[progressUpdates.length - 1]
      expect(finalUpdate.progress).toBe(100)
      expect(finalUpdate.completed).toBe(true)
    })
    
    it('should handle file objects with relative paths', async () => {
      const file1 = await createTestFile('source1.txt', 'Source 1')
      const file2 = await createTestFile('source2.txt', 'Source 2')
      const outputPath = path.join(testDir, 'relative.zip')
      
      const files = [
        { path: file1, relativePath: 'custom/path1.txt' },
        { path: file2, relativePath: 'custom/path2.txt' }
      ]
      
      const result = await compressionService.compress(files, outputPath)
      
      expect(result.success).toBe(true)
      
      // Verify custom relative paths in archive
      const info = await compressionService.getArchiveInfo(outputPath)
      expect(info.entries.some(e => e.name === 'custom/path1.txt')).toBe(true)
      expect(info.entries.some(e => e.name === 'custom/path2.txt')).toBe(true)
    })
    
    it('should reject files exceeding size limit', async () => {
      // Mock a very large file size
      const originalStat = fs.stat
      fs.stat = vi.fn().mockResolvedValue({
        isFile: () => true,
        isDirectory: () => false,
        size: COMPRESSION_CONFIG.MAX_FILE_SIZE + 1000
      })
      
      const testFile = await createTestFile('fake_large.txt')
      const outputPath = path.join(testDir, 'should_fail.zip')
      
      try {
        await compressionService.compress([testFile], outputPath)
        expect.fail('Should have thrown FILE_TOO_LARGE error')
      } catch (error) {
        expect(error).toBeInstanceOf(CompressionError)
        expect(error.code).toBe(COMPRESSION_CONFIG.ERRORS.FILE_TOO_LARGE)
      } finally {
        fs.stat = originalStat
      }
    })
    
    it('should handle empty file array', async () => {
      const outputPath = path.join(testDir, 'empty.zip')
      
      try {
        await compressionService.compress([], outputPath)
        expect.fail('Should have thrown INVALID_INPUT error')
      } catch (error) {
        expect(error).toBeInstanceOf(CompressionError)
        expect(error.code).toBe(COMPRESSION_CONFIG.ERRORS.INVALID_INPUT)
      }
    })
  })
  
  describe('ZIP Decompression', () => {
    it('should decompress archive successfully', async () => {
      // First create a ZIP file
      const testFile = await createTestFile('original.txt', 'Original content')
      const zipPath = path.join(testDir, 'decompress_test.zip')
      
      await compressionService.compress([testFile], zipPath)
      
      // Now decompress it
      const extractDir = path.join(testDir, 'extracted')
      const result = await compressionService.decompress(zipPath, extractDir)
      
      expect(result.success).toBe(true)
      expect(result.outputDir).toBe(extractDir)
      expect(result.filesExtracted).toBeGreaterThan(0)
      
      // Verify extracted file
      const extractedFile = path.join(extractDir, 'original.txt')
      const extractedContent = await fs.readFile(extractedFile, 'utf-8')
      expect(extractedContent).toBe('Original content')
    })
    
    it('should preserve directory structure during decompression', async () => {
      // Create directory structure
      const subDir = await createTestDir('nested/deep', [
        { name: 'file1.txt', content: 'File 1 content' },
        { name: 'file2.txt', content: 'File 2 content' }
      ])
      
      await createTestDir('nested', [
        { name: 'root_file.txt', content: 'Root file content' }
      ])
      
      const zipPath = path.join(testDir, 'structure_test.zip')
      await compressionService.compress([path.join(testDir, 'nested')], zipPath)
      
      // Decompress to new location
      const extractDir = path.join(testDir, 'extracted_structure')
      const result = await compressionService.decompress(zipPath, extractDir)
      
      expect(result.success).toBe(true)
      
      // Verify directory structure
      const deepFile1 = path.join(extractDir, 'nested', 'deep', 'file1.txt')
      const deepFile2 = path.join(extractDir, 'nested', 'deep', 'file2.txt')
      const rootFile = path.join(extractDir, 'nested', 'root_file.txt')
      
      expect(await fs.access(deepFile1).then(() => true).catch(() => false)).toBe(true)
      expect(await fs.access(deepFile2).then(() => true).catch(() => false)).toBe(true)
      expect(await fs.access(rootFile).then(() => true).catch(() => false)).toBe(true)
      
      // Verify content
      expect(await fs.readFile(deepFile1, 'utf-8')).toBe('File 1 content')
      expect(await fs.readFile(rootFile, 'utf-8')).toBe('Root file content')
    })
    
    it('should track progress during decompression', async () => {
      // Create files of various sizes
      const file1 = await createTestFile('progress1.txt', 'A'.repeat(50000))
      const file2 = await createTestFile('progress2.txt', 'B'.repeat(30000))
      const zipPath = path.join(testDir, 'progress_decompress.zip')
      
      await compressionService.compress([file1, file2], zipPath)
      
      // Decompress with progress tracking
      const extractDir = path.join(testDir, 'progress_extracted')
      const progressUpdates = []
      
      const result = await compressionService.decompress(zipPath, extractDir, {
        onProgress: (progress) => {
          progressUpdates.push(progress)
          
          expect(progress.progress).toBeGreaterThanOrEqual(0)
          expect(progress.progress).toBeLessThanOrEqual(100)
          expect(typeof progress.speed).toBe('number')
        }
      })
      
      expect(result.success).toBe(true)
      expect(progressUpdates.length).toBeGreaterThan(0)
      
      const finalUpdate = progressUpdates[progressUpdates.length - 1]
      expect(finalUpdate.progress).toBe(100)
      expect(finalUpdate.completed).toBe(true)
    })
    
    it('should handle corrupted archive', async () => {
      // Create corrupted ZIP file
      const corruptedPath = path.join(testDir, 'corrupted.zip')
      await fs.writeFile(corruptedPath, 'This is not a valid ZIP file')
      
      const extractDir = path.join(testDir, 'should_not_exist')
      
      try {
        await compressionService.decompress(corruptedPath, extractDir)
        expect.fail('Should have thrown CORRUPTED_ARCHIVE error')
      } catch (error) {
        expect(error).toBeInstanceOf(CompressionError)
        expect(error.code).toBe(COMPRESSION_CONFIG.ERRORS.CORRUPTED_ARCHIVE)
      }
    })
    
    it('should handle non-existent archive', async () => {
      const nonExistentPath = path.join(testDir, 'does_not_exist.zip')
      const extractDir = path.join(testDir, 'extract_nowhere')
      
      try {
        await compressionService.decompress(nonExistentPath, extractDir)
        expect.fail('Should have thrown error for non-existent file')
      } catch (error) {
        expect(error).toBeInstanceOf(CompressionError)
        expect(error.code).toBe(COMPRESSION_CONFIG.ERRORS.CORRUPTED_ARCHIVE)
      }
    })
  })
  
  describe('Archive Information', () => {
    it('should get comprehensive archive info', async () => {
      const file1 = await createTestFile('info1.txt', 'Content 1 with some length')
      const file2 = await createTestFile('info2.txt', 'Different content here')
      const zipPath = path.join(testDir, 'info_test.zip')
      
      await compressionService.compress([file1, file2], zipPath)
      
      const info = await compressionService.getArchiveInfo(zipPath)
      
      expect(info.format).toBe('zip')
      expect(info.path).toBe(zipPath)
      expect(info.entryCount).toBe(2)
      expect(info.totalSize).toBeGreaterThan(0)
      expect(info.compressedSize).toBeGreaterThan(0)
      expect(info.compressionRatio).toBeDefined()
      expect(Array.isArray(info.entries)).toBe(true)
      
      // Check entries
      const entry1 = info.entries.find(e => e.name === 'info1.txt')
      const entry2 = info.entries.find(e => e.name === 'info2.txt')
      
      expect(entry1).toBeDefined()
      expect(entry2).toBeDefined()
      expect(entry1.size).toBeGreaterThan(0)
      expect(entry1.compressedSize).toBeGreaterThan(0)
      expect(entry1.isDirectory).toBe(false)
      expect(entry1.compressionRatio).toBeDefined()
    })
    
    it('should handle directory entries in archive info', async () => {
      const subDir = await createTestDir('info_dir', [
        { name: 'nested.txt', content: 'Nested file' }
      ])
      
      const zipPath = path.join(testDir, 'dir_info.zip')
      await compressionService.compress([subDir], zipPath)
      
      const info = await compressionService.getArchiveInfo(zipPath)
      
      const directoryEntry = info.entries.find(e => e.isDirectory)
      const fileEntry = info.entries.find(e => !e.isDirectory && e.name.includes('nested.txt'))
      
      expect(directoryEntry).toBeDefined()
      expect(fileEntry).toBeDefined()
      expect(directoryEntry.name).toContain('info_dir')
      expect(fileEntry.size).toBeGreaterThan(0)
    })
  })
  
  describe('Operation Management', () => {
    it('should track active operations', async () => {
      const testFile = await createTestFile('operation_test.txt', 'A'.repeat(10000))
      const outputPath = path.join(testDir, 'operation.zip')
      
      // Start compression but don't await immediately
      const compressionPromise = compressionService.compress([testFile], outputPath, {
        onProgress: () => {
          // Check active operations during progress
          const activeOps = compressionService.getActiveOperations()
          expect(activeOps.length).toBeGreaterThan(0)
          
          const operation = activeOps.find(op => op.type === 'compress')
          expect(operation).toBeDefined()
          expect(operation.id).toBeDefined()
          expect(operation.startTime).toBeDefined()
          expect(typeof operation.duration).toBe('number')
        }
      })
      
      const result = await compressionPromise
      
      expect(result.success).toBe(true)
      expect(result.operationId).toBeDefined()
      
      // Operation should be cleaned up after completion
      const activeOpsAfter = compressionService.getActiveOperations()
      const operation = activeOpsAfter.find(op => op.id === result.operationId)
      expect(operation).toBeUndefined()
    })
    
    it('should cancel active operation', async () => {
      const largeContent = 'A'.repeat(1000000) // 1MB
      const testFile = await createTestFile('cancel_test.txt', largeContent)
      const outputPath = path.join(testDir, 'cancel.zip')
      
      let operationId = null
      
      // Start compression with progress callback to capture operation ID
      const compressionPromise = compressionService.compress([testFile], outputPath, {
        onProgress: (progress) => {
          if (!operationId) {
            const activeOps = compressionService.getActiveOperations()
            if (activeOps.length > 0) {
              operationId = activeOps[0].id
              
              // Cancel the operation
              setTimeout(() => {
                const cancelled = compressionService.cancelOperation(operationId)
                expect(cancelled).toBe(true)
              }, 50)
            }
          }
        }
      })
      
      try {
        await compressionPromise
        expect.fail('Operation should have been cancelled')
      } catch (error) {
        expect(error).toBeInstanceOf(CompressionError)
        expect(error.code).toBe(COMPRESSION_CONFIG.ERRORS.OPERATION_CANCELLED)
      }
    })
  })
  
  describe('Error Handling', () => {
    it('should handle permission errors', async () => {
      // Create a file and make it unreadable (on Unix systems)
      const testFile = await createTestFile('permission_test.txt')
      
      // Mock file access to simulate permission error
      const originalAccess = fs.access
      fs.access = vi.fn().mockRejectedValue(Object.assign(new Error('Permission denied'), { code: 'EACCES' }))
      
      const outputPath = path.join(testDir, 'permission.zip')
      
      try {
        await compressionService.compress([testFile], outputPath)
        expect.fail('Should have thrown permission error')
      } catch (error) {
        expect(error).toBeInstanceOf(CompressionError)
        expect(error.code).toBe(COMPRESSION_CONFIG.ERRORS.PERMISSION_DENIED)
      } finally {
        fs.access = originalAccess
      }
    })
    
    it('should detect archive format from extension', async () => {
      const service = new CompressionService()
      
      // Test format detection
      expect(() => service._detectArchiveFormat('test.zip')).not.toThrow()
      expect(() => service._detectArchiveFormat('test.tar.gz')).not.toThrow()
      
      try {
        service._detectArchiveFormat('test.unknown')
        expect.fail('Should have thrown unsupported format error')
      } catch (error) {
        expect(error.code).toBe(COMPRESSION_CONFIG.ERRORS.UNSUPPORTED_FORMAT)
      }
    })
    
    it('should normalize various file input formats', async () => {
      const testFile = await createTestFile('normalize_test.txt')
      const service = new CompressionService()
      
      // Test string input
      const normalized1 = await service._normalizeFileInputs([testFile])
      expect(normalized1).toHaveLength(1)
      expect(normalized1[0].path).toBe(testFile)
      expect(normalized1[0].relativePath).toBe('normalize_test.txt')
      
      // Test object input
      const normalized2 = await service._normalizeFileInputs([
        { path: testFile, relativePath: 'custom/name.txt' }
      ])
      expect(normalized2).toHaveLength(1)
      expect(normalized2[0].relativePath).toBe('custom/name.txt')
      
      // Test invalid input
      try {
        await service._normalizeFileInputs([{ invalid: 'input' }])
        expect.fail('Should have thrown invalid input error')
      } catch (error) {
        expect(error.code).toBe(COMPRESSION_CONFIG.ERRORS.INVALID_INPUT)
      }
    })
  })
  
  describe('Edge Cases', () => {
    it('should handle empty files', async () => {
      const emptyFile = await createTestFile('empty.txt', '')
      const outputPath = path.join(testDir, 'empty_file.zip')
      
      const result = await compressionService.compress([emptyFile], outputPath)
      expect(result.success).toBe(true)
      
      // Decompress and verify
      const extractDir = path.join(testDir, 'empty_extracted')
      const decompressResult = await compressionService.decompress(outputPath, extractDir)
      
      expect(decompressResult.success).toBe(true)
      
      const extractedFile = path.join(extractDir, 'empty.txt')
      const content = await fs.readFile(extractedFile, 'utf-8')
      expect(content).toBe('')
    })
    
    it('should handle files with special characters in names', async () => {
      const specialFile = await createTestFile('special file äöü 中文.txt', 'Special content')
      const outputPath = path.join(testDir, 'special.zip')
      
      const result = await compressionService.compress([specialFile], outputPath)
      expect(result.success).toBe(true)
      
      const info = await compressionService.getArchiveInfo(outputPath)
      const entry = info.entries.find(e => e.name.includes('special file'))
      expect(entry).toBeDefined()
    })
    
    it('should handle very deep directory structures', async () => {
      // Create deep directory structure
      let currentPath = testDir
      for (let i = 0; i < 10; i++) {
        currentPath = path.join(currentPath, `level${i}`)
        await fs.mkdir(currentPath, { recursive: true })
        tempDirs.push(currentPath)
      }
      
      const deepFile = path.join(currentPath, 'deep.txt')
      await fs.writeFile(deepFile, 'Deep content')
      tempFiles.push(deepFile)
      
      const outputPath = path.join(testDir, 'deep.zip')
      const result = await compressionService.compress([path.join(testDir, 'level0')], outputPath)
      
      expect(result.success).toBe(true)
      
      // Verify archive contains deep structure
      const info = await compressionService.getArchiveInfo(outputPath)
      const deepEntry = info.entries.find(e => e.name.includes('deep.txt'))
      expect(deepEntry).toBeDefined()
      expect(deepEntry.name).toContain('level')
    })
  })
  
  describe('Integration Tests', () => {
    it('should handle complete compress-decompress cycle', async () => {
      // Create complex test structure
      const files = [
        await createTestFile('root1.txt', 'Root file 1'),
        await createTestFile('root2.txt', 'Root file 2')
      ]
      
      const subDir = await createTestDir('subdir', [
        { name: 'sub1.txt', content: 'Sub file 1' },
        { name: 'sub2.txt', content: 'Sub file 2' }
      ])
      
      const nestedDir = await createTestDir('nested/deep', [
        { name: 'nested.txt', content: 'Nested file' }
      ])
      
      files.push(subDir, nestedDir)
      
      const zipPath = path.join(testDir, 'integration.zip')
      
      // Compress with progress tracking
      const compressProgress = []
      const compressResult = await compressionService.compress(files, zipPath, {
        level: 'normal',
        onProgress: (progress) => compressProgress.push(progress)
      })
      
      expect(compressResult.success).toBe(true)
      expect(compressProgress.length).toBeGreaterThan(0)
      
      // Get archive info
      const info = await compressionService.getArchiveInfo(zipPath)
      expect(info.entryCount).toBeGreaterThan(4)
      expect(info.totalSize).toBeGreaterThan(0)
      
      // Decompress with progress tracking  
      const extractDir = path.join(testDir, 'integration_extracted')
      const decompressProgress = []
      const decompressResult = await compressionService.decompress(zipPath, extractDir, {
        onProgress: (progress) => decompressProgress.push(progress)
      })
      
      expect(decompressResult.success).toBe(true)
      expect(decompressProgress.length).toBeGreaterThan(0)
      
      // Verify all files were extracted correctly
      const extractedFiles = [
        'root1.txt',
        'root2.txt',
        'subdir/sub1.txt',
        'subdir/sub2.txt',
        'nested/deep/nested.txt'
      ]
      
      for (const file of extractedFiles) {
        const filePath = path.join(extractDir, file)
        const exists = await fs.access(filePath).then(() => true).catch(() => false)
        expect(exists).toBe(true)
      }
      
      // Verify content
      const rootContent = await fs.readFile(path.join(extractDir, 'root1.txt'), 'utf-8')
      const nestedContent = await fs.readFile(path.join(extractDir, 'nested/deep/nested.txt'), 'utf-8')
      
      expect(rootContent).toBe('Root file 1')
      expect(nestedContent).toBe('Nested file')
    })
  })
})