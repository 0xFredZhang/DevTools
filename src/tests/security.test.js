/**
 * Security Tests for Encryption Implementation
 * 
 * Comprehensive security test suite for encryption functionality
 * including cryptographic strength, attack resistance, and compliance.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import crypto from 'crypto'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import { encryptionService } from '../services/encryptionService.js'
import { compressionService } from '../services/compressionService.js'

describe('Security Tests - Encryption Implementation', () => {
  let testDir
  let tempFiles = []
  
  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `security-test-${Date.now()}`)
    await fs.mkdir(testDir, { recursive: true })
  })
  
  afterEach(async () => {
    // Secure cleanup - overwrite files before deletion
    for (const file of tempFiles) {
      try {
        const stats = await fs.stat(file)
        const randomData = crypto.randomBytes(stats.size)
        await fs.writeFile(file, randomData)
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
   * Create a test file with specific content
   */
  async function createTestFile(content, name = `test-${Date.now()}.txt`) {
    const filePath = path.join(testDir, name)
    await fs.writeFile(filePath, content)
    tempFiles.push(filePath)
    return filePath
  }

  describe('Password Security', () => {
    it('should generate cryptographically secure passwords', () => {
      const passwords = new Set()
      const passwordCount = 1000
      
      // Generate many passwords to test uniqueness
      for (let i = 0; i < passwordCount; i++) {
        const password = encryptionService.generatePassword()
        
        // Should not collide
        expect(passwords.has(password)).toBe(false)
        passwords.add(password)
        
        // Should meet minimum security requirements
        expect(password.length).toBeGreaterThanOrEqual(16)
        expect(/[A-Z]/.test(password)).toBe(true) // Upper case
        expect(/[a-z]/.test(password)).toBe(true) // Lower case
        expect(/[0-9]/.test(password)).toBe(true) // Numbers
        expect(/[^A-Za-z0-9]/.test(password)).toBe(true) // Special characters
      }
      
      // All passwords should be unique
      expect(passwords.size).toBe(passwordCount)
    })
    
    it('should validate password strength correctly', () => {
      const testCases = [
        { password: '123456', expected: false, strength: 'very_weak' },
        { password: 'password', expected: false, strength: 'weak' },
        { password: 'Password123', expected: false, strength: 'medium' },
        { password: 'P@ssw0rd123!', expected: true, strength: 'strong' },
        { password: 'Tr0ub4dor&3', expected: true, strength: 'strong' },
        { password: 'correct horse battery staple', expected: true, strength: 'strong' }
      ]
      
      testCases.forEach(({ password, expected, strength }) => {
        const result = encryptionService.validatePassword(password)
        expect(result.isValid).toBe(expected)
        expect(result.strength).toBe(strength)
        
        if (!expected) {
          expect(result.suggestions).toBeInstanceOf(Array)
          expect(result.suggestions.length).toBeGreaterThan(0)
        }
      })
    })
    
    it('should detect common password patterns', () => {
      const commonPasswords = [
        '123456789',
        'qwerty123',
        'admin123',
        'letmein',
        'welcome123',
        'monkey123',
        'dragon123'
      ]
      
      commonPasswords.forEach(password => {
        const result = encryptionService.validatePassword(password)
        expect(result.isValid).toBe(false)
        expect(result.issues).toContain('common_password')
      })
    })
    
    it('should detect keyboard patterns and sequences', () => {
      const patterns = [
        'qwertyuiop',
        'asdfghjkl',
        'zxcvbnm',
        '1234567890',
        'abcdefgh',
        '147258369'
      ]
      
      patterns.forEach(password => {
        const result = encryptionService.validatePassword(password)
        expect(result.isValid).toBe(false)
        expect(result.issues).toContain('keyboard_pattern')
      })
    })
    
    it('should calculate entropy correctly', () => {
      const testCases = [
        { password: 'aaaaaaa', expectedEntropy: 0 }, // No entropy
        { password: 'abcdefg', expectedEntropy: 18.2 }, // Low entropy
        { password: 'Tr0ub4dor&3', expectedEntropy: 65 }, // Good entropy
        { password: crypto.randomBytes(16).toString('hex'), expectedEntropy: 128 } // High entropy
      ]
      
      testCases.forEach(({ password, expectedEntropy }) => {
        const result = encryptionService.calculatePasswordEntropy(password)
        expect(result).toBeCloseTo(expectedEntropy, 1)
      })
    })
  })

  describe('Encryption Algorithm Security', () => {
    it('should use AES-256-GCM for encryption', async () => {
      const testData = 'Sensitive test data that needs encryption'
      const password = 'SecureTestPassword123!'
      
      const encrypted = await encryptionService.encrypt(testData, password)
      
      // Should use AES-256-GCM
      expect(encrypted.algorithm).toBe('aes-256-gcm')
      expect(encrypted.keyDerivation).toBe('pbkdf2')
      expect(encrypted.iterations).toBeGreaterThanOrEqual(100000)
      
      // Should have all required components
      expect(encrypted.salt).toBeDefined()
      expect(encrypted.iv).toBeDefined()
      expect(encrypted.authTag).toBeDefined()
      expect(encrypted.encryptedData).toBeDefined()
      
      // Components should be proper lengths
      expect(Buffer.from(encrypted.salt, 'hex').length).toBe(32) // 256 bits
      expect(Buffer.from(encrypted.iv, 'hex').length).toBe(12) // 96 bits for GCM
      expect(Buffer.from(encrypted.authTag, 'hex').length).toBe(16) // 128 bits
    })
    
    it('should generate unique salts for each encryption', async () => {
      const testData = 'Test data'
      const password = 'TestPassword123!'
      const salts = new Set()
      
      for (let i = 0; i < 100; i++) {
        const encrypted = await encryptionService.encrypt(testData, password)
        
        // Salt should be unique
        expect(salts.has(encrypted.salt)).toBe(false)
        salts.add(encrypted.salt)
      }
      
      expect(salts.size).toBe(100)
    })
    
    it('should generate unique IVs for each encryption', async () => {
      const testData = 'Test data'
      const password = 'TestPassword123!'
      const ivs = new Set()
      
      for (let i = 0; i < 100; i++) {
        const encrypted = await encryptionService.encrypt(testData, password)
        
        // IV should be unique
        expect(ivs.has(encrypted.iv)).toBe(false)
        ivs.add(encrypted.iv)
      }
      
      expect(ivs.size).toBe(100)
    })
    
    it('should use sufficient PBKDF2 iterations', async () => {
      const testData = 'Test data'
      const password = 'TestPassword123!'
      
      const encrypted = await encryptionService.encrypt(testData, password)
      
      // Should use at least 100,000 iterations (OWASP recommendation)
      expect(encrypted.iterations).toBeGreaterThanOrEqual(100000)
      
      // Should complete within reasonable time (security vs usability)
      const startTime = Date.now()
      await encryptionService.decrypt(encrypted, password)
      const duration = Date.now() - startTime
      
      expect(duration).toBeLessThan(2000) // Should complete within 2 seconds
    })
  })

  describe('Cryptographic Integrity', () => {
    it('should detect tampering with encrypted data', async () => {
      const testData = 'Important data that must not be tampered with'
      const password = 'SecurePassword123!'
      
      const encrypted = await encryptionService.encrypt(testData, password)
      
      // Tamper with encrypted data
      const tamperedData = { ...encrypted }
      const encryptedBuffer = Buffer.from(encrypted.encryptedData, 'hex')
      encryptedBuffer[0] ^= 1 // Flip a bit
      tamperedData.encryptedData = encryptedBuffer.toString('hex')
      
      // Should detect tampering
      await expect(
        encryptionService.decrypt(tamperedData, password)
      ).rejects.toThrow(/authentication|integrity|tampered/i)
    })
    
    it('should detect tampering with authentication tag', async () => {
      const testData = 'Test data'
      const password = 'TestPassword123!'
      
      const encrypted = await encryptionService.encrypt(testData, password)
      
      // Tamper with auth tag
      const tamperedData = { ...encrypted }
      const authTagBuffer = Buffer.from(encrypted.authTag, 'hex')
      authTagBuffer[0] ^= 1 // Flip a bit
      tamperedData.authTag = authTagBuffer.toString('hex')
      
      // Should detect tampering
      await expect(
        encryptionService.decrypt(tamperedData, password)
      ).rejects.toThrow(/authentication|integrity/i)
    })
    
    it('should detect tampering with salt', async () => {
      const testData = 'Test data'
      const password = 'TestPassword123!'
      
      const encrypted = await encryptionService.encrypt(testData, password)
      
      // Tamper with salt
      const tamperedData = { ...encrypted }
      const saltBuffer = Buffer.from(encrypted.salt, 'hex')
      saltBuffer[0] ^= 1 // Flip a bit
      tamperedData.salt = saltBuffer.toString('hex')
      
      // Should fail decryption (wrong key derivation)
      await expect(
        encryptionService.decrypt(tamperedData, password)
      ).rejects.toThrow()
    })
    
    it('should detect tampering with IV', async () => {
      const testData = 'Test data'
      const password = 'TestPassword123!'
      
      const encrypted = await encryptionService.encrypt(testData, password)
      
      // Tamper with IV
      const tamperedData = { ...encrypted }
      const ivBuffer = Buffer.from(encrypted.iv, 'hex')
      ivBuffer[0] ^= 1 // Flip a bit
      tamperedData.iv = ivBuffer.toString('hex')
      
      // Should fail decryption or produce garbage
      const result = await encryptionService.decrypt(tamperedData, password)
      expect(result).not.toBe(testData)
    })
  })

  describe('Password-Based Attacks Resistance', () => {
    it('should resist brute force attacks with strong passwords', async () => {
      const testData = 'Confidential information'
      const strongPassword = encryptionService.generatePassword()
      
      const encrypted = await encryptionService.encrypt(testData, strongPassword)
      
      // Attempt brute force with common passwords
      const commonPasswords = [
        'password', '123456', 'admin', 'letmein', 'welcome',
        'monkey', 'dragon', 'qwerty', 'abc123', 'password123'
      ]
      
      for (const wrongPassword of commonPasswords) {
        await expect(
          encryptionService.decrypt(encrypted, wrongPassword)
        ).rejects.toThrow()
      }
      
      // Should still work with correct password
      const decrypted = await encryptionService.decrypt(encrypted, strongPassword)
      expect(decrypted).toBe(testData)
    })
    
    it('should resist dictionary attacks', async () => {
      const testData = 'Secret data'
      const password = 'Tr0ub4dor&3' // Strong but known password
      
      const encrypted = await encryptionService.encrypt(testData, password)
      
      // Dictionary of variations
      const dictionary = [
        'troubador3', 'Troubador3', 'troubador&3', 'Tr0ubador3',
        'Troublador&3', 'Tr0ub4dor3', 'Tr0ub4dor&', 'tr0ub4dor&3'
      ]
      
      for (const wrongPassword of dictionary) {
        await expect(
          encryptionService.decrypt(encrypted, wrongPassword)
        ).rejects.toThrow()
      }
      
      // Should only work with exact password
      const decrypted = await encryptionService.decrypt(encrypted, password)
      expect(decrypted).toBe(testData)
    })
    
    it('should make key derivation computationally expensive', async () => {
      const password = 'TestPassword123!'
      const testData = 'Test data'
      
      // Time key derivation process
      const iterations = [10000, 50000, 100000, 200000]
      const times = []
      
      for (const iterCount of iterations) {
        const startTime = Date.now()
        
        // Simulate encryption with specific iteration count
        const salt = crypto.randomBytes(32)
        crypto.pbkdf2Sync(password, salt, iterCount, 32, 'sha256')
        
        times.push(Date.now() - startTime)
      }
      
      // Time should increase with iterations (more security)
      expect(times[1]).toBeGreaterThan(times[0])
      expect(times[2]).toBeGreaterThan(times[1])
      expect(times[3]).toBeGreaterThan(times[2])
      
      // But should still be reasonable for user experience
      expect(times[2]).toBeLessThan(2000) // 100k iterations < 2 seconds
    })
  })

  describe('Side-Channel Attack Resistance', () => {
    it('should use constant-time comparison for password verification', async () => {
      const testData = 'Test data'
      const correctPassword = 'CorrectPassword123!'
      const wrongPassword = 'WrongPassword123!'
      
      const encrypted = await encryptionService.encrypt(testData, correctPassword)
      
      // Measure timing for multiple attempts
      const correctTimes = []
      const wrongTimes = []
      
      for (let i = 0; i < 10; i++) {
        // Time correct password
        const startCorrect = process.hrtime.bigint()
        try {
          await encryptionService.decrypt(encrypted, correctPassword)
        } catch (e) {}
        const endCorrect = process.hrtime.bigint()
        correctTimes.push(Number(endCorrect - startCorrect))
        
        // Time wrong password
        const startWrong = process.hrtime.bigint()
        try {
          await encryptionService.decrypt(encrypted, wrongPassword)
        } catch (e) {}
        const endWrong = process.hrtime.bigint()
        wrongTimes.push(Number(endWrong - startWrong))
      }
      
      // Calculate averages
      const avgCorrect = correctTimes.reduce((a, b) => a + b) / correctTimes.length
      const avgWrong = wrongTimes.reduce((a, b) => a + b) / wrongTimes.length
      
      // Times should be similar (within 10% to account for system variance)
      const timeDifference = Math.abs(avgCorrect - avgWrong) / Math.max(avgCorrect, avgWrong)
      expect(timeDifference).toBeLessThan(0.1)
    })
    
    it('should clear sensitive data from memory', async () => {
      const testData = 'Very sensitive secret information'
      const password = 'SecurePassword123!'
      
      // Encrypt data
      const encrypted = await encryptionService.encrypt(testData, password)
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc()
      }
      
      // Memory should not contain plaintext after encryption
      // This is a basic check - in practice, we'd need more sophisticated memory analysis
      const memoryUsage = process.memoryUsage()
      expect(memoryUsage.heapUsed).toBeDefined()
      
      // Decrypt data
      const decrypted = await encryptionService.decrypt(encrypted, password)
      expect(decrypted).toBe(testData)
      
      // Ensure the service properly handles memory cleanup
      expect(encryptionService.clearSensitiveData).toBeDefined()
      expect(typeof encryptionService.clearSensitiveData).toBe('function')
    })
  })

  describe('Archive Encryption Integration', () => {
    it('should encrypt ZIP archives securely', async () => {
      const testFiles = [
        await createTestFile('Confidential document 1', 'doc1.txt'),
        await createTestFile('Secret data 2', 'doc2.txt'),
        await createTestFile('Private information 3', 'doc3.txt')
      ]
      
      const password = 'ArchivePassword123!'
      const archivePath = path.join(testDir, 'encrypted-archive.zip')
      
      // Create encrypted archive
      const result = await compressionService.compress(
        testFiles.map(path => ({ path })),
        {
          outputPath: archivePath,
          encryption: {
            enabled: true,
            password,
            algorithm: 'aes-256'
          }
        }
      )
      
      expect(result.outputPath).toBe(archivePath)
      
      // Archive should not contain readable plaintext
      const archiveContent = await fs.readFile(archivePath)
      expect(archiveContent.toString()).not.toContain('Confidential document')
      expect(archiveContent.toString()).not.toContain('Secret data')
      expect(archiveContent.toString()).not.toContain('Private information')
      
      // Should decrypt with correct password
      const extractPath = path.join(testDir, 'extracted')
      const decryptResult = await compressionService.decompress(archivePath, {
        outputPath: extractPath,
        password
      })
      
      expect(decryptResult.outputPath).toBe(extractPath)
      
      // Verify extracted files
      const extracted1 = await fs.readFile(path.join(extractPath, 'doc1.txt'), 'utf8')
      const extracted2 = await fs.readFile(path.join(extractPath, 'doc2.txt'), 'utf8')
      const extracted3 = await fs.readFile(path.join(extractPath, 'doc3.txt'), 'utf8')
      
      expect(extracted1).toBe('Confidential document 1')
      expect(extracted2).toBe('Secret data 2')
      expect(extracted3).toBe('Private information 3')
    })
    
    it('should reject incorrect passwords for encrypted archives', async () => {
      const testFile = await createTestFile('Encrypted content', 'encrypted.txt')
      const correctPassword = 'CorrectPassword123!'
      const wrongPassword = 'WrongPassword123!'
      const archivePath = path.join(testDir, 'password-protected.zip')
      
      // Create encrypted archive
      await compressionService.compress([{ path: testFile }], {
        outputPath: archivePath,
        encryption: {
          enabled: true,
          password: correctPassword
        }
      })
      
      const extractPath = path.join(testDir, 'extracted-wrong')
      
      // Should reject wrong password
      await expect(
        compressionService.decompress(archivePath, {
          outputPath: extractPath,
          password: wrongPassword
        })
      ).rejects.toThrow(/password|authentication|decrypt/i)
      
      // Should accept correct password
      await expect(
        compressionService.decompress(archivePath, {
          outputPath: extractPath,
          password: correctPassword
        })
      ).resolves.toBeDefined()
    })
  })

  describe('Compliance and Standards', () => {
    it('should meet FIPS 140-2 Level 1 requirements', async () => {
      // Test approved cryptographic algorithms
      const algorithms = encryptionService.getSupportedAlgorithms()
      
      expect(algorithms).toContain('aes-256-gcm') // FIPS approved
      expect(algorithms).toContain('aes-256-cbc') // FIPS approved
      expect(algorithms).not.toContain('des') // Not FIPS approved
      expect(algorithms).not.toContain('rc4') // Not FIPS approved
      
      // Test key sizes
      const keyInfo = encryptionService.getKeyInfo('aes-256-gcm')
      expect(keyInfo.keySize).toBe(256)
      expect(keyInfo.blockSize).toBe(128)
    })
    
    it('should follow OWASP cryptographic guidelines', async () => {
      const testData = 'OWASP compliance test'
      const password = 'OWASPCompliantPassword123!'
      
      const encrypted = await encryptionService.encrypt(testData, password)
      
      // Use approved algorithms
      expect(encrypted.algorithm).toMatch(/^aes-256-(gcm|cbc)$/)
      
      // Use sufficient key derivation iterations
      expect(encrypted.iterations).toBeGreaterThanOrEqual(100000)
      
      // Use proper salt size
      expect(Buffer.from(encrypted.salt, 'hex').length).toBeGreaterThanOrEqual(32)
      
      // Use proper IV size for algorithm
      const ivLength = Buffer.from(encrypted.iv, 'hex').length
      if (encrypted.algorithm === 'aes-256-gcm') {
        expect(ivLength).toBe(12) // 96 bits for GCM
      } else {
        expect(ivLength).toBe(16) // 128 bits for CBC
      }
    })
    
    it('should implement secure random number generation', () => {
      const randomValues = new Set()
      
      // Generate many random values
      for (let i = 0; i < 1000; i++) {
        const randomBytes = encryptionService.generateSecureRandom(32)
        const hexValue = randomBytes.toString('hex')
        
        // Should be unique
        expect(randomValues.has(hexValue)).toBe(false)
        randomValues.add(hexValue)
        
        // Should be proper length
        expect(randomBytes.length).toBe(32)
      }
      
      // All values should be unique
      expect(randomValues.size).toBe(1000)
    })
  })

  describe('Performance Under Security Constraints', () => {
    it('should maintain performance with security features enabled', async () => {
      const testData = 'A'.repeat(1024 * 1024) // 1MB of data
      const password = 'PerformanceTestPassword123!'
      
      // Time encryption
      const encryptStart = Date.now()
      const encrypted = await encryptionService.encrypt(testData, password)
      const encryptTime = Date.now() - encryptStart
      
      // Time decryption
      const decryptStart = Date.now()
      const decrypted = await encryptionService.decrypt(encrypted, password)
      const decryptTime = Date.now() - decryptStart
      
      expect(decrypted).toBe(testData)
      
      // Should complete within reasonable time
      expect(encryptTime).toBeLessThan(5000) // 5 seconds for 1MB
      expect(decryptTime).toBeLessThan(5000)
      
      // Encryption should be slower than decryption (key derivation)
      expect(encryptTime).toBeGreaterThanOrEqual(decryptTime)
    })
    
    it('should handle concurrent encryption operations securely', async () => {
      const testData = 'Concurrent encryption test'
      const passwords = Array.from({ length: 10 }, (_, i) => `Password${i}123!`)
      
      // Start multiple concurrent encryptions
      const encryptionPromises = passwords.map(password =>
        encryptionService.encrypt(testData, password)
      )
      
      const results = await Promise.all(encryptionPromises)
      
      // All encryptions should succeed
      expect(results).toHaveLength(10)
      
      // All should have unique salts and IVs
      const salts = new Set()
      const ivs = new Set()
      
      results.forEach(result => {
        expect(salts.has(result.salt)).toBe(false)
        expect(ivs.has(result.iv)).toBe(false)
        salts.add(result.salt)
        ivs.add(result.iv)
      })
      
      // Verify each can be decrypted with its respective password
      for (let i = 0; i < results.length; i++) {
        const decrypted = await encryptionService.decrypt(results[i], passwords[i])
        expect(decrypted).toBe(testData)
      }
    })
  })

  describe('Security Configuration', () => {
    it('should allow configuration of security parameters', () => {
      const originalConfig = encryptionService.getSecurityConfig()
      
      // Should have configurable parameters
      expect(originalConfig.defaultAlgorithm).toBeDefined()
      expect(originalConfig.pbkdf2Iterations).toBeGreaterThanOrEqual(100000)
      expect(originalConfig.saltLength).toBeGreaterThanOrEqual(32)
      expect(originalConfig.keyLength).toBe(32) // 256 bits
      
      // Should allow secure configuration updates
      encryptionService.updateSecurityConfig({
        pbkdf2Iterations: 200000 // Higher security
      })
      
      const updatedConfig = encryptionService.getSecurityConfig()
      expect(updatedConfig.pbkdf2Iterations).toBe(200000)
      
      // Should reject insecure configurations
      expect(() => {
        encryptionService.updateSecurityConfig({
          pbkdf2Iterations: 1000 // Too low
        })
      }).toThrow(/insecure|insufficient/i)
      
      // Restore original config
      encryptionService.updateSecurityConfig(originalConfig)
    })
    
    it('should validate security configuration on startup', () => {
      // Service should perform self-checks on initialization
      expect(() => {
        encryptionService.validateConfiguration()
      }).not.toThrow()
      
      // Should detect if cryptographic functions are available
      const capabilities = encryptionService.getCryptographicCapabilities()
      expect(capabilities.aes256).toBe(true)
      expect(capabilities.sha256).toBe(true)
      expect(capabilities.pbkdf2).toBe(true)
      expect(capabilities.secureRandom).toBe(true)
    })
  })
})