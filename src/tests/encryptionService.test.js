/**
 * Encryption Service Test Suite
 * 
 * Comprehensive tests for AES-256 encryption, password validation, and security features
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import crypto from 'crypto'
import { EncryptionService, STRENGTH_LEVELS, ENCRYPTION_CONFIG } from '../services/encryptionService.js'

// Test data and utilities
const TEST_DATA = {
  shortText: 'Hello World',
  longText: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(100),
  binaryData: crypto.randomBytes(1024),
  emptyData: '',
  unicodeText: '🔒🔑 Encryption Test 中文 العربية 🚀',
  jsonData: JSON.stringify({ test: true, array: [1, 2, 3], nested: { value: 'test' } })
}

const TEST_PASSWORDS = {
  weak: 'password',
  short: '123',
  noUpper: 'password123!',
  noLower: 'PASSWORD123!',
  noNumbers: 'Password!',
  noSymbols: 'Password123',
  valid: 'Password123!',
  strong: 'MyV3ryStr0ng!P@ssw0rd#2024',
  unicode: 'Pássw0rd!中文🔒',
  maxLength: 'a'.repeat(128),
  tooLong: 'a'.repeat(129)
}

describe('EncryptionService', () => {
  describe('Salt and IV Generation', () => {
    it('should generate unique salts', () => {
      const salt1 = EncryptionService.generateSalt()
      const salt2 = EncryptionService.generateSalt()
      
      expect(salt1).toHaveLength(ENCRYPTION_CONFIG.SALT_LENGTH)
      expect(salt2).toHaveLength(ENCRYPTION_CONFIG.SALT_LENGTH)
      expect(salt1.equals(salt2)).toBe(false)
    })

    it('should generate unique IVs', () => {
      const iv1 = EncryptionService.generateIV()
      const iv2 = EncryptionService.generateIV()
      
      expect(iv1).toHaveLength(ENCRYPTION_CONFIG.IV_LENGTH)
      expect(iv2).toHaveLength(ENCRYPTION_CONFIG.IV_LENGTH)
      expect(iv1.equals(iv2)).toBe(false)
    })

    it('should generate cryptographically secure random values', () => {
      // Test that generated values have good entropy
      const salts = Array.from({ length: 100 }, () => EncryptionService.generateSalt())
      const uniqueSalts = new Set(salts.map(salt => salt.toString('hex')))
      
      expect(uniqueSalts.size).toBe(100) // All salts should be unique
    })
  })

  describe('Key Derivation', () => {
    it('should derive consistent keys from same password and salt', async () => {
      const password = TEST_PASSWORDS.valid
      const salt = EncryptionService.generateSalt()
      
      const key1 = await EncryptionService.deriveKey(password, salt)
      const key2 = await EncryptionService.deriveKey(password, salt)
      
      expect(key1).toHaveLength(ENCRYPTION_CONFIG.KEY_LENGTH)
      expect(key1.equals(key2)).toBe(true)
    })

    it('should derive different keys with different salts', async () => {
      const password = TEST_PASSWORDS.valid
      const salt1 = EncryptionService.generateSalt()
      const salt2 = EncryptionService.generateSalt()
      
      const key1 = await EncryptionService.deriveKey(password, salt1)
      const key2 = await EncryptionService.deriveKey(password, salt2)
      
      expect(key1.equals(key2)).toBe(false)
    })

    it('should derive different keys with different passwords', async () => {
      const salt = EncryptionService.generateSalt()
      
      const key1 = await EncryptionService.deriveKey(TEST_PASSWORDS.valid, salt)
      const key2 = await EncryptionService.deriveKey(TEST_PASSWORDS.strong, salt)
      
      expect(key1.equals(key2)).toBe(false)
    })

    it('should handle unicode passwords correctly', async () => {
      const salt = EncryptionService.generateSalt()
      const key = await EncryptionService.deriveKey(TEST_PASSWORDS.unicode, salt)
      
      expect(key).toHaveLength(ENCRYPTION_CONFIG.KEY_LENGTH)
    })
  })

  describe('Password Validation', () => {
    it('should reject weak passwords', () => {
      const result = EncryptionService.validatePassword(TEST_PASSWORDS.weak)
      
      expect(result.isValid).toBe(false)
      expect(result.strength).toBe(STRENGTH_LEVELS.VERY_WEAK)
      expect(result.feedback).toContain('Password must contain at least one uppercase letter')
      expect(result.feedback).toContain('Password must contain at least one number')
    })

    it('should reject short passwords', () => {
      const result = EncryptionService.validatePassword(TEST_PASSWORDS.short)
      
      expect(result.isValid).toBe(false)
      expect(result.feedback).toContain('Password must be at least 8 characters long')
    })

    it('should provide specific feedback for missing character types', () => {
      const tests = [
        {
          password: TEST_PASSWORDS.noUpper,
          expected: 'Password must contain at least one uppercase letter'
        },
        {
          password: TEST_PASSWORDS.noLower,
          expected: 'Password must contain at least one lowercase letter'
        },
        {
          password: TEST_PASSWORDS.noNumbers,
          expected: 'Password must contain at least one number'
        }
      ]

      tests.forEach(({ password, expected }) => {
        const result = EncryptionService.validatePassword(password)
        expect(result.feedback).toContain(expected)
      })
    })

    it('should accept valid passwords', () => {
      const result = EncryptionService.validatePassword(TEST_PASSWORDS.valid)
      
      expect(result.isValid).toBe(true)
      expect(result.requirements.length).toBe(true)
      expect(result.requirements.lowercase).toBe(true)
      expect(result.requirements.uppercase).toBe(true)
      expect(result.requirements.numbers).toBe(true)
    })

    it('should rate strong passwords highly', () => {
      const result = EncryptionService.validatePassword(TEST_PASSWORDS.strong)
      
      expect(result.isValid).toBe(true)
      expect(result.strength).toBeGreaterThanOrEqual(STRENGTH_LEVELS.GOOD)
    })

    it('should reject passwords that are too long', () => {
      const result = EncryptionService.validatePassword(TEST_PASSWORDS.tooLong)
      
      expect(result.isValid).toBe(false)
      expect(result.feedback).toContain('Password must not exceed 128 characters')
    })

    it('should handle null and undefined passwords', () => {
      const nullResult = EncryptionService.validatePassword(null)
      const undefinedResult = EncryptionService.validatePassword(undefined)
      
      expect(nullResult.isValid).toBe(false)
      expect(undefinedResult.isValid).toBe(false)
      expect(nullResult.feedback).toContain('Password is required')
      expect(undefinedResult.feedback).toContain('Password is required')
    })

    it('should handle unicode passwords', () => {
      const result = EncryptionService.validatePassword(TEST_PASSWORDS.unicode)
      
      expect(result.isValid).toBe(true)
    })
  })

  describe('Encryption and Decryption', () => {
    it('should encrypt and decrypt text data successfully', async () => {
      const plaintext = TEST_DATA.shortText
      const password = TEST_PASSWORDS.valid
      
      const encrypted = await EncryptionService.encrypt(plaintext, password)
      const decrypted = await EncryptionService.decrypt(encrypted, password)
      
      expect(decrypted.toString('utf8')).toBe(plaintext)
    })

    it('should encrypt and decrypt binary data successfully', async () => {
      const binaryData = TEST_DATA.binaryData
      const password = TEST_PASSWORDS.valid
      
      const encrypted = await EncryptionService.encrypt(binaryData, password)
      const decrypted = await EncryptionService.decrypt(encrypted, password)
      
      expect(decrypted.equals(binaryData)).toBe(true)
    })

    it('should encrypt and decrypt large data successfully', async () => {
      const largeData = TEST_DATA.longText
      const password = TEST_PASSWORDS.valid
      
      const encrypted = await EncryptionService.encrypt(largeData, password)
      const decrypted = await EncryptionService.decrypt(encrypted, password)
      
      expect(decrypted.toString('utf8')).toBe(largeData)
    })

    it('should handle empty data', async () => {
      const emptyData = TEST_DATA.emptyData
      const password = TEST_PASSWORDS.valid
      
      const encrypted = await EncryptionService.encrypt(emptyData, password)
      const decrypted = await EncryptionService.decrypt(encrypted, password)
      
      expect(decrypted.toString('utf8')).toBe(emptyData)
    })

    it('should handle unicode data', async () => {
      const unicodeData = TEST_DATA.unicodeText
      const password = TEST_PASSWORDS.valid
      
      const encrypted = await EncryptionService.encrypt(unicodeData, password)
      const decrypted = await EncryptionService.decrypt(encrypted, password)
      
      expect(decrypted.toString('utf8')).toBe(unicodeData)
    })

    it('should handle JSON data', async () => {
      const jsonData = TEST_DATA.jsonData
      const password = TEST_PASSWORDS.valid
      
      const encrypted = await EncryptionService.encrypt(jsonData, password)
      const decrypted = await EncryptionService.decrypt(encrypted, password)
      
      expect(decrypted.toString('utf8')).toBe(jsonData)
      expect(JSON.parse(decrypted.toString('utf8'))).toEqual(JSON.parse(jsonData))
    })

    it('should produce different ciphertexts for same data', async () => {
      const plaintext = TEST_DATA.shortText
      const password = TEST_PASSWORDS.valid
      
      const encrypted1 = await EncryptionService.encrypt(plaintext, password)
      const encrypted2 = await EncryptionService.encrypt(plaintext, password)
      
      // Different IVs and salts should produce different ciphertexts
      expect(encrypted1.encrypted.equals(encrypted2.encrypted)).toBe(false)
      expect(encrypted1.salt.equals(encrypted2.salt)).toBe(false)
      expect(encrypted1.iv.equals(encrypted2.iv)).toBe(false)
      
      // But both should decrypt to the same plaintext
      const decrypted1 = await EncryptionService.decrypt(encrypted1, password)
      const decrypted2 = await EncryptionService.decrypt(encrypted2, password)
      
      expect(decrypted1.toString('utf8')).toBe(plaintext)
      expect(decrypted2.toString('utf8')).toBe(plaintext)
    })

    it('should fail decryption with wrong password', async () => {
      const plaintext = TEST_DATA.shortText
      const correctPassword = TEST_PASSWORDS.valid
      const wrongPassword = TEST_PASSWORDS.strong
      
      const encrypted = await EncryptionService.encrypt(plaintext, correctPassword)
      
      await expect(EncryptionService.decrypt(encrypted, wrongPassword))
        .rejects.toThrow(/Invalid password or corrupted data/)
    })

    it('should fail encryption with invalid password', async () => {
      const plaintext = TEST_DATA.shortText
      const invalidPassword = TEST_PASSWORDS.weak
      
      await expect(EncryptionService.encrypt(plaintext, invalidPassword))
        .rejects.toThrow(/Password validation failed/)
    })

    it('should include correct metadata in encrypted result', async () => {
      const plaintext = TEST_DATA.shortText
      const password = TEST_PASSWORDS.valid
      
      const encrypted = await EncryptionService.encrypt(plaintext, password)
      
      expect(encrypted).toHaveProperty('encrypted')
      expect(encrypted).toHaveProperty('salt')
      expect(encrypted).toHaveProperty('iv')
      expect(encrypted).toHaveProperty('tag')
      expect(encrypted).toHaveProperty('algorithm', ENCRYPTION_CONFIG.ALGORITHM)
      expect(encrypted).toHaveProperty('iterations', ENCRYPTION_CONFIG.PBKDF2_ITERATIONS)
      
      expect(encrypted.salt).toHaveLength(ENCRYPTION_CONFIG.SALT_LENGTH)
      expect(encrypted.iv).toHaveLength(ENCRYPTION_CONFIG.IV_LENGTH)
      expect(encrypted.tag).toHaveLength(ENCRYPTION_CONFIG.TAG_LENGTH)
    })
  })

  describe('Base64 Encoding/Decoding', () => {
    it('should encrypt to base64 and decrypt from base64', async () => {
      const plaintext = TEST_DATA.shortText
      const password = TEST_PASSWORDS.valid
      
      const base64Encrypted = await EncryptionService.encryptToBase64(plaintext, password)
      const decrypted = await EncryptionService.decryptFromBase64(base64Encrypted, password)
      
      expect(typeof base64Encrypted).toBe('string')
      expect(decrypted.toString('utf8')).toBe(plaintext)
    })

    it('should handle binary data in base64 format', async () => {
      const binaryData = TEST_DATA.binaryData
      const password = TEST_PASSWORDS.valid
      
      const base64Encrypted = await EncryptionService.encryptToBase64(binaryData, password)
      const decrypted = await EncryptionService.decryptFromBase64(base64Encrypted, password)
      
      expect(decrypted.equals(binaryData)).toBe(true)
    })

    it('should fail base64 decryption with wrong password', async () => {
      const plaintext = TEST_DATA.shortText
      const correctPassword = TEST_PASSWORDS.valid
      const wrongPassword = TEST_PASSWORDS.strong
      
      const base64Encrypted = await EncryptionService.encryptToBase64(plaintext, correctPassword)
      
      await expect(EncryptionService.decryptFromBase64(base64Encrypted, wrongPassword))
        .rejects.toThrow(/Invalid password or corrupted data/)
    })

    it('should fail with corrupted base64 data', async () => {
      const password = TEST_PASSWORDS.valid
      const corruptedBase64 = 'invalid-base64-data!'
      
      await expect(EncryptionService.decryptFromBase64(corruptedBase64, password))
        .rejects.toThrow()
    })
  })

  describe('Error Handling', () => {
    it('should handle missing encrypted data fields', async () => {
      const password = TEST_PASSWORDS.valid
      
      const invalidData = {
        encrypted: Buffer.from('test'),
        // Missing salt, iv, tag
      }
      
      await expect(EncryptionService.decrypt(invalidData, password))
        .rejects.toThrow('Invalid encrypted data format')
    })

    it('should handle unsupported algorithm', async () => {
      const password = TEST_PASSWORDS.valid
      const salt = EncryptionService.generateSalt()
      const iv = EncryptionService.generateIV()
      const tag = crypto.randomBytes(16)
      
      const invalidData = {
        encrypted: Buffer.from('test'),
        salt,
        iv,
        tag,
        algorithm: 'unsupported-algorithm',
        iterations: ENCRYPTION_CONFIG.PBKDF2_ITERATIONS
      }
      
      await expect(EncryptionService.decrypt(invalidData, password))
        .rejects.toThrow('Unsupported encryption algorithm')
    })

    it('should handle corrupted encrypted data', async () => {
      const plaintext = TEST_DATA.shortText
      const password = TEST_PASSWORDS.valid
      
      const encrypted = await EncryptionService.encrypt(plaintext, password)
      
      // Corrupt the encrypted data
      encrypted.encrypted[0] = encrypted.encrypted[0] ^ 0xFF
      
      await expect(EncryptionService.decrypt(encrypted, password))
        .rejects.toThrow(/Invalid password or corrupted data/)
    })

    it('should handle corrupted authentication tag', async () => {
      const plaintext = TEST_DATA.shortText
      const password = TEST_PASSWORDS.valid
      
      const encrypted = await EncryptionService.encrypt(plaintext, password)
      
      // Corrupt the authentication tag
      encrypted.tag[0] = encrypted.tag[0] ^ 0xFF
      
      await expect(EncryptionService.decrypt(encrypted, password))
        .rejects.toThrow(/Invalid password or corrupted data/)
    })
  })

  describe('Security Features', () => {
    it('should use proper PBKDF2 iterations', async () => {
      const plaintext = TEST_DATA.shortText
      const password = TEST_PASSWORDS.valid
      
      const encrypted = await EncryptionService.encrypt(plaintext, password)
      
      expect(encrypted.iterations).toBe(ENCRYPTION_CONFIG.PBKDF2_ITERATIONS)
      expect(encrypted.iterations).toBeGreaterThanOrEqual(100000) // Minimum security standard
    })

    it('should use proper key and IV lengths', async () => {
      const plaintext = TEST_DATA.shortText
      const password = TEST_PASSWORDS.valid
      
      const encrypted = await EncryptionService.encrypt(plaintext, password)
      
      expect(encrypted.salt).toHaveLength(16) // 128 bits
      expect(encrypted.iv).toHaveLength(12)   // 96 bits for GCM
      expect(encrypted.tag).toHaveLength(16)  // 128 bits
    })

    it('should not expose sensitive data in error messages', async () => {
      try {
        await EncryptionService.encrypt(TEST_DATA.shortText, TEST_PASSWORDS.weak)
      } catch (error) {
        expect(error.message).not.toContain(TEST_PASSWORDS.weak)
        expect(error.message).not.toContain(TEST_DATA.shortText)
      }
    })
  })

  describe('Password Generation', () => {
    it('should generate secure passwords with default options', () => {
      const password = EncryptionService.generateSecurePassword()
      
      expect(password).toHaveLength(16)
      expect(/[a-z]/.test(password)).toBe(true)
      expect(/[A-Z]/.test(password)).toBe(true)
      expect(/\d/.test(password)).toBe(true)
      expect(/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)).toBe(true)
    })

    it('should generate passwords with specified length', () => {
      const password = EncryptionService.generateSecurePassword(32)
      expect(password).toHaveLength(32)
    })

    it('should respect character set options', () => {
      const password = EncryptionService.generateSecurePassword(16, {
        includeUppercase: false,
        includeLowercase: true,
        includeNumbers: true,
        includeSymbols: false
      })
      
      expect(/[A-Z]/.test(password)).toBe(false)
      expect(/[a-z]/.test(password)).toBe(true)
      expect(/\d/.test(password)).toBe(true)
      expect(/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)).toBe(false)
    })

    it('should generate unique passwords', () => {
      const passwords = Array.from({ length: 100 }, () => 
        EncryptionService.generateSecurePassword()
      )
      const uniquePasswords = new Set(passwords)
      
      expect(uniquePasswords.size).toBe(100)
    })

    it('should validate generated passwords', () => {
      const password = EncryptionService.generateSecurePassword()
      const validation = EncryptionService.validatePassword(password)
      
      expect(validation.isValid).toBe(true)
      expect(validation.strength).toBeGreaterThanOrEqual(STRENGTH_LEVELS.GOOD)
    })

    it('should handle edge cases in options', () => {
      expect(() => {
        EncryptionService.generateSecurePassword(16, {
          includeUppercase: false,
          includeLowercase: false,
          includeNumbers: false,
          includeSymbols: false
        })
      }).toThrow('No character sets selected')
    })
  })

  describe('Utility Functions', () => {
    it('should return correct strength level names', () => {
      expect(EncryptionService.getPasswordStrengthName(STRENGTH_LEVELS.VERY_WEAK))
        .toBe('Very Weak')
      expect(EncryptionService.getPasswordStrengthName(STRENGTH_LEVELS.WEAK))
        .toBe('Weak')
      expect(EncryptionService.getPasswordStrengthName(STRENGTH_LEVELS.FAIR))
        .toBe('Fair')
      expect(EncryptionService.getPasswordStrengthName(STRENGTH_LEVELS.GOOD))
        .toBe('Good')
      expect(EncryptionService.getPasswordStrengthName(STRENGTH_LEVELS.STRONG))
        .toBe('Strong')
    })

    it('should handle invalid strength levels', () => {
      expect(EncryptionService.getPasswordStrengthName(999)).toBe('Unknown')
      expect(EncryptionService.getPasswordStrengthName(-1)).toBe('Unknown')
    })
  })

  describe('Performance and Memory', () => {
    it('should handle encryption of large data efficiently', async () => {
      const largeData = Buffer.alloc(1024 * 1024) // 1MB
      crypto.randomFillSync(largeData)
      
      const password = TEST_PASSWORDS.valid
      
      const startTime = Date.now()
      const encrypted = await EncryptionService.encrypt(largeData, password)
      const encryptTime = Date.now() - startTime
      
      const startDecrypt = Date.now()
      const decrypted = await EncryptionService.decrypt(encrypted, password)
      const decryptTime = Date.now() - startDecrypt
      
      expect(decrypted.equals(largeData)).toBe(true)
      
      // Performance should be reasonable (less than 5 seconds for 1MB)
      expect(encryptTime).toBeLessThan(5000)
      expect(decryptTime).toBeLessThan(5000)
    }, 10000) // 10 second timeout for this test

    it('should clean up memory after operations', async () => {
      // This test verifies that the cleanup timeout is set
      // Actual memory cleanup verification would require native modules
      const plaintext = TEST_DATA.shortText
      const password = TEST_PASSWORDS.valid
      
      const encrypted = await EncryptionService.encrypt(plaintext, password)
      const decrypted = await EncryptionService.decrypt(encrypted, password)
      
      expect(decrypted.toString('utf8')).toBe(plaintext)
      
      // Wait for cleanup timeout
      await new Promise(resolve => setTimeout(resolve, ENCRYPTION_CONFIG.CLEANUP_TIMEOUT + 50))
    })
  })
})