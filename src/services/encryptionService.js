/**
<<<<<<< HEAD
 * Encryption Service
 * 
 * Provides data encryption and decryption functionality using Node.js built-in crypto module.
 * Supports various encryption algorithms and key management for secure file operations.
 */

const crypto = require('crypto');

/**
 * Encryption service class for handling data security operations
 */
class EncryptionService {
  constructor() {
    this.supportedAlgorithms = ['aes-256-gcm', 'aes-256-cbc', 'aes-192-gcm', 'aes-128-gcm'];
    this.defaultAlgorithm = 'aes-256-gcm';
    this.keyLength = 32; // 256 bits
    this.ivLength = 16;  // 128 bits
  }

  /**
   * Encrypt data using specified algorithm
   * @param {Buffer|string} data - Data to encrypt
   * @param {string} password - Password for encryption
   * @param {string} algorithm - Encryption algorithm
   * @returns {Promise<{encryptedData: Buffer, salt: Buffer, iv: Buffer, tag?: Buffer}>}
   */
  async encryptData(data, password, algorithm = this.defaultAlgorithm) {
    // TODO: Implement data encryption logic
    throw new Error('EncryptionService.encryptData() not implemented');
  }

  /**
   * Decrypt data using specified algorithm
   * @param {Buffer} encryptedData - Encrypted data to decrypt
   * @param {string} password - Password for decryption
   * @param {Buffer} salt - Salt used in key derivation
   * @param {Buffer} iv - Initialization vector
   * @param {Buffer} tag - Authentication tag (for GCM modes)
   * @param {string} algorithm - Encryption algorithm
   * @returns {Promise<Buffer>} Decrypted data
   */
  async decryptData(encryptedData, password, salt, iv, tag, algorithm = this.defaultAlgorithm) {
    // TODO: Implement data decryption logic
    throw new Error('EncryptionService.decryptData() not implemented');
  }

  /**
   * Encrypt file and save to specified output path
   * @param {string} inputPath - Path to input file
   * @param {string} outputPath - Path to encrypted output file
   * @param {string} password - Password for encryption
   * @param {string} algorithm - Encryption algorithm
   * @returns {Promise<{originalSize: number, encryptedSize: number, metadata: object}>}
   */
  async encryptFile(inputPath, outputPath, password, algorithm = this.defaultAlgorithm) {
    // TODO: Implement file encryption logic
    throw new Error('EncryptionService.encryptFile() not implemented');
  }

  /**
   * Decrypt file and save to specified output path
   * @param {string} inputPath - Path to encrypted file
   * @param {string} outputPath - Path to decrypted output file
   * @param {string} password - Password for decryption
   * @returns {Promise<{originalSize: number, decryptedSize: number}>}
   */
  async decryptFile(inputPath, outputPath, password) {
    // TODO: Implement file decryption logic
    throw new Error('EncryptionService.decryptFile() not implemented');
  }

  /**
   * Generate cryptographically secure salt
   * @param {number} length - Salt length in bytes
   * @returns {Buffer} Random salt
   */
  generateSalt(length = 32) {
    return crypto.randomBytes(length);
  }

  /**
   * Generate initialization vector
   * @param {number} length - IV length in bytes
   * @returns {Buffer} Random IV
   */
  generateIV(length = this.ivLength) {
    return crypto.randomBytes(length);
  }

  /**
   * Derive key from password using PBKDF2
   * @param {string} password - Password to derive key from
   * @param {Buffer} salt - Salt for key derivation
   * @param {number} iterations - Number of iterations
   * @param {number} keyLength - Desired key length
   * @returns {Promise<Buffer>} Derived key
   */
  async deriveKey(password, salt, iterations = 100000, keyLength = this.keyLength) {
    // TODO: Implement key derivation logic
    throw new Error('EncryptionService.deriveKey() not implemented');
  }

