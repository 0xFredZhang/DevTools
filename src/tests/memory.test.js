/**
 * Memory Usage Validation Tests
 * 
 * Comprehensive test suite for memory usage validation during compression operations.
 * Ensures memory usage stays below 500MB threshold during all operations.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import { compressionService } from '../services/compressionService.js'
import { fileService } from '../services/fileService.js'
import { encryptionService } from '../services/encryptionService.js'

// Memory constraints configuration
const MEMORY_CONFIG = {
  MAX_MEMORY_USAGE: 500 * 1024 * 1024, // 500 MB absolute limit
  WARNING_THRESHOLD: 400 * 1024 * 1024, // 400 MB warning threshold
  MONITORING_INTERVAL: 50, // Monitor every 50ms
  SAMPLE_WINDOW: 1000, // Keep last 1000 samples
  MEMORY_LEAK_THRESHOLD: 50 * 1024 * 1024, // 50 MB growth without cleanup
  
  // File sizes for testing
  SMALL_FILE: 5 * 1024 * 1024,      // 5 MB
  MEDIUM_FILE: 50 * 1024 * 1024,    // 50 MB
  LARGE_FILE: 200 * 1024 * 1024,    // 200 MB
  XLARGE_FILE: 500 * 1024 * 1024,   // 500 MB
}

describe('Memory Usage Validation Tests', () => {
  let testDir
  let tempFiles = []
  
  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `memory-test-${Date.now()}`)
    await fs.mkdir(testDir, { recursive: true })
    
    // Force garbage collection before tests if available
    if (global.gc) {
      global.gc()
    }
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
    
    // Force garbage collection after tests
    if (global.gc) {
      global.gc()
    }
  })

  /**
   * Advanced memory monitoring with leak detection
   */
  class MemoryMonitor {
    constructor() {
      this.samples = []
      this.startTime = Date.now()
      this.baseline = process.memoryUsage().heapUsed
      this.maxMemory = this.baseline
      this.intervalId = null
      this.violations = []
      this.warnings = []
    }
    
    start() {
      this.intervalId = setInterval(() => {
        const memUsage = process.memoryUsage()
        const timestamp = Date.now()
        
        const sample = {
          timestamp,
          heapUsed: memUsage.heapUsed,
          heapTotal: memUsage.heapTotal,
          rss: memUsage.rss,
          external: memUsage.external
        }
        
        this.samples.push(sample)
        
        // Track maximum memory usage
        if (memUsage.heapUsed > this.maxMemory) {
          this.maxMemory = memUsage.heapUsed
        }
        
        // Check for violations
        if (memUsage.heapUsed > MEMORY_CONFIG.MAX_MEMORY_USAGE) {
          this.violations.push({
            timestamp,
            usage: memUsage.heapUsed,
            limit: MEMORY_CONFIG.MAX_MEMORY_USAGE,
            type: 'VIOLATION'
          })
        }
        
        // Check for warnings
        if (memUsage.heapUsed > MEMORY_CONFIG.WARNING_THRESHOLD) {
          this.warnings.push({
            timestamp,
            usage: memUsage.heapUsed,
            threshold: MEMORY_CONFIG.WARNING_THRESHOLD,
            type: 'WARNING'
          })
        }
        
        // Keep only recent samples
        if (this.samples.length > MEMORY_CONFIG.SAMPLE_WINDOW) {
          this.samples.shift()
        }
      }, MEMORY_CONFIG.MONITORING_INTERVAL)
    }
    
    stop() {
      if (this.intervalId) {
        clearInterval(this.intervalId)
        this.intervalId = null
      }
      
      return this.getReport()
    }
    
    getReport() {
      const duration = Date.now() - this.startTime
      const finalMemory = process.memoryUsage().heapUsed
      const memoryGrowth = finalMemory - this.baseline
      
      return {
        duration,
        baseline: this.baseline,
        maxMemory: this.maxMemory,
        finalMemory,
        memoryGrowth,
        samples: [...this.samples],
        violations: [...this.violations],
        warnings: [...this.warnings],
        stats: this.calculateStats()
      }
    }
    
    calculateStats() {
      if (this.samples.length === 0) return null
      
      const heapValues = this.samples.map(s => s.heapUsed)
      const rssValues = this.samples.map(s => s.rss)
      
      return {
        heap: {
          min: Math.min(...heapValues),
          max: Math.max(...heapValues),
          avg: heapValues.reduce((a, b) => a + b) / heapValues.length,
          stdDev: this.calculateStdDev(heapValues)
        },
        rss: {
          min: Math.min(...rssValues),
          max: Math.max(...rssValues),
          avg: rssValues.reduce((a, b) => a + b) / rssValues.length,
          stdDev: this.calculateStdDev(rssValues)
        }
      }
    }
    
    calculateStdDev(values) {
      const avg = values.reduce((a, b) => a + b) / values.length
      const squaredDiffs = values.map(value => Math.pow(value - avg, 2))
      const variance = squaredDiffs.reduce((a, b) => a + b) / squaredDiffs.length
      return Math.sqrt(variance)
    }
    
    detectMemoryLeaks() {
      if (this.samples.length < 100) return null // Need enough samples
      
      const recentSamples = this.samples.slice(-50) // Last 50 samples
      const oldSamples = this.samples.slice(0, 50) // First 50 samples
      
      const recentAvg = recentSamples.reduce((a, b) => a + b.heapUsed, 0) / recentSamples.length
      const oldAvg = oldSamples.reduce((a, b) => a + b.heapUsed, 0) / oldSamples.length
      
      const memoryGrowth = recentAvg - oldAvg
      
      return {
        detected: memoryGrowth > MEMORY_CONFIG.MEMORY_LEAK_THRESHOLD,
        growth: memoryGrowth,
        threshold: MEMORY_CONFIG.MEMORY_LEAK_THRESHOLD,
        confidence: memoryGrowth > MEMORY_CONFIG.MEMORY_LEAK_THRESHOLD ? 'HIGH' : 'LOW'
      }
    }
  }

  /**
   * Create test files with specific sizes
   */
  async function createTestFile(size, name = `test-${size}-${Date.now()}.bin`) {
    const filePath = path.join(testDir, name)
    const chunkSize = 64 * 1024 // 64KB chunks
    const chunks = Math.ceil(size / chunkSize)
    
    const handle = await fs.open(filePath, 'w')
    
    for (let i = 0; i < chunks; i++) {
      const currentChunkSize = i === chunks - 1 ? size % chunkSize || chunkSize : chunkSize
      const buffer = Buffer.alloc(currentChunkSize, i % 256)
      await handle.write(buffer)
    }
    
    await handle.close()
    tempFiles.push(filePath)
    return filePath
  }

  describe('Small File Memory Usage', () => {
    it('should compress 5MB file within memory limits', async () => {
      const filePath = await createTestFile(MEMORY_CONFIG.SMALL_FILE, 'small-memory.bin')
      const outputPath = path.join(testDir, 'small-memory.zip')
      
      const monitor = new MemoryMonitor()
      monitor.start()
      
      const result = await compressionService.compress([{ path: filePath }], {
        outputPath,
        level: 'normal'
      })
      
      const report = monitor.stop()
      
      expect(result.outputPath).toBe(outputPath)
      expect(report.maxMemory).toBeLessThan(MEMORY_CONFIG.MAX_MEMORY_USAGE)
      expect(report.violations).toHaveLength(0)
      
      // Small files should use minimal memory
      expect(report.maxMemory - report.baseline).toBeLessThan(50 * 1024 * 1024) // Less than 50MB overhead
    })
    
    it('should handle multiple small files efficiently', async () => {
      const fileCount = 20
      const filePaths = []
      
      // Create multiple small files
      for (let i = 0; i < fileCount; i++) {
        const filePath = await createTestFile(
          MEMORY_CONFIG.SMALL_FILE / 4, 
          `multi-small-${i}.bin`
        )
        filePaths.push({ path: filePath })
      }
      
      const outputPath = path.join(testDir, 'multi-small.zip')
      const monitor = new MemoryMonitor()
      monitor.start()
      
      const result = await compressionService.compress(filePaths, {
        outputPath,
        level: 'fast' // Use fast compression for multiple files
      })
      
      const report = monitor.stop()
      
      expect(result.outputPath).toBe(outputPath)
      expect(report.maxMemory).toBeLessThan(MEMORY_CONFIG.MAX_MEMORY_USAGE)
      expect(report.violations).toHaveLength(0)
      
      // Memory should scale sub-linearly with file count
      const memoryPerFile = (report.maxMemory - report.baseline) / fileCount
      expect(memoryPerFile).toBeLessThan(5 * 1024 * 1024) // Less than 5MB per file
    })
  })

  describe('Medium File Memory Usage', () => {
    it('should compress 50MB file within memory limits', async () => {
      const filePath = await createTestFile(MEMORY_CONFIG.MEDIUM_FILE, 'medium-memory.bin')
      const outputPath = path.join(testDir, 'medium-memory.zip')
      
      const monitor = new MemoryMonitor()
      monitor.start()
      
      let progressCount = 0
      const result = await compressionService.compress([{ path: filePath }], {
        outputPath,
        level: 'normal',
        onProgress: (progress) => {
          progressCount++
          // Memory should stay within limits during progress callbacks
          const currentMemory = process.memoryUsage().heapUsed
          expect(currentMemory).toBeLessThan(MEMORY_CONFIG.MAX_MEMORY_USAGE * 1.1) // Allow 10% tolerance
        }
      })
      
      const report = monitor.stop()
      
      expect(result.outputPath).toBe(outputPath)
      expect(report.maxMemory).toBeLessThan(MEMORY_CONFIG.MAX_MEMORY_USAGE)
      expect(report.violations).toHaveLength(0)
      expect(progressCount).toBeGreaterThan(0) // Should report progress
      
      // Check for memory leaks
      const leakAnalysis = monitor.detectMemoryLeaks()
      if (leakAnalysis) {
        expect(leakAnalysis.detected).toBe(false)
      }
    }, 60000)
    
    it('should decompress 50MB archive within memory limits', async () => {
      // First create a compressed file
      const originalPath = await createTestFile(MEMORY_CONFIG.MEDIUM_FILE, 'decomp-medium.bin')
      const compressedPath = path.join(testDir, 'decomp-medium.zip')
      
      await compressionService.compress([{ path: originalPath }], {
        outputPath: compressedPath,
        level: 'fast'
      })
      
      // Now test decompression memory usage
      const extractDir = path.join(testDir, 'extracted-medium')
      const monitor = new MemoryMonitor()
      monitor.start()
      
      const result = await compressionService.decompress(compressedPath, {
        outputPath: extractDir
      })
      
      const report = monitor.stop()
      
      expect(result.outputPath).toBe(extractDir)
      expect(report.maxMemory).toBeLessThan(MEMORY_CONFIG.MAX_MEMORY_USAGE)
      expect(report.violations).toHaveLength(0)
      
      // Decompression should use less memory than compression
      expect(report.maxMemory - report.baseline).toBeLessThan(100 * 1024 * 1024) // Less than 100MB overhead
    }, 60000)
  })

  describe('Large File Memory Usage', () => {
    it('should compress 200MB file with streaming to limit memory', async () => {
      const filePath = await createTestFile(MEMORY_CONFIG.LARGE_FILE, 'large-memory.bin')
      const outputPath = path.join(testDir, 'large-memory.zip')
      
      const monitor = new MemoryMonitor()
      monitor.start()
      
      const result = await compressionService.compress([{ path: filePath }], {
        outputPath,
        level: 'fast', // Use fast compression for large files
        streaming: true, // Enable streaming mode
        chunkSize: 1024 * 1024, // 1MB chunks to limit memory usage
        onProgress: (progress) => {
          // Verify memory stays within limits during processing
          const currentMemory = process.memoryUsage().heapUsed
          expect(currentMemory).toBeLessThan(MEMORY_CONFIG.MAX_MEMORY_USAGE)
        }
      })
      
      const report = monitor.stop()
      
      expect(result.outputPath).toBe(outputPath)
      expect(report.maxMemory).toBeLessThan(MEMORY_CONFIG.MAX_MEMORY_USAGE)
      expect(report.violations).toHaveLength(0)
      
      // Memory usage should be bounded regardless of file size
      expect(report.maxMemory - report.baseline).toBeLessThan(200 * 1024 * 1024) // Less than 200MB overhead
      
      // Should show stable memory usage (not growing linearly)
      const leakAnalysis = monitor.detectMemoryLeaks()
      if (leakAnalysis && report.samples.length > 100) {
        expect(leakAnalysis.detected).toBe(false)
      }
    }, 180000) // 3 minutes timeout for large files
    
    // Skip extra large file test on low-memory systems
    const skipXLarge = os.totalmem() < 2 * 1024 * 1024 * 1024 // Less than 2GB RAM
    
    it.skipIf(skipXLarge)('should handle 500MB file with strict memory control', async () => {
      const filePath = await createTestFile(MEMORY_CONFIG.XLARGE_FILE, 'xlarge-memory.bin')
      const outputPath = path.join(testDir, 'xlarge-memory.zip')
      
      const monitor = new MemoryMonitor()
      monitor.start()
      
      const result = await compressionService.compress([{ path: filePath }], {
        outputPath,
        level: 'fast',
        streaming: true,
        chunkSize: 512 * 1024, // Smaller chunks for stricter memory control
        memoryLimit: MEMORY_CONFIG.MAX_MEMORY_USAGE, // Explicit memory limit
        onProgress: (progress) => {
          const currentMemory = process.memoryUsage().heapUsed
          expect(currentMemory).toBeLessThan(MEMORY_CONFIG.MAX_MEMORY_USAGE * 1.05) // Allow 5% tolerance
        }
      })
      
      const report = monitor.stop()
      
      expect(result.outputPath).toBe(outputPath)
      expect(report.maxMemory).toBeLessThan(MEMORY_CONFIG.MAX_MEMORY_USAGE)
      expect(report.violations).toHaveLength(0)
      
      // Extra large files should still maintain memory discipline
      expect(report.maxMemory - report.baseline).toBeLessThan(300 * 1024 * 1024) // Less than 300MB overhead
    }, 300000) // 5 minutes timeout
  })

  describe('Concurrent Operations Memory Usage', () => {
    it('should handle concurrent operations without memory explosion', async () => {
      const operationCount = 4
      const fileSize = MEMORY_CONFIG.MEDIUM_FILE / 4 // Smaller files for concurrency
      const operations = []
      
      const monitor = new MemoryMonitor()
      monitor.start()
      
      // Start multiple concurrent operations
      for (let i = 0; i < operationCount; i++) {
        const filePath = await createTestFile(fileSize, `concurrent-mem-${i}.bin`)
        const outputPath = path.join(testDir, `concurrent-mem-${i}.zip`)
        
        const operation = compressionService.compress([{ path: filePath }], {
          outputPath,
          level: 'fast',
          streaming: true
        })
        
        operations.push(operation)
      }
      
      // Wait for all operations to complete
      const results = await Promise.all(operations)
      const report = monitor.stop()
      
      // All operations should succeed
      expect(results).toHaveLength(operationCount)
      results.forEach(result => {
        expect(result.outputPath).toBeDefined()
      })
      
      // Total memory should not be sum of individual operations
      expect(report.maxMemory).toBeLessThan(MEMORY_CONFIG.MAX_MEMORY_USAGE)
      expect(report.violations).toHaveLength(0)
      
      // Memory growth should be sub-linear with concurrent operations
      const memoryPerOperation = (report.maxMemory - report.baseline) / operationCount
      expect(memoryPerOperation).toBeLessThan(50 * 1024 * 1024) // Less than 50MB per operation
    }, 120000)
  })

  describe('Memory Leak Detection', () => {
    it('should not leak memory during repeated operations', async () => {
      const operationCount = 10
      const fileSize = MEMORY_CONFIG.SMALL_FILE
      const memorySnapshots = []
      
      for (let i = 0; i < operationCount; i++) {
        const filePath = await createTestFile(fileSize, `leak-test-${i}.bin`)
        const outputPath = path.join(testDir, `leak-test-${i}.zip`)
        
        // Take memory snapshot before operation
        const beforeMemory = process.memoryUsage().heapUsed
        
        await compressionService.compress([{ path: filePath }], {
          outputPath,
          level: 'fast'
        })
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc()
        }
        
        // Take memory snapshot after operation and GC
        const afterMemory = process.memoryUsage().heapUsed
        
        memorySnapshots.push({
          iteration: i,
          before: beforeMemory,
          after: afterMemory,
          growth: afterMemory - beforeMemory
        })
        
        // Clean up file immediately to prevent disk space issues
        await fs.unlink(filePath)
        await fs.unlink(outputPath)
      }
      
      // Analyze memory growth trend
      const totalGrowth = memorySnapshots[memorySnapshots.length - 1].after - memorySnapshots[0].before
      const avgGrowthPerOperation = totalGrowth / operationCount
      
      // Should not have significant memory growth per operation
      expect(avgGrowthPerOperation).toBeLessThan(1024 * 1024) // Less than 1MB per operation
      
      // Final memory should not be significantly higher than initial
      expect(totalGrowth).toBeLessThan(MEMORY_CONFIG.MEMORY_LEAK_THRESHOLD)
      
      // Memory growth should stabilize (not keep growing linearly)
      const recentSnapshots = memorySnapshots.slice(-3)
      const recentGrowth = recentSnapshots.map(s => s.growth)
      const avgRecentGrowth = recentGrowth.reduce((a, b) => a + b) / recentGrowth.length
      
      expect(Math.abs(avgRecentGrowth)).toBeLessThan(5 * 1024 * 1024) // Less than 5MB growth in recent operations
    }, 180000)
    
    it('should clean up resources after operation cancellation', async () => {
      const filePath = await createTestFile(MEMORY_CONFIG.LARGE_FILE, 'cancel-memory.bin')
      const outputPath = path.join(testDir, 'cancel-memory.zip')
      
      const monitor = new MemoryMonitor()
      monitor.start()
      
      // Start compression and cancel midway
      const compressionPromise = compressionService.compress([{ path: filePath }], {
        outputPath,
        level: 'normal',
        onProgress: (progress) => {
          // Cancel at 30% progress
          if (progress.percentage > 30) {
            compressionService.cancel()
          }
        }
      })
      
      try {
        await compressionPromise
      } catch (error) {
        // Expected cancellation error
        expect(error.message).toMatch(/cancel/i)
      }
      
      // Force garbage collection
      if (global.gc) {
        global.gc()
      }
      
      const report = monitor.stop()
      
      // Memory should be cleaned up after cancellation
      const finalMemory = process.memoryUsage().heapUsed
      expect(finalMemory - report.baseline).toBeLessThan(100 * 1024 * 1024) // Less than 100MB residual
      
      // No memory violations during the process
      expect(report.violations).toHaveLength(0)
    }, 60000)
  })

  describe('Encryption Memory Usage', () => {
    it('should encrypt large files within memory limits', async () => {
      const filePath = await createTestFile(MEMORY_CONFIG.MEDIUM_FILE, 'encrypt-memory.bin')
      const outputPath = path.join(testDir, 'encrypt-memory.zip')
      const password = 'MemoryTestPassword123!'
      
      const monitor = new MemoryMonitor()
      monitor.start()
      
      const result = await compressionService.compress([{ path: filePath }], {
        outputPath,
        level: 'fast',
        encryption: {
          enabled: true,
          password,
          algorithm: 'aes-256'
        }
      })
      
      const report = monitor.stop()
      
      expect(result.outputPath).toBe(outputPath)
      expect(report.maxMemory).toBeLessThan(MEMORY_CONFIG.MAX_MEMORY_USAGE)
      expect(report.violations).toHaveLength(0)
      
      // Encryption should not significantly increase memory usage
      expect(report.maxMemory - report.baseline).toBeLessThan(150 * 1024 * 1024) // Less than 150MB overhead
    }, 90000)
    
    it('should decrypt archives within memory limits', async () => {
      const originalPath = await createTestFile(MEMORY_CONFIG.MEDIUM_FILE, 'decrypt-memory.bin')
      const compressedPath = path.join(testDir, 'decrypt-memory.zip')
      const password = 'DecryptMemoryTest123!'
      
      // Create encrypted archive
      await compressionService.compress([{ path: originalPath }], {
        outputPath: compressedPath,
        level: 'fast',
        encryption: {
          enabled: true,
          password
        }
      })
      
      // Test decryption memory usage
      const extractDir = path.join(testDir, 'decrypted')
      const monitor = new MemoryMonitor()
      monitor.start()
      
      const result = await compressionService.decompress(compressedPath, {
        outputPath: extractDir,
        password
      })
      
      const report = monitor.stop()
      
      expect(result.outputPath).toBe(extractDir)
      expect(report.maxMemory).toBeLessThan(MEMORY_CONFIG.MAX_MEMORY_USAGE)
      expect(report.violations).toHaveLength(0)
      
      // Decryption should be memory-efficient
      expect(report.maxMemory - report.baseline).toBeLessThan(100 * 1024 * 1024) // Less than 100MB overhead
    }, 90000)
  })

  describe('Memory Usage Reporting', () => {
    it('should provide accurate memory usage statistics', async () => {
      const filePath = await createTestFile(MEMORY_CONFIG.MEDIUM_FILE, 'stats-memory.bin')
      const outputPath = path.join(testDir, 'stats-memory.zip')
      
      const monitor = new MemoryMonitor()
      monitor.start()
      
      await compressionService.compress([{ path: filePath }], {
        outputPath,
        level: 'normal'
      })
      
      const report = monitor.stop()
      
      // Report should contain comprehensive statistics
      expect(report.stats).toBeDefined()
      expect(report.stats.heap).toBeDefined()
      expect(report.stats.rss).toBeDefined()
      
      expect(report.stats.heap.min).toBeGreaterThan(0)
      expect(report.stats.heap.max).toBeGreaterThan(report.stats.heap.min)
      expect(report.stats.heap.avg).toBeGreaterThan(report.stats.heap.min)
      expect(report.stats.heap.avg).toBeLessThan(report.stats.heap.max)
      
      // Standard deviation should indicate memory usage stability
      expect(report.stats.heap.stdDev).toBeLessThan(report.stats.heap.avg * 0.5) // StdDev < 50% of average
    })
    
    it('should detect memory usage patterns', async () => {
      const filePaths = []
      
      // Create files of increasing sizes
      for (let i = 1; i <= 5; i++) {
        const fileSize = MEMORY_CONFIG.SMALL_FILE * i
        const filePath = await createTestFile(fileSize, `pattern-${i}.bin`)
        filePaths.push({ path: filePath })
      }
      
      const outputPath = path.join(testDir, 'pattern-memory.zip')
      const monitor = new MemoryMonitor()
      monitor.start()
      
      await compressionService.compress(filePaths, {
        outputPath,
        level: 'fast',
        onProgress: (progress) => {
          // Memory usage should correlate with file size being processed
          const currentMemory = process.memoryUsage().heapUsed
          expect(currentMemory).toBeLessThan(MEMORY_CONFIG.MAX_MEMORY_USAGE)
        }
      })
      
      const report = monitor.stop()
      
      expect(report.maxMemory).toBeLessThan(MEMORY_CONFIG.MAX_MEMORY_USAGE)
      expect(report.violations).toHaveLength(0)
      
      // Memory should show a pattern related to file processing
      expect(report.samples.length).toBeGreaterThan(50) // Should have enough samples
    }, 120000)
  })

  describe('Memory Pressure Handling', () => {
    it('should adapt to low memory conditions', async () => {
      const filePath = await createTestFile(MEMORY_CONFIG.LARGE_FILE, 'pressure-memory.bin')
      const outputPath = path.join(testDir, 'pressure-memory.zip')
      
      // Simulate memory pressure with a large buffer
      const pressureBuffer = Buffer.alloc(200 * 1024 * 1024) // 200MB
      
      try {
        const monitor = new MemoryMonitor()
        monitor.start()
        
        const result = await compressionService.compress([{ path: filePath }], {
          outputPath,
          level: 'fast',
          streaming: true,
          memoryLimit: MEMORY_CONFIG.MAX_MEMORY_USAGE, // Explicit limit
          adaptiveChunkSize: true // Enable adaptive chunking for memory pressure
        })
        
        const report = monitor.stop()
        
        expect(result.outputPath).toBe(outputPath)
        expect(report.maxMemory).toBeLessThan(MEMORY_CONFIG.MAX_MEMORY_USAGE * 1.2) // Allow some tolerance for pressure
        
        // Should complete successfully despite memory pressure
        const stats = await fs.stat(result.outputPath)
        expect(stats.size).toBeGreaterThan(0)
        
      } finally {
        // Release memory pressure
        pressureBuffer.fill(0)
      }
    }, 180000)
  })
})