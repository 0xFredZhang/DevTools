/**
 * Performance Tests for Large File Operations
 * 
 * Comprehensive performance test suite for compression operations with large files
 * up to 2GB, memory usage monitoring, and throughput validation.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import { compressionService } from '../services/compressionService.js'
import { fileService } from '../services/fileService.js'
import { encryptionService } from '../services/encryptionService.js'

// Test configuration
const TEST_CONFIG = {
  // File sizes for testing (in bytes)
  SMALL_FILE: 1024 * 1024,           // 1 MB
  MEDIUM_FILE: 10 * 1024 * 1024,     // 10 MB
  LARGE_FILE: 100 * 1024 * 1024,     // 100 MB
  XLARGE_FILE: 500 * 1024 * 1024,    // 500 MB
  XXLARGE_FILE: 1024 * 1024 * 1024,  // 1 GB
  
  // Performance thresholds
  MAX_MEMORY_USAGE: 500 * 1024 * 1024, // 500 MB
  COMPRESSION_RATE_THRESHOLD: 10 * 1024 * 1024, // 10 MB/s minimum
  
  // Timeouts for large operations
  LARGE_FILE_TIMEOUT: 120000, // 2 minutes
  XLARGE_FILE_TIMEOUT: 300000, // 5 minutes
}

describe('Performance Tests - Large File Operations', () => {
  let testDir
  let tempFiles = []
  
  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `compress-test-${Date.now()}`)
    await fs.mkdir(testDir, { recursive: true })
  })
  
  afterEach(async () => {
    // Cleanup test files
    for (const file of tempFiles) {
      try {
        await fs.unlink(file)
      } catch (error) {
        // Ignore cleanup errors
      }
    }
    
    try {
      await fs.rmdir(testDir, { recursive: true })
    } catch (error) {
      // Ignore cleanup errors
    }
    
    tempFiles = []
  })

  /**
   * Create a test file of specified size
   */
  async function createTestFile(size, name = `test-${size}.bin`) {
    const filePath = path.join(testDir, name)
    const chunkSize = 64 * 1024 // 64KB chunks
    const totalChunks = Math.ceil(size / chunkSize)
    
    const handle = await fs.open(filePath, 'w')
    
    for (let i = 0; i < totalChunks; i++) {
      const currentChunkSize = i === totalChunks - 1 ? size % chunkSize || chunkSize : chunkSize
      const buffer = Buffer.alloc(currentChunkSize)
      
      // Fill with predictable but non-repetitive data for realistic compression
      for (let j = 0; j < currentChunkSize; j++) {
        buffer[j] = (i * chunkSize + j) % 256
      }
      
      await handle.write(buffer)
    }
    
    await handle.close()
    tempFiles.push(filePath)
    return filePath
  }

  /**
   * Monitor memory usage during operation
   */
  function createMemoryMonitor() {
    const samples = []
    let maxMemory = 0
    
    const monitor = () => {
      const memUsage = process.memoryUsage()
      samples.push({
        timestamp: Date.now(),
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        rss: memUsage.rss
      })
      
      maxMemory = Math.max(maxMemory, memUsage.heapUsed)
    }
    
    const interval = setInterval(monitor, 100) // Sample every 100ms
    
    return {
      stop: () => {
        clearInterval(interval)
        return { samples, maxMemory }
      },
      getMaxMemory: () => maxMemory
    }
  }

  describe('Small to Medium File Performance', () => {
    it('should compress 1MB file quickly', async () => {
      const filePath = await createTestFile(TEST_CONFIG.SMALL_FILE, 'small.bin')
      const outputPath = path.join(testDir, 'small.zip')
      
      const startTime = Date.now()
      const memoryMonitor = createMemoryMonitor()
      
      const result = await compressionService.compress([{ path: filePath }], {
        outputPath,
        level: 'normal'
      })
      
      const { maxMemory } = memoryMonitor.stop()
      const duration = Date.now() - startTime
      
      expect(result.outputPath).toBe(outputPath)
      expect(duration).toBeLessThan(2000) // Less than 2 seconds
      expect(maxMemory).toBeLessThan(50 * 1024 * 1024) // Less than 50MB
    }, 10000)
    
    it('should compress 10MB file within performance thresholds', async () => {
      const filePath = await createTestFile(TEST_CONFIG.MEDIUM_FILE, 'medium.bin')
      const outputPath = path.join(testDir, 'medium.zip')
      
      const startTime = Date.now()
      const memoryMonitor = createMemoryMonitor()
      
      const result = await compressionService.compress([{ path: filePath }], {
        outputPath,
        level: 'normal'
      })
      
      const { maxMemory } = memoryMonitor.stop()
      const duration = Date.now() - startTime
      const rate = TEST_CONFIG.MEDIUM_FILE / (duration / 1000) // bytes per second
      
      expect(result.outputPath).toBe(outputPath)
      expect(duration).toBeLessThan(10000) // Less than 10 seconds
      expect(rate).toBeGreaterThan(1024 * 1024) // At least 1 MB/s
      expect(maxMemory).toBeLessThan(100 * 1024 * 1024) // Less than 100MB
    }, 15000)
  })

  describe('Large File Performance (100MB)', () => {
    it('should compress 100MB file within time limit', async () => {
      const filePath = await createTestFile(TEST_CONFIG.LARGE_FILE, 'large.bin')
      const outputPath = path.join(testDir, 'large.zip')
      
      const startTime = Date.now()
      const memoryMonitor = createMemoryMonitor()
      let progressUpdates = 0
      
      const result = await compressionService.compress([{ path: filePath }], {
        outputPath,
        level: 'fast', // Use fast compression for large files
        onProgress: (progress) => {
          progressUpdates++
          expect(progress.percentage).toBeGreaterThanOrEqual(0)
          expect(progress.percentage).toBeLessThanOrEqual(100)
        }
      })
      
      const { maxMemory } = memoryMonitor.stop()
      const duration = Date.now() - startTime
      const rate = TEST_CONFIG.LARGE_FILE / (duration / 1000)
      
      expect(result.outputPath).toBe(outputPath)
      expect(duration).toBeLessThan(60000) // Less than 60 seconds
      expect(rate).toBeGreaterThan(TEST_CONFIG.COMPRESSION_RATE_THRESHOLD) // At least 10 MB/s
      expect(maxMemory).toBeLessThan(TEST_CONFIG.MAX_MEMORY_USAGE) // Less than 500MB
      expect(progressUpdates).toBeGreaterThan(0) // Should report progress
      
      // Verify file exists and has reasonable size
      const stats = await fs.stat(result.outputPath)
      expect(stats.size).toBeGreaterThan(0)
      expect(stats.size).toBeLessThan(TEST_CONFIG.LARGE_FILE) // Should be compressed
    }, TEST_CONFIG.LARGE_FILE_TIMEOUT)
    
    it('should decompress 100MB file efficiently', async () => {
      // First create and compress a file
      const originalPath = await createTestFile(TEST_CONFIG.LARGE_FILE, 'decomp-test.bin')
      const compressedPath = path.join(testDir, 'decomp-test.zip')
      
      await compressionService.compress([{ path: originalPath }], {
        outputPath: compressedPath,
        level: 'fast'
      })
      
      // Now test decompression
      const extractDir = path.join(testDir, 'extracted')
      const startTime = Date.now()
      const memoryMonitor = createMemoryMonitor()
      
      const result = await compressionService.decompress(compressedPath, {
        outputPath: extractDir
      })
      
      const { maxMemory } = memoryMonitor.stop()
      const duration = Date.now() - startTime
      
      expect(result.outputPath).toBe(extractDir)
      expect(duration).toBeLessThan(30000) // Less than 30 seconds
      expect(maxMemory).toBeLessThan(TEST_CONFIG.MAX_MEMORY_USAGE)
      
      // Verify extracted file
      const extractedFile = path.join(extractDir, 'decomp-test.bin')
      const extractedStats = await fs.stat(extractedFile)
      expect(extractedStats.size).toBe(TEST_CONFIG.LARGE_FILE)
    }, TEST_CONFIG.LARGE_FILE_TIMEOUT)
  })

  describe('Extra Large File Performance (500MB)', () => {
    // Skip on CI or low-memory environments
    const skipCondition = process.env.CI || os.totalmem() < 4 * 1024 * 1024 * 1024 // Less than 4GB RAM
    
    it.skipIf(skipCondition)('should compress 500MB file with memory constraints', async () => {
      const filePath = await createTestFile(TEST_CONFIG.XLARGE_FILE, 'xlarge.bin')
      const outputPath = path.join(testDir, 'xlarge.zip')
      
      const startTime = Date.now()
      const memoryMonitor = createMemoryMonitor()
      let maxProgressSeen = 0
      
      const result = await compressionService.compress([{ path: filePath }], {
        outputPath,
        level: 'fast',
        chunkSize: 1024 * 1024, // 1MB chunks for memory efficiency
        onProgress: (progress) => {
          maxProgressSeen = Math.max(maxProgressSeen, progress.percentage)
          
          // Memory should stay within limits even during processing
          const currentMemory = memoryMonitor.getMaxMemory()
          expect(currentMemory).toBeLessThan(TEST_CONFIG.MAX_MEMORY_USAGE * 1.2) // Allow 20% overhead
        }
      })
      
      const { maxMemory } = memoryMonitor.stop()
      const duration = Date.now() - startTime
      const rate = TEST_CONFIG.XLARGE_FILE / (duration / 1000)
      
      expect(result.outputPath).toBe(outputPath)
      expect(duration).toBeLessThan(300000) // Less than 5 minutes
      expect(rate).toBeGreaterThan(5 * 1024 * 1024) // At least 5 MB/s
      expect(maxMemory).toBeLessThan(TEST_CONFIG.MAX_MEMORY_USAGE) // Critical memory constraint
      expect(maxProgressSeen).toBe(100) // Should complete fully
      
      // Verify compressed file
      const stats = await fs.stat(result.outputPath)
      expect(stats.size).toBeGreaterThan(0)
      expect(stats.size).toBeLessThan(TEST_CONFIG.XLARGE_FILE * 0.9) // Should achieve some compression
    }, TEST_CONFIG.XLARGE_FILE_TIMEOUT)
  })

  describe('Multiple Large Files Performance', () => {
    it('should handle multiple 50MB files efficiently', async () => {
      const fileSize = 50 * 1024 * 1024 // 50MB each
      const fileCount = 5
      const filePaths = []
      
      // Create multiple test files
      for (let i = 0; i < fileCount; i++) {
        const filePath = await createTestFile(fileSize, `multi-${i}.bin`)
        filePaths.push({ path: filePath })
      }
      
      const outputPath = path.join(testDir, 'multi-files.zip')
      const startTime = Date.now()
      const memoryMonitor = createMemoryMonitor()
      
      const result = await compressionService.compress(filePaths, {
        outputPath,
        level: 'normal',
        onProgress: (progress) => {
          // Should track progress across all files
          expect(progress.currentFile).toBeDefined()
          expect(progress.fileIndex).toBeGreaterThanOrEqual(0)
          expect(progress.fileIndex).toBeLessThan(fileCount)
        }
      })
      
      const { maxMemory } = memoryMonitor.stop()
      const duration = Date.now() - startTime
      const totalSize = fileSize * fileCount
      const rate = totalSize / (duration / 1000)
      
      expect(result.outputPath).toBe(outputPath)
      expect(duration).toBeLessThan(120000) // Less than 2 minutes
      expect(rate).toBeGreaterThan(5 * 1024 * 1024) // At least 5 MB/s
      expect(maxMemory).toBeLessThan(TEST_CONFIG.MAX_MEMORY_USAGE)
      
      // Verify archive contains all files
      const archiveInfo = await compressionService.getArchiveInfo(result.outputPath)
      expect(archiveInfo.fileCount).toBe(fileCount)
    }, TEST_CONFIG.LARGE_FILE_TIMEOUT)
  })

  describe('Compression Level Performance Impact', () => {
    it('should benchmark different compression levels', async () => {
      const filePath = await createTestFile(TEST_CONFIG.MEDIUM_FILE, 'benchmark.bin')
      const levels = ['fast', 'normal', 'maximum']
      const results = {}
      
      for (const level of levels) {
        const outputPath = path.join(testDir, `benchmark-${level}.zip`)
        const startTime = Date.now()
        const memoryMonitor = createMemoryMonitor()
        
        const result = await compressionService.compress([{ path: filePath }], {
          outputPath,
          level
        })
        
        const { maxMemory } = memoryMonitor.stop()
        const duration = Date.now() - startTime
        const stats = await fs.stat(result.outputPath)
        
        results[level] = {
          duration,
          size: stats.size,
          memory: maxMemory,
          compressionRatio: (TEST_CONFIG.MEDIUM_FILE - stats.size) / TEST_CONFIG.MEDIUM_FILE
        }
      }
      
      // Fast should be quickest
      expect(results.fast.duration).toBeLessThan(results.normal.duration)
      expect(results.normal.duration).toBeLessThan(results.maximum.duration)
      
      // Maximum should achieve best compression
      expect(results.maximum.compressionRatio).toBeGreaterThan(results.normal.compressionRatio)
      expect(results.normal.compressionRatio).toBeGreaterThan(results.fast.compressionRatio)
      
      // All should stay within memory limits
      expect(results.fast.memory).toBeLessThan(TEST_CONFIG.MAX_MEMORY_USAGE)
      expect(results.normal.memory).toBeLessThan(TEST_CONFIG.MAX_MEMORY_USAGE)
      expect(results.maximum.memory).toBeLessThan(TEST_CONFIG.MAX_MEMORY_USAGE)
    }, 60000)
  })

  describe('Streaming Performance', () => {
    it('should handle streaming compression efficiently', async () => {
      const filePath = await createTestFile(TEST_CONFIG.LARGE_FILE, 'stream-test.bin')
      const outputPath = path.join(testDir, 'stream-test.zip')
      
      const startTime = Date.now()
      const memoryMonitor = createMemoryMonitor()
      const progressPoints = []
      
      const result = await compressionService.compress([{ path: filePath }], {
        outputPath,
        level: 'normal',
        streaming: true, // Enable streaming mode
        chunkSize: 64 * 1024, // 64KB chunks
        onProgress: (progress) => {
          progressPoints.push({
            percentage: progress.percentage,
            timestamp: Date.now(),
            memory: process.memoryUsage().heapUsed
          })
        }
      })
      
      const { maxMemory, samples } = memoryMonitor.stop()
      const duration = Date.now() - startTime
      
      expect(result.outputPath).toBe(outputPath)
      expect(maxMemory).toBeLessThan(TEST_CONFIG.MAX_MEMORY_USAGE)
      
      // Memory usage should be relatively stable (not growing linearly with file size)
      const memoryGrowth = samples[samples.length - 1]?.heapUsed - samples[0]?.heapUsed
      expect(memoryGrowth).toBeLessThan(100 * 1024 * 1024) // Less than 100MB growth
      
      // Should have frequent progress updates
      expect(progressPoints.length).toBeGreaterThan(10)
      
      // Progress should be monotonic
      for (let i = 1; i < progressPoints.length; i++) {
        expect(progressPoints[i].percentage).toBeGreaterThanOrEqual(progressPoints[i - 1].percentage)
      }
    }, TEST_CONFIG.LARGE_FILE_TIMEOUT)
  })

  describe('Concurrent Operations Performance', () => {
    it('should handle concurrent compression operations', async () => {
      const operations = []
      const fileSize = 20 * 1024 * 1024 // 20MB each
      const concurrentCount = 3
      
      // Start multiple concurrent operations
      for (let i = 0; i < concurrentCount; i++) {
        const filePath = await createTestFile(fileSize, `concurrent-${i}.bin`)
        const outputPath = path.join(testDir, `concurrent-${i}.zip`)
        
        const operation = compressionService.compress([{ path: filePath }], {
          outputPath,
          level: 'normal'
        })
        
        operations.push(operation)
      }
      
      const startTime = Date.now()
      const memoryMonitor = createMemoryMonitor()
      
      // Wait for all operations to complete
      const results = await Promise.all(operations)
      
      const { maxMemory } = memoryMonitor.stop()
      const duration = Date.now() - startTime
      
      // All operations should complete successfully
      expect(results).toHaveLength(concurrentCount)
      results.forEach(result => {
        expect(result.outputPath).toBeDefined()
      })
      
      // Should not use excessive memory for concurrent operations
      expect(maxMemory).toBeLessThan(TEST_CONFIG.MAX_MEMORY_USAGE * 2) // Allow 2x for concurrency
      
      // Should be faster than sequential operations
      const sequentialEstimate = (fileSize * concurrentCount) / (10 * 1024 * 1024) * 1000 // Estimate based on 10 MB/s
      expect(duration).toBeLessThan(sequentialEstimate * 0.8) // Should be at least 20% faster
    }, TEST_CONFIG.LARGE_FILE_TIMEOUT)
  })

  describe('Memory Pressure Handling', () => {
    it('should handle low memory conditions gracefully', async () => {
      const filePath = await createTestFile(TEST_CONFIG.LARGE_FILE, 'memory-pressure.bin')
      const outputPath = path.join(testDir, 'memory-pressure.zip')
      
      // Simulate memory pressure by creating a large buffer
      const memoryPressureBuffer = Buffer.alloc(200 * 1024 * 1024) // 200MB
      
      try {
        const memoryMonitor = createMemoryMonitor()
        
        const result = await compressionService.compress([{ path: filePath }], {
          outputPath,
          level: 'fast',
          memoryLimit: 300 * 1024 * 1024, // 300MB limit
          onProgress: (progress) => {
            // Should continue to operate under memory pressure
            expect(progress.percentage).toBeGreaterThanOrEqual(0)
          }
        })
        
        const { maxMemory } = memoryMonitor.stop()
        
        expect(result.outputPath).toBe(outputPath)
        expect(maxMemory).toBeLessThan(400 * 1024 * 1024) // Should adapt to memory constraints
        
        // Verify file was compressed successfully despite memory pressure
        const stats = await fs.stat(result.outputPath)
        expect(stats.size).toBeGreaterThan(0)
        
      } finally {
        // Release memory pressure
        memoryPressureBuffer.fill(0)
      }
    }, TEST_CONFIG.LARGE_FILE_TIMEOUT)
  })

  describe('Error Recovery Performance', () => {
    it('should recover efficiently from partial failures', async () => {
      const filePaths = []
      const fileSize = 20 * 1024 * 1024 // 20MB each
      
      // Create multiple files, one will be "corrupted" by removing it mid-process
      for (let i = 0; i < 3; i++) {
        const filePath = await createTestFile(fileSize, `recovery-${i}.bin`)
        filePaths.push({ path: filePath })
      }
      
      const outputPath = path.join(testDir, 'recovery-test.zip')
      const memoryMonitor = createMemoryMonitor()
      
      let progressCount = 0
      const compressionPromise = compressionService.compress(filePaths, {
        outputPath,
        level: 'normal',
        continueOnError: true, // Continue processing other files on individual file errors
        onProgress: (progress) => {
          progressCount++
          
          // Remove second file after some progress to simulate corruption
          if (progressCount === 5) {
            fs.unlink(filePaths[1].path).catch(() => {}) // Ignore errors
          }
        }
      })
      
      // Should complete despite file removal
      const result = await compressionPromise
      const { maxMemory } = memoryMonitor.stop()
      
      expect(result.outputPath).toBe(outputPath)
      expect(result.errors).toBeDefined() // Should report errors
      expect(result.errors.length).toBe(1) // One file error
      expect(maxMemory).toBeLessThan(TEST_CONFIG.MAX_MEMORY_USAGE)
      
      // Archive should still contain the successfully processed files
      const archiveInfo = await compressionService.getArchiveInfo(result.outputPath)
      expect(archiveInfo.fileCount).toBe(2) // Should have 2 out of 3 files
    }, TEST_CONFIG.LARGE_FILE_TIMEOUT)
  })
})