  /**
   * Generate secure random password
   * @param {number} length - Password length
   * @param {boolean} includeSpecial - Include special characters
   * @returns {string} Generated password
   */
  generateSecurePassword(length = 32, includeSpecial = true) {
    // TODO: Implement secure password generation
    throw new Error('EncryptionService.generateSecurePassword() not implemented');
=======
 * AES-256 Encryption Service
 * 
 * Provides secure encryption/decryption with password-based key derivation,
 * secure memory handling, and comprehensive password validation.
 * 
 * Security features:
 * - AES-256-GCM encryption with authentication
 * - PBKDF2 key derivation with secure salt generation
 * - Password strength validation with user feedback
 * - Secure memory cleanup after operations
 * - No password storage or logging
 */

import crypto from 'crypto'

/**
 * Encryption configuration constants
 */
const ENCRYPTION_CONFIG = {
  // Encryption algorithm
  ALGORITHM: 'aes-256-gcm',
  
  // Key derivation settings
  KEY_LENGTH: 32, // 256 bits
  SALT_LENGTH: 16, // 128 bits
  IV_LENGTH: 12,   // 96 bits for GCM
  TAG_LENGTH: 16,  // 128 bits
  
  // PBKDF2 iterations (recommended minimum for 2024)
  PBKDF2_ITERATIONS: 600000,
  
  // Password validation settings
  MIN_PASSWORD_LENGTH: 8,
  MAX_PASSWORD_LENGTH: 128,
  
  // Memory cleanup timeout (immediate + 100ms safety)
  CLEANUP_TIMEOUT: 100
}

/**
 * Password strength validation patterns
 */
const PASSWORD_PATTERNS = {
  lowercase: /[a-z]/,
  uppercase: /[A-Z]/,
  numbers: /\d/,
  symbols: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/,
  minLength: new RegExp(`^.{${ENCRYPTION_CONFIG.MIN_PASSWORD_LENGTH},}$`),
  maxLength: new RegExp(`^.{1,${ENCRYPTION_CONFIG.MAX_PASSWORD_LENGTH}}$`)
}

/**
 * Password strength levels
 */
const STRENGTH_LEVELS = {
  VERY_WEAK: 0,
  WEAK: 1,
  FAIR: 2,
  GOOD: 3,
  STRONG: 4
}

/**
 * Secure buffer utilities for memory cleanup
 */
class SecureBuffer {
  /**
   * Create a secure buffer that can be zeroed out
   * @param {number|Buffer} input - Size or existing buffer
   * @returns {Buffer} Secure buffer
   */
  static create(input) {
    if (typeof input === 'number') {
      return Buffer.alloc(input)
    }
    return Buffer.from(input)
  }

  /**
   * Securely zero out buffer memory
   * @param {Buffer} buffer - Buffer to clear
   */
  static clear(buffer) {
    if (Buffer.isBuffer(buffer)) {
      buffer.fill(0)
    }
  }

  /**
   * Clear multiple buffers
   * @param {...Buffer} buffers - Buffers to clear
   */
  static clearAll(...buffers) {
    buffers.forEach(buffer => this.clear(buffer))
  }
}

/**
 * Password strength validator
 */
class PasswordValidator {
  /**
   * Validate password and return detailed feedback
   * @param {string} password - Password to validate
   * @returns {Object} Validation result with strength and feedback
   */
  static validate(password) {
    const result = {
      isValid: false,
      strength: STRENGTH_LEVELS.VERY_WEAK,
      score: 0,
      feedback: [],
      requirements: {
        length: false,
        lowercase: false,
        uppercase: false,
        numbers: false,
        symbols: false
      }
    }

    if (!password || typeof password !== 'string') {
      result.feedback.push('Password is required')
      return result
    }

    // Check length constraints
    if (!PASSWORD_PATTERNS.maxLength.test(password)) {
      result.feedback.push(`Password must not exceed ${ENCRYPTION_CONFIG.MAX_PASSWORD_LENGTH} characters`)
      return result
    }

    // Check minimum length
    result.requirements.length = PASSWORD_PATTERNS.minLength.test(password)
    if (!result.requirements.length) {
      result.feedback.push(`Password must be at least ${ENCRYPTION_CONFIG.MIN_PASSWORD_LENGTH} characters long`)
    }

    // Check character requirements
    result.requirements.lowercase = PASSWORD_PATTERNS.lowercase.test(password)
    if (!result.requirements.lowercase) {
      result.feedback.push('Password must contain at least one lowercase letter')
    }

    result.requirements.uppercase = PASSWORD_PATTERNS.uppercase.test(password)
    if (!result.requirements.uppercase) {
      result.feedback.push('Password must contain at least one uppercase letter')
    }

    result.requirements.numbers = PASSWORD_PATTERNS.numbers.test(password)
    if (!result.requirements.numbers) {
      result.feedback.push('Password must contain at least one number')
    }

    result.requirements.symbols = PASSWORD_PATTERNS.symbols.test(password)
    if (!result.requirements.symbols) {
      result.feedback.push('Password should contain at least one special character (!@#$%^&*...)')
    }

    // Calculate strength score
    let score = 0
    Object.values(result.requirements).forEach(met => {
      if (met) score++
    })

    // Bonus points for length
    if (password.length >= 12) score += 0.5
    if (password.length >= 16) score += 0.5

    // Determine strength level
    result.score = score
    if (score < 3) {
      result.strength = STRENGTH_LEVELS.VERY_WEAK
    } else if (score < 4) {
      result.strength = STRENGTH_LEVELS.WEAK
    } else if (score < 5) {
      result.strength = STRENGTH_LEVELS.FAIR
    } else if (score < 6) {
      result.strength = STRENGTH_LEVELS.GOOD
    } else {
      result.strength = STRENGTH_LEVELS.STRONG
    }

    // Password is valid if it meets basic requirements
    result.isValid = result.requirements.length && 
                     result.requirements.lowercase && 
                     result.requirements.uppercase && 
                     result.requirements.numbers

    // Add positive feedback for strong passwords
    if (result.isValid) {
      if (result.strength >= STRENGTH_LEVELS.GOOD) {
        result.feedback.push('Good password strength')
      }
      if (result.strength === STRENGTH_LEVELS.STRONG) {
        result.feedback.push('Excellent password strength')
      }
    }

    return result
  }

  /**
   * Get strength level name
   * @param {number} level - Strength level number
   * @returns {string} Human readable strength level
   */
  static getStrengthName(level) {
    const names = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong']
    return names[level] || 'Unknown'
  }
}

/**
 * Main encryption service
 */
export class EncryptionService {
  /**
   * Generate cryptographically secure salt
   * @returns {Buffer} Random salt
   */
  static generateSalt() {
    return crypto.randomBytes(ENCRYPTION_CONFIG.SALT_LENGTH)
  }

  /**
   * Generate cryptographically secure IV
   * @returns {Buffer} Random IV
   */
  static generateIV() {
    return crypto.randomBytes(ENCRYPTION_CONFIG.IV_LENGTH)
  }

  /**
   * Derive encryption key from password using PBKDF2
   * @param {string} password - User password
   * @param {Buffer} salt - Salt for key derivation
   * @returns {Promise<Buffer>} Derived key
   */
  static async deriveKey(password, salt) {
    return new Promise((resolve, reject) => {
      crypto.pbkdf2(
        password,
        salt,
        ENCRYPTION_CONFIG.PBKDF2_ITERATIONS,
        ENCRYPTION_CONFIG.KEY_LENGTH,
        'sha256',
        (err, key) => {
          if (err) {
            reject(new Error(`Key derivation failed: ${err.message}`))
          } else {
            resolve(key)
          }
        }
      )
    })
  }

  /**
   * Encrypt data with AES-256-GCM
   * @param {Buffer|string} data - Data to encrypt
   * @param {string} password - Encryption password
   * @returns {Promise<Object>} Encrypted result with metadata
   */
  static async encrypt(data, password) {
    // Validate password
    const validation = PasswordValidator.validate(password)
    if (!validation.isValid) {
      throw new Error(`Password validation failed: ${validation.feedback.join(', ')}`)
    }

    let key = null
    let passwordBuffer = null
    
    try {
      // Convert input to buffer
      const inputBuffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8')
      
      // Generate salt and IV
      const salt = this.generateSalt()
      const iv = this.generateIV()
      
      // Create password buffer for secure handling
      passwordBuffer = SecureBuffer.create(Buffer.from(password, 'utf8'))
      
      // Derive key
      key = await this.deriveKey(password, salt)
      
      // Create cipher with explicit key and IV for GCM
      const cipher = crypto.createCipheriv(ENCRYPTION_CONFIG.ALGORITHM, key, iv)
      
      // Encrypt data
      const encrypted = Buffer.concat([
        cipher.update(inputBuffer),
        cipher.final()
      ])
      
      // Get authentication tag
      const tag = cipher.getAuthTag()
      
      // Return encrypted data with metadata
      return {
        encrypted,
        salt,
        iv,
        tag,
        algorithm: ENCRYPTION_CONFIG.ALGORITHM,
        iterations: ENCRYPTION_CONFIG.PBKDF2_ITERATIONS
      }
      
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`)
    } finally {
      // Secure memory cleanup
      setTimeout(() => {
        SecureBuffer.clearAll(key, passwordBuffer)
      }, ENCRYPTION_CONFIG.CLEANUP_TIMEOUT)
    }
  }

  /**
   * Decrypt data with AES-256-GCM
   * @param {Object} encryptedData - Encrypted data object
   * @param {string} password - Decryption password
   * @returns {Promise<Buffer>} Decrypted data
   */
  static async decrypt(encryptedData, password) {
    const { encrypted, salt, iv, tag, algorithm, iterations } = encryptedData
    
    // Validate required fields
    if (!encrypted || !salt || !iv || !tag) {
      throw new Error('Invalid encrypted data format')
    }
    
    // Verify algorithm compatibility
    if (algorithm !== ENCRYPTION_CONFIG.ALGORITHM) {
      throw new Error(`Unsupported encryption algorithm: ${algorithm}`)
    }
    
    let key = null
    let passwordBuffer = null
    
    try {
      // Create password buffer for secure handling
      passwordBuffer = SecureBuffer.create(Buffer.from(password, 'utf8'))
      
      // Derive key using stored salt
      key = await this.deriveKey(password, salt)
      
      // Create decipher with explicit key and IV for GCM
      const decipher = crypto.createDecipheriv(algorithm, key, iv)
      decipher.setAuthTag(tag)
      
      // Decrypt data
      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
      ])
      
      return decrypted
      
    } catch (error) {
      // Handle authentication failures specifically
      if (error.code === 'ERR_CRYPTO_AUTH_TAG_FAILED' || 
          error.message.includes('auth')) {
        throw new Error('Decryption failed: Invalid password or corrupted data')
      }
      throw new Error(`Decryption failed: ${error.message}`)
    } finally {
      // Secure memory cleanup
      setTimeout(() => {
        SecureBuffer.clearAll(key, passwordBuffer)
      }, ENCRYPTION_CONFIG.CLEANUP_TIMEOUT)
    }
  }

  /**
   * Encrypt data and return base64 encoded result
   * @param {Buffer|string} data - Data to encrypt
   * @param {string} password - Encryption password
   * @returns {Promise<string>} Base64 encoded encrypted data
   */
  static async encryptToBase64(data, password) {
    const result = await this.encrypt(data, password)
    
    // Combine all components into single buffer
    const combined = Buffer.concat([
      result.salt,
      result.iv,
      result.tag,
      result.encrypted
    ])
    
    return combined.toString('base64')
  }

  /**
   * Decrypt base64 encoded data
   * @param {string} base64Data - Base64 encoded encrypted data
   * @param {string} password - Decryption password
   * @returns {Promise<Buffer>} Decrypted data
   */
  static async decryptFromBase64(base64Data, password) {
    const combined = Buffer.from(base64Data, 'base64')
    
    // Extract components
    const salt = combined.subarray(0, ENCRYPTION_CONFIG.SALT_LENGTH)
    const iv = combined.subarray(
      ENCRYPTION_CONFIG.SALT_LENGTH,
      ENCRYPTION_CONFIG.SALT_LENGTH + ENCRYPTION_CONFIG.IV_LENGTH
    )
    const tag = combined.subarray(
      ENCRYPTION_CONFIG.SALT_LENGTH + ENCRYPTION_CONFIG.IV_LENGTH,
      ENCRYPTION_CONFIG.SALT_LENGTH + ENCRYPTION_CONFIG.IV_LENGTH + ENCRYPTION_CONFIG.TAG_LENGTH
    )
    const encrypted = combined.subarray(
      ENCRYPTION_CONFIG.SALT_LENGTH + ENCRYPTION_CONFIG.IV_LENGTH + ENCRYPTION_CONFIG.TAG_LENGTH
    )
    
    const encryptedData = {
      encrypted,
      salt,
      iv,
      tag,
      algorithm: ENCRYPTION_CONFIG.ALGORITHM,
      iterations: ENCRYPTION_CONFIG.PBKDF2_ITERATIONS
    }
    
    return this.decrypt(encryptedData, password)
>>>>>>> 0616ec829ca44d386e16bcb71dd32a6f9695c140
  }

  /**
   * Validate password strength
   * @param {string} password - Password to validate
<<<<<<< HEAD
   * @returns {{score: number, feedback: string[], isStrong: boolean}}
   */
  validatePasswordStrength(password) {
    // TODO: Implement password strength validation
    throw new Error('EncryptionService.validatePasswordStrength() not implemented');
  }

  /**
   * List supported encryption algorithms
   * @returns {string[]} Array of supported algorithm names
   */
  getSupportedAlgorithms() {
    return [...this.supportedAlgorithms];
  }

  /**
   * Validate encryption algorithm
   * @param {string} algorithm - Algorithm to validate
   * @returns {boolean} True if algorithm is supported
   */
  isAlgorithmSupported(algorithm) {
    return this.supportedAlgorithms.includes(algorithm.toLowerCase());
  }

  /**
   * Get algorithm requirements (key length, IV length, etc.)
   * @param {string} algorithm - Algorithm to get requirements for
   * @returns {{keyLength: number, ivLength: number, hasAuthTag: boolean}}
   */
  getAlgorithmRequirements(algorithm) {
    // TODO: Implement algorithm requirements lookup
    throw new Error('EncryptionService.getAlgorithmRequirements() not implemented');
  }
}

// Export service instance
module.exports = new EncryptionService();
=======
   * @returns {Object} Validation result
   */
  static validatePassword(password) {
    return PasswordValidator.validate(password)
  }

  /**
   * Get password strength level name
   * @param {number} level - Strength level
   * @returns {string} Human readable name
   */
  static getPasswordStrengthName(level) {
    return PasswordValidator.getStrengthName(level)
  }

  /**
   * Generate secure random password
   * @param {number} length - Password length (default: 16)
   * @param {Object} options - Generation options
   * @returns {string} Generated password
   */
  static generateSecurePassword(length = 16, options = {}) {
    const {
      includeUppercase = true,
      includeLowercase = true,
      includeNumbers = true,
      includeSymbols = true,
      excludeSimilar = true
    } = options

    let chars = ''
    if (includeLowercase) chars += 'abcdefghijklmnopqrstuvwxyz'
    if (includeUppercase) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    if (includeNumbers) chars += '0123456789'
    if (includeSymbols) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?'

    if (excludeSimilar) {
      chars = chars.replace(/[0O1lI]/g, '')
    }

    if (!chars) {
      throw new Error('No character sets selected for password generation')
    }

    let password = ''
    const randomBytes = crypto.randomBytes(length * 2) // Extra bytes for rejection sampling

    let byteIndex = 0
    while (password.length < length && byteIndex < randomBytes.length) {
      const randomValue = randomBytes[byteIndex++]
      if (randomValue < Math.floor(256 / chars.length) * chars.length) {
        password += chars[randomValue % chars.length]
      }
    }

    if (password.length < length) {
      throw new Error('Failed to generate secure password')
    }

    return password.substring(0, length)
  }
}

// Export password strength levels for external use
export { STRENGTH_LEVELS, ENCRYPTION_CONFIG }

// Default export
export default EncryptionService
>>>>>>> 0616ec829ca44d386e16bcb71dd32a6f9695c140
