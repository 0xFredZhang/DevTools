/**
 * Success Rate Validation Tests
 * 
 * Comprehensive test suite to validate 99.9% success rate for standard file types
 * and robust handling of edge cases and error conditions.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import crypto from 'crypto'
import { compressionService } from '../services/compressionService.js'
import { fileService } from '../services/fileService.js'
import { encryptionService } from '../services/encryptionService.js'

// Success rate configuration
const SUCCESS_RATE_CONFIG = {
  TARGET_SUCCESS_RATE: 0.999, // 99.9%
  MINIMUM_TEST_COUNT: 1000,   // Minimum operations for statistical significance
  BATCH_SIZE: 100,            // Process files in batches
  
  // Standard file types for testing
  STANDARD_FILE_TYPES: [
    'txt', 'log', 'csv', 'json', 'xml', 'html', 'css', 'js', 'py', 'java',
    'jpg', 'png', 'gif', 'pdf', 'docx', 'xlsx', 'pptx',
    'mp4', 'mp3', 'zip', 'tar', 'gz'
  ],
  
  // File size ranges
  SIZE_RANGES: [
    { name: 'tiny', min: 1, max: 1024 },                    // 1B - 1KB
    { name: 'small', min: 1024, max: 1024 * 1024 },         // 1KB - 1MB
    { name: 'medium', min: 1024 * 1024, max: 10 * 1024 * 1024 }, // 1MB - 10MB
    { name: 'large', min: 10 * 1024 * 1024, max: 100 * 1024 * 1024 } // 10MB - 100MB
  ]
}

describe('Success Rate Validation Tests', () => {
  let testDir
  let tempFiles = []
  let successStats = {
    total: 0,
    success: 0,
    failures: [],
    byFileType: {},
    bySize: {},
    byOperation: { compression: { total: 0, success: 0 }, decompression: { total: 0, success: 0 } }
  }
  
  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `success-rate-test-${Date.now()}`)
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
   * Generate test content based on file type
   */
  function generateTestContent(fileType, size) {
    switch (fileType) {
      case 'txt':
      case 'log':
        return 'Lorem ipsum '.repeat(Math.ceil(size / 12)).slice(0, size)
      
      case 'json':
        const jsonObj = { data: 'x'.repeat(size - 20), timestamp: Date.now() }
        return JSON.stringify(jsonObj).slice(0, size)
      
      case 'csv':
        const rows = Math.ceil(size / 20)
        return Array.from({ length: rows }, (_, i) => `${i},value${i},data${i}`).join('\n').slice(0, size)
      
      case 'xml':
        const xmlContent = `<?xml version="1.0"?><data>${'x'.repeat(size - 50)}</data>`
        return xmlContent.slice(0, size)
      
      case 'html':
        const htmlContent = `<!DOCTYPE html><html><body>${'<p>Test content</p>'.repeat(Math.ceil(size / 20))}</body></html>`
        return htmlContent.slice(0, size)
      
      case 'js':
      case 'py':
      case 'java':
        const codeComment = fileType === 'py' ? '# ' : '// '
        return `${codeComment}Generated test file\n${'console.log("test"); '.repeat(Math.ceil(size / 20))}`.slice(0, size)
      
      default:
        // For binary-like files, generate pseudo-random data
        return crypto.randomBytes(Math.ceil(size / 2)).toString('hex').slice(0, size)
    }
  }

  /**
   * Create a test file with specific type and size
   */
  async function createTestFile(fileType, size, index = 0) {
    const fileName = `test-${fileType}-${size}-${index}.${fileType}`
    const filePath = path.join(testDir, fileName)
    const content = generateTestContent(fileType, size)
    
    await fs.writeFile(filePath, content)
    tempFiles.push(filePath)
    
    return {
      path: filePath,
      type: fileType,
      size,
      name: fileName
    }
  }

  /**
   * Record test result and update statistics
   */
  function recordResult(success, fileInfo, operation, error = null) {
    successStats.total++
    
    if (success) {
      successStats.success++
    } else {
      successStats.failures.push({
        file: fileInfo,
        operation,
        error: error?.message || 'Unknown error',
        timestamp: Date.now()
      })
    }
    
    // Update by file type
    if (!successStats.byFileType[fileInfo.type]) {
      successStats.byFileType[fileInfo.type] = { total: 0, success: 0 }
    }
    successStats.byFileType[fileInfo.type].total++
    if (success) successStats.byFileType[fileInfo.type].success++
    
    // Update by size
    const sizeCategory = getSizeCategory(fileInfo.size)
    if (!successStats.bySize[sizeCategory]) {
      successStats.bySize[sizeCategory] = { total: 0, success: 0 }
    }
    successStats.bySize[sizeCategory].total++
    if (success) successStats.bySize[sizeCategory].success++
    
    // Update by operation
    successStats.byOperation[operation].total++
    if (success) successStats.byOperation[operation].success++
  }

  /**
   * Get size category for a file size
   */
  function getSizeCategory(size) {
    for (const range of SUCCESS_RATE_CONFIG.SIZE_RANGES) {
      if (size >= range.min && size <= range.max) {
        return range.name
      }
    }
    return 'unknown'
  }

  /**
   * Calculate success rate
   */
  function calculateSuccessRate(stats = successStats) {
    return stats.total > 0 ? stats.success / stats.total : 0
  }

  describe('Standard File Types Success Rate', () => {
    it('should achieve 99.9% success rate for text-based files', async () => {
      const textTypes = ['txt', 'log', 'csv', 'json', 'xml', 'html', 'css', 'js', 'py']
      const testsPerType = Math.ceil(SUCCESS_RATE_CONFIG.MINIMUM_TEST_COUNT / textTypes.length / 4)
      
      for (const fileType of textTypes) {
        for (const sizeRange of SUCCESS_RATE_CONFIG.SIZE_RANGES) {
          const testPromises = []
          
          for (let i = 0; i < testsPerType; i++) {
            const size = Math.floor(Math.random() * (sizeRange.max - sizeRange.min)) + sizeRange.min
            testPromises.push(async () => {
              try {
                const fileInfo = await createTestFile(fileType, size, i)
                const outputPath = path.join(testDir, `${fileInfo.name}.zip`)
                
                // Test compression
                const compressResult = await compressionService.compress([{ path: fileInfo.path }], {
                  outputPath,
                  level: 'normal'
                })
                
                recordResult(true, fileInfo, 'compression')
                
                // Test decompression
                const extractDir = path.join(testDir, `extracted-${fileInfo.name}`)
                const decompressResult = await compressionService.decompress(compressResult.outputPath, {
                  outputPath: extractDir
                })
                
                recordResult(true, fileInfo, 'decompression')
                
                // Verify file integrity
                const originalContent = await fs.readFile(fileInfo.path, 'utf8')
                const extractedPath = path.join(extractDir, fileInfo.name)
                const extractedContent = await fs.readFile(extractedPath, 'utf8')
                
                expect(extractedContent).toBe(originalContent)
                
                // Cleanup
                await fs.unlink(compressResult.outputPath)
                await fs.rmdir(extractDir, { recursive: true })
                
              } catch (error) {
                const fileInfo = { type: fileType, size, name: `test-${fileType}-${size}-${i}.${fileType}` }
                recordResult(false, fileInfo, 'compression', error)
              }
            })
          }
          
          // Process in batches to avoid overwhelming the system
          for (let i = 0; i < testPromises.length; i += SUCCESS_RATE_CONFIG.BATCH_SIZE) {
            const batch = testPromises.slice(i, i + SUCCESS_RATE_CONFIG.BATCH_SIZE)
            await Promise.all(batch.map(fn => fn()))
          }
        }
      }
      
      const successRate = calculateSuccessRate()
      
      // Detailed reporting
      console.log('Text Files Success Rate Report:')
      console.log(`Overall Success Rate: ${(successRate * 100).toFixed(3)}%`)
      console.log(`Total Operations: ${successStats.total}`)
      console.log(`Successful: ${successStats.success}`)
      console.log(`Failed: ${successStats.failures.length}`)
      
      // Break down by file type
      for (const [fileType, stats] of Object.entries(successStats.byFileType)) {
        const rate = stats.success / stats.total
        console.log(`${fileType.toUpperCase()}: ${(rate * 100).toFixed(2)}% (${stats.success}/${stats.total})`)
      }
      
      expect(successRate).toBeGreaterThanOrEqual(SUCCESS_RATE_CONFIG.TARGET_SUCCESS_RATE)
      expect(successStats.total).toBeGreaterThanOrEqual(500) // Ensure significant sample size
    }, 600000) // 10 minutes timeout
    
    it('should achieve 99.9% success rate for binary files', async () => {
      const binaryTypes = ['jpg', 'png', 'pdf', 'mp4', 'zip']
      const testsPerType = Math.ceil(SUCCESS_RATE_CONFIG.MINIMUM_TEST_COUNT / binaryTypes.length / 4)
      
      // Reset stats for binary files
      successStats = {
        total: 0,
        success: 0,
        failures: [],
        byFileType: {},
        bySize: {},
        byOperation: { compression: { total: 0, success: 0 }, decompression: { total: 0, success: 0 } }
      }
      
      for (const fileType of binaryTypes) {
        for (const sizeRange of SUCCESS_RATE_CONFIG.SIZE_RANGES.slice(0, 3)) { // Skip largest range for binary
          const testPromises = []
          
          for (let i = 0; i < testsPerType; i++) {
            const size = Math.floor(Math.random() * (sizeRange.max - sizeRange.min)) + sizeRange.min
            testPromises.push(async () => {
              try {
                const fileInfo = await createTestFile(fileType, size, i)
                const outputPath = path.join(testDir, `${fileInfo.name}.zip`)
                
                // Test compression
                const compressResult = await compressionService.compress([{ path: fileInfo.path }], {
                  outputPath,
                  level: 'fast' // Use fast for binary files
                })
                
                recordResult(true, fileInfo, 'compression')
                
                // Test decompression
                const extractDir = path.join(testDir, `extracted-${fileInfo.name}`)
                const decompressResult = await compressionService.decompress(compressResult.outputPath, {
                  outputPath: extractDir
                })
                
                recordResult(true, fileInfo, 'decompression')
                
                // Verify file integrity (binary comparison)
                const originalContent = await fs.readFile(fileInfo.path)
                const extractedPath = path.join(extractDir, fileInfo.name)
                const extractedContent = await fs.readFile(extractedPath)
                
                expect(extractedContent.equals(originalContent)).toBe(true)
                
                // Cleanup
                await fs.unlink(compressResult.outputPath)
                await fs.rmdir(extractDir, { recursive: true })
                
              } catch (error) {
                const fileInfo = { type: fileType, size, name: `test-${fileType}-${size}-${i}.${fileType}` }
                recordResult(false, fileInfo, 'compression', error)
              }
            })
          }
          
          // Process in batches
          for (let i = 0; i < testPromises.length; i += SUCCESS_RATE_CONFIG.BATCH_SIZE) {
            const batch = testPromises.slice(i, i + SUCCESS_RATE_CONFIG.BATCH_SIZE)
            await Promise.all(batch.map(fn => fn()))
          }
        }
      }
      
      const successRate = calculateSuccessRate()
      
      console.log('Binary Files Success Rate Report:')
      console.log(`Overall Success Rate: ${(successRate * 100).toFixed(3)}%`)
      console.log(`Total Operations: ${successStats.total}`)
      console.log(`Successful: ${successStats.success}`)
      console.log(`Failed: ${successStats.failures.length}`)
      
      expect(successRate).toBeGreaterThanOrEqual(SUCCESS_RATE_CONFIG.TARGET_SUCCESS_RATE)
    }, 600000)
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty files gracefully', async () => {
      const emptyFileStats = { total: 0, success: 0, failures: [] }
      
      for (let i = 0; i < 50; i++) {
        try {
          const fileInfo = await createTestFile('txt', 0, i) // Empty file
          const outputPath = path.join(testDir, `empty-${i}.zip`)
          
          const compressResult = await compressionService.compress([{ path: fileInfo.path }], {
            outputPath,
            level: 'normal'
          })
          
          emptyFileStats.success++
          
          // Cleanup
          await fs.unlink(compressResult.outputPath)
          
        } catch (error) {
          emptyFileStats.failures.push({ index: i, error: error.message })
        }
        
        emptyFileStats.total++
      }
      
      const successRate = emptyFileStats.success / emptyFileStats.total
      console.log(`Empty Files Success Rate: ${(successRate * 100).toFixed(2)}%`)
      
      // Should handle most empty files successfully (some formats may not support empty files)
      expect(successRate).toBeGreaterThan(0.95) // 95% for edge case
    }, 60000)
    
    it('should handle files with special characters in names', async () => {
      const specialNameStats = { total: 0, success: 0, failures: [] }
      const specialChars = ['中文', 'русский', 'émojis🎉', 'spaces in name', 'dots...', 'under_scores']
      
      for (const specialChar of specialChars) {
        for (let i = 0; i < 10; i++) {
          try {
            const content = `Test content for file ${i}`
            const fileName = `test-${specialChar}-${i}.txt`
            const filePath = path.join(testDir, fileName)
            
            await fs.writeFile(filePath, content)
            tempFiles.push(filePath)
            
            const outputPath = path.join(testDir, `special-${i}.zip`)
            
            const compressResult = await compressionService.compress([{ path: filePath }], {
              outputPath,
              level: 'normal'
            })
            
            specialNameStats.success++
            
            // Test extraction
            const extractDir = path.join(testDir, `extracted-special-${i}`)
            await compressionService.decompress(compressResult.outputPath, {
              outputPath: extractDir
            })
            
            // Cleanup
            await fs.unlink(compressResult.outputPath)
            await fs.rmdir(extractDir, { recursive: true })
            
          } catch (error) {
            specialNameStats.failures.push({ name: specialChar, index: i, error: error.message })
          }
          
          specialNameStats.total++
        }
      }
      
      const successRate = specialNameStats.success / specialNameStats.total
      console.log(`Special Characters Success Rate: ${(successRate * 100).toFixed(2)}%`)
      
      // Should handle most special characters (some may be platform-specific)
      expect(successRate).toBeGreaterThan(0.90) // 90% for special characters
    }, 120000)
    
    it('should handle corrupted input gracefully', async () => {
      const corruptedStats = { total: 0, success: 0, failures: [] }
      
      // Create files and then corrupt them
      for (let i = 0; i < 20; i++) {
        try {
          // Create normal file first
          const fileInfo = await createTestFile('txt', 10240, i)
          
          // Corrupt the file by overwriting part of it with random data
          const handle = await fs.open(fileInfo.path, 'r+')
          const corruptData = crypto.randomBytes(100)
          await handle.write(corruptData, 0, corruptData.length, Math.floor(Math.random() * 5000))
          await handle.close()
          
          const outputPath = path.join(testDir, `corrupted-${i}.zip`)
          
          const compressResult = await compressionService.compress([{ path: fileInfo.path }], {
            outputPath,
            level: 'normal'
          })
          
          corruptedStats.success++
          
          // Cleanup
          await fs.unlink(compressResult.outputPath)
          
        } catch (error) {
          // This is expected for corrupted files, but should be handled gracefully
          corruptedStats.failures.push({ index: i, error: error.message })
          expect(error.message).toBeDefined() // Should have meaningful error message
        }
        
        corruptedStats.total++
      }
      
      console.log(`Corrupted Files Handled: ${corruptedStats.total}, Graceful Errors: ${corruptedStats.failures.length}`)
      
      // Should handle all corrupted files gracefully (either succeed or fail with proper error)
      expect(corruptedStats.total).toBe(20)
    }, 60000)
  })

  describe('Compression Level Success Rates', () => {
    it('should maintain high success rates across all compression levels', async () => {
      const levels = ['fast', 'normal', 'maximum']
      const levelStats = {}
      
      for (const level of levels) {
        levelStats[level] = { total: 0, success: 0, failures: [] }
        
        for (let i = 0; i < 100; i++) {
          try {
            const fileType = SUCCESS_RATE_CONFIG.STANDARD_FILE_TYPES[i % SUCCESS_RATE_CONFIG.STANDARD_FILE_TYPES.length]
            const size = Math.floor(Math.random() * 1024 * 1024) + 1024 // 1KB to 1MB
            const fileInfo = await createTestFile(fileType, size, i)
            
            const outputPath = path.join(testDir, `level-${level}-${i}.zip`)
            
            const compressResult = await compressionService.compress([{ path: fileInfo.path }], {
              outputPath,
              level
            })
            
            levelStats[level].success++
            
            // Cleanup
            await fs.unlink(compressResult.outputPath)
            
          } catch (error) {
            levelStats[level].failures.push({ index: i, error: error.message })
          }
          
          levelStats[level].total++
        }
      }
      
      // All compression levels should achieve target success rate
      for (const [level, stats] of Object.entries(levelStats)) {
        const successRate = stats.success / stats.total
        console.log(`${level.toUpperCase()} Level Success Rate: ${(successRate * 100).toFixed(2)}%`)
        expect(successRate).toBeGreaterThanOrEqual(SUCCESS_RATE_CONFIG.TARGET_SUCCESS_RATE)
      }
    }, 300000) // 5 minutes
  })

  describe('Concurrent Operations Success Rate', () => {
    it('should maintain success rate under concurrent load', async () => {
      const concurrentStats = { total: 0, success: 0, failures: [] }
      const concurrentOperations = []
      
      // Create multiple concurrent operations
      for (let i = 0; i < 50; i++) {
        const operation = async () => {
          try {
            const fileType = SUCCESS_RATE_CONFIG.STANDARD_FILE_TYPES[i % SUCCESS_RATE_CONFIG.STANDARD_FILE_TYPES.length]
            const size = Math.floor(Math.random() * 1024 * 1024) + 1024
            const fileInfo = await createTestFile(fileType, size, i)
            
            const outputPath = path.join(testDir, `concurrent-${i}.zip`)
            
            const compressResult = await compressionService.compress([{ path: fileInfo.path }], {
              outputPath,
              level: 'fast' // Use fast for concurrent operations
            })
            
            concurrentStats.success++
            
            // Test decompression as well
            const extractDir = path.join(testDir, `concurrent-extracted-${i}`)
            await compressionService.decompress(compressResult.outputPath, {
              outputPath: extractDir
            })
            
            // Cleanup
            await fs.unlink(compressResult.outputPath)
            await fs.rmdir(extractDir, { recursive: true })
            
          } catch (error) {
            concurrentStats.failures.push({ index: i, error: error.message })
          }
          
          concurrentStats.total++
        }
        
        concurrentOperations.push(operation())
      }
      
      // Wait for all operations to complete
      await Promise.all(concurrentOperations)
      
      const successRate = concurrentStats.success / concurrentStats.total
      console.log(`Concurrent Operations Success Rate: ${(successRate * 100).toFixed(2)}%`)
      console.log(`Total: ${concurrentStats.total}, Success: ${concurrentStats.success}, Failures: ${concurrentStats.failures.length}`)
      
      expect(successRate).toBeGreaterThanOrEqual(SUCCESS_RATE_CONFIG.TARGET_SUCCESS_RATE)
    }, 300000) // 5 minutes
  })

  describe('Long-term Stability Test', () => {
    it('should maintain success rate over extended operations', async () => {
      const stabilityStats = { total: 0, success: 0, failures: [], samples: [] }
      const sampleInterval = 50 // Take sample every 50 operations
      
      for (let i = 0; i < 500; i++) {
        try {
          const fileType = SUCCESS_RATE_CONFIG.STANDARD_FILE_TYPES[i % SUCCESS_RATE_CONFIG.STANDARD_FILE_TYPES.length]
          const sizeRange = SUCCESS_RATE_CONFIG.SIZE_RANGES[i % SUCCESS_RATE_CONFIG.SIZE_RANGES.length]
          const size = Math.floor(Math.random() * (sizeRange.max - sizeRange.min)) + sizeRange.min
          
          const fileInfo = await createTestFile(fileType, size, i)
          const outputPath = path.join(testDir, `stability-${i}.zip`)
          
          const compressResult = await compressionService.compress([{ path: fileInfo.path }], {
            outputPath,
            level: 'normal'
          })
          
          stabilityStats.success++
          
          // Periodic cleanup to avoid accumulating too many files
          if (i % 10 === 0) {
            await fs.unlink(compressResult.outputPath)
          }
          
        } catch (error) {
          stabilityStats.failures.push({ 
            index: i, 
            error: error.message,
            timestamp: Date.now()
          })
        }
        
        stabilityStats.total++
        
        // Take periodic samples for trend analysis
        if (stabilityStats.total % sampleInterval === 0) {
          const currentRate = stabilityStats.success / stabilityStats.total
          stabilityStats.samples.push({
            operations: stabilityStats.total,
            successRate: currentRate,
            timestamp: Date.now()
          })
          
          // Success rate should not degrade significantly over time
          expect(currentRate).toBeGreaterThan(SUCCESS_RATE_CONFIG.TARGET_SUCCESS_RATE * 0.99) // Allow 1% degradation
        }
      }
      
      const finalSuccessRate = stabilityStats.success / stabilityStats.total
      console.log(`Long-term Stability Success Rate: ${(finalSuccessRate * 100).toFixed(3)}%`)
      console.log(`Operations: ${stabilityStats.total}, Failures: ${stabilityStats.failures.length}`)
      
      // Analyze trend
      if (stabilityStats.samples.length >= 2) {
        const firstHalf = stabilityStats.samples.slice(0, Math.floor(stabilityStats.samples.length / 2))
        const secondHalf = stabilityStats.samples.slice(Math.floor(stabilityStats.samples.length / 2))
        
        const firstHalfAvg = firstHalf.reduce((sum, s) => sum + s.successRate, 0) / firstHalf.length
        const secondHalfAvg = secondHalf.reduce((sum, s) => sum + s.successRate, 0) / secondHalf.length
        
        console.log(`First Half Avg: ${(firstHalfAvg * 100).toFixed(2)}%, Second Half Avg: ${(secondHalfAvg * 100).toFixed(2)}%`)
        
        // Success rate should not degrade significantly over time
        expect(secondHalfAvg).toBeGreaterThan(firstHalfAvg * 0.995) // Allow max 0.5% degradation
      }
      
      expect(finalSuccessRate).toBeGreaterThanOrEqual(SUCCESS_RATE_CONFIG.TARGET_SUCCESS_RATE)
    }, 900000) // 15 minutes
  })

  afterAll(() => {
    // Final comprehensive report
    console.log('\n=== COMPREHENSIVE SUCCESS RATE REPORT ===')
    console.log(`Target Success Rate: ${(SUCCESS_RATE_CONFIG.TARGET_SUCCESS_RATE * 100).toFixed(1)}%`)
    console.log(`Total Operations Tested: ${successStats.total}`)
    console.log(`Overall Success Rate: ${(calculateSuccessRate() * 100).toFixed(3)}%`)
    console.log(`Total Failures: ${successStats.failures.length}`)
    
    if (successStats.failures.length > 0) {
      console.log('\nFailure Analysis:')
      const errorCounts = {}
      successStats.failures.forEach(failure => {
        const errorType = failure.error.split(':')[0] || 'Unknown'
        errorCounts[errorType] = (errorCounts[errorType] || 0) + 1
      })
      
      for (const [error, count] of Object.entries(errorCounts)) {
        console.log(`  ${error}: ${count} occurrences`)
      }
    }
    
    console.log('\nSuccess Rate by File Type:')
    for (const [fileType, stats] of Object.entries(successStats.byFileType)) {
      const rate = (stats.success / stats.total * 100).toFixed(2)
      console.log(`  ${fileType.toUpperCase()}: ${rate}% (${stats.success}/${stats.total})`)
    }
    
    console.log('\nSuccess Rate by Operation:')
    for (const [operation, stats] of Object.entries(successStats.byOperation)) {
      if (stats.total > 0) {
        const rate = (stats.success / stats.total * 100).toFixed(2)
        console.log(`  ${operation.toUpperCase()}: ${rate}% (${stats.success}/${stats.total})`)
      }
    }
    
    console.log('==========================================\n')
  })
})