/**
 * Operation Cancellation Service Tests
 * 
 * Comprehensive test suite for operation cancellation functionality
 * including cancellation tokens, cleanup, and error handling.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { 
  OperationCancellationService, 
  CancellationToken,
  CancellationError
} from '../services/operationCancellationService.js'

describe('OperationCancellationService', () => {
  let cancellationService
  
  beforeEach(() => {
    cancellationService = new OperationCancellationService()
  })
  
  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('CancellationToken', () => {
    it('should create cancellation token with unique ID', () => {
      const token1 = cancellationService.createToken()
      const token2 = cancellationService.createToken()
      
      expect(token1).toBeInstanceOf(CancellationToken)
      expect(token2).toBeInstanceOf(CancellationToken)
      expect(token1.id).not.toBe(token2.id)
      expect(typeof token1.id).toBe('string')
    })
    
    it('should initialize token as not cancelled', () => {
      const token = cancellationService.createToken()
      
      expect(token.isCancelled).toBe(false)
      expect(token.reason).toBeNull()
      expect(token.timestamp).toBeNull()
    })
    
    it('should support custom operation name', () => {
      const token = cancellationService.createToken('compression-operation')
      
      expect(token.operationName).toBe('compression-operation')
    })
    
    it('should track creation timestamp', () => {
      const beforeCreation = Date.now()
      const token = cancellationService.createToken()
      const afterCreation = Date.now()
      
      expect(token.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreation)
      expect(token.createdAt.getTime()).toBeLessThanOrEqual(afterCreation)
    })
  })

  describe('Token Cancellation', () => {
    it('should cancel token with reason', () => {
      const token = cancellationService.createToken()
      const reason = 'User requested cancellation'
      
      const cancelled = cancellationService.cancel(token.id, reason)
      
      expect(cancelled).toBe(true)
      expect(token.isCancelled).toBe(true)
      expect(token.reason).toBe(reason)
      expect(token.timestamp).toBeInstanceOf(Date)
    })
    
    it('should return false when cancelling non-existent token', () => {
      const result = cancellationService.cancel('non-existent-id', 'reason')
      
      expect(result).toBe(false)
    })
    
    it('should handle multiple cancellation attempts gracefully', () => {
      const token = cancellationService.createToken()
      
      const result1 = cancellationService.cancel(token.id, 'First attempt')
      const result2 = cancellationService.cancel(token.id, 'Second attempt')
      
      expect(result1).toBe(true)
      expect(result2).toBe(true)
      expect(token.reason).toBe('First attempt') // Should keep original reason
    })
  })

  describe('Cancellation Callbacks', () => {
    it('should execute cancellation callbacks', () => {
      const mockCallback1 = vi.fn()
      const mockCallback2 = vi.fn()
      
      const token = cancellationService.createToken()
      token.onCancel(mockCallback1)
      token.onCancel(mockCallback2)
      
      cancellationService.cancel(token.id, 'Test cancellation')
      
      expect(mockCallback1).toHaveBeenCalledWith('Test cancellation')
      expect(mockCallback2).toHaveBeenCalledWith('Test cancellation')
    })
    
    it('should handle callback errors gracefully', () => {
      const errorCallback = vi.fn().mockImplementation(() => {
        throw new Error('Callback error')
      })
      const successCallback = vi.fn()
      
      const token = cancellationService.createToken()
      token.onCancel(errorCallback)
      token.onCancel(successCallback)
      
      expect(() => {
        cancellationService.cancel(token.id, 'Test cancellation')
      }).not.toThrow()
      
      expect(errorCallback).toHaveBeenCalled()
      expect(successCallback).toHaveBeenCalled()
    })
    
    it('should not execute callbacks for already cancelled tokens', () => {
      const mockCallback = vi.fn()
      
      const token = cancellationService.createToken()
      cancellationService.cancel(token.id, 'Initial cancellation')
      
      token.onCancel(mockCallback)
      
      expect(mockCallback).not.toHaveBeenCalled()
    })
  })

  describe('Cancellation Checking', () => {
    it('should throw CancellationError when checking cancelled token', () => {
      const token = cancellationService.createToken()
      cancellationService.cancel(token.id, 'Operation cancelled')
      
      expect(() => {
        token.throwIfCancelled()
      }).toThrow(CancellationError)
      
      try {
        token.throwIfCancelled()
      } catch (error) {
        expect(error.message).toBe('Operation cancelled')
        expect(error.tokenId).toBe(token.id)
      }
    })
    
    it('should not throw for active tokens', () => {
      const token = cancellationService.createToken()
      
      expect(() => {
        token.throwIfCancelled()
      }).not.toThrow()
    })
    
    it('should support async cancellation checking', async () => {
      const token = cancellationService.createToken()
      
      const asyncOperation = async () => {
        for (let i = 0; i < 5; i++) {
          token.throwIfCancelled()
          await new Promise(resolve => setTimeout(resolve, 10))
        }
        return 'completed'
      }
      
      const result = await asyncOperation()
      expect(result).toBe('completed')
    })
    
    it('should cancel async operations mid-execution', async () => {
      const token = cancellationService.createToken()
      
      const asyncOperation = async () => {
        for (let i = 0; i < 100; i++) {
          token.throwIfCancelled()
          await new Promise(resolve => setTimeout(resolve, 1))
        }
        return 'completed'
      }
      
      // Cancel after a short delay
      setTimeout(() => {
        cancellationService.cancel(token.id, 'Cancelled during execution')
      }, 5)
      
      await expect(asyncOperation()).rejects.toThrow(CancellationError)
    })
  })

  describe('Token Management', () => {
    it('should track active tokens', () => {
      const token1 = cancellationService.createToken('operation-1')
      const token2 = cancellationService.createToken('operation-2')
      
      const activeTokens = cancellationService.getActiveTokens()
      
      expect(activeTokens).toHaveLength(2)
      expect(activeTokens).toContain(token1)
      expect(activeTokens).toContain(token2)
    })
    
    it('should remove cancelled tokens from active list', () => {
      const token1 = cancellationService.createToken('operation-1')
      const token2 = cancellationService.createToken('operation-2')
      
      cancellationService.cancel(token1.id, 'Cancelled')
      
      const activeTokens = cancellationService.getActiveTokens()
      
      expect(activeTokens).toHaveLength(1)
      expect(activeTokens).toContain(token2)
      expect(activeTokens).not.toContain(token1)
    })
    
    it('should get token by ID', () => {
      const token = cancellationService.createToken('test-operation')
      
      const retrievedToken = cancellationService.getToken(token.id)
      
      expect(retrievedToken).toBe(token)
    })
    
    it('should return null for non-existent token ID', () => {
      const token = cancellationService.getToken('non-existent-id')
      
      expect(token).toBeNull()
    })
    
    it('should cancel all active tokens', () => {
      const token1 = cancellationService.createToken('operation-1')
      const token2 = cancellationService.createToken('operation-2')
      const token3 = cancellationService.createToken('operation-3')
      
      const cancelledCount = cancellationService.cancelAll('System shutdown')
      
      expect(cancelledCount).toBe(3)
      expect(token1.isCancelled).toBe(true)
      expect(token2.isCancelled).toBe(true)
      expect(token3.isCancelled).toBe(true)
      expect(cancellationService.getActiveTokens()).toHaveLength(0)
    })
  })

  describe('Timeout Handling', () => {
    it('should support token timeout', async () => {
      const token = cancellationService.createTokenWithTimeout('timeout-test', 100)
      
      // Wait longer than timeout
      await new Promise(resolve => setTimeout(resolve, 150))
      
      expect(token.isCancelled).toBe(true)
      expect(token.reason).toContain('timeout')
    })
    
    it('should clear timeout when token is manually cancelled', async () => {
      const token = cancellationService.createTokenWithTimeout('manual-cancel', 1000)
      
      cancellationService.cancel(token.id, 'Manual cancellation')
      
      expect(token.isCancelled).toBe(true)
      expect(token.reason).toBe('Manual cancellation')
      
      // Wait to ensure timeout doesn't override
      await new Promise(resolve => setTimeout(resolve, 50))
      
      expect(token.reason).toBe('Manual cancellation')
    })
    
    it('should handle timeout cleanup properly', () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')
      
      const token = cancellationService.createTokenWithTimeout('cleanup-test', 1000)
      cancellationService.cancel(token.id, 'Manual cancellation')
      
      expect(clearTimeoutSpy).toHaveBeenCalled()
    })
  })

  describe('Hierarchical Cancellation', () => {
    it('should support parent-child token relationships', () => {
      const parentToken = cancellationService.createToken('parent')
      const childToken = cancellationService.createChildToken(parentToken.id, 'child')
      
      expect(childToken.parentId).toBe(parentToken.id)
    })
    
    it('should cancel child tokens when parent is cancelled', () => {
      const parentToken = cancellationService.createToken('parent')
      const childToken1 = cancellationService.createChildToken(parentToken.id, 'child-1')
      const childToken2 = cancellationService.createChildToken(parentToken.id, 'child-2')
      
      cancellationService.cancel(parentToken.id, 'Parent cancelled')
      
      expect(parentToken.isCancelled).toBe(true)
      expect(childToken1.isCancelled).toBe(true)
      expect(childToken2.isCancelled).toBe(true)
      expect(childToken1.reason).toContain('Parent cancelled')
      expect(childToken2.reason).toContain('Parent cancelled')
    })
    
    it('should not cancel parent when child is cancelled', () => {
      const parentToken = cancellationService.createToken('parent')
      const childToken = cancellationService.createChildToken(parentToken.id, 'child')
      
      cancellationService.cancel(childToken.id, 'Child cancelled')
      
      expect(childToken.isCancelled).toBe(true)
      expect(parentToken.isCancelled).toBe(false)
    })
  })

  describe('Resource Cleanup', () => {
    it('should register cleanup callbacks', () => {
      const cleanupCallback = vi.fn()
      const token = cancellationService.createToken('cleanup-test')
      
      token.onCleanup(cleanupCallback)
      
      cancellationService.cancel(token.id, 'Cleanup test')
      
      expect(cleanupCallback).toHaveBeenCalled()
    })
    
    it('should execute cleanup in reverse registration order', () => {
      const callOrder = []
      const cleanup1 = vi.fn(() => callOrder.push('cleanup1'))
      const cleanup2 = vi.fn(() => callOrder.push('cleanup2'))
      const cleanup3 = vi.fn(() => callOrder.push('cleanup3'))
      
      const token = cancellationService.createToken('order-test')
      
      token.onCleanup(cleanup1)
      token.onCleanup(cleanup2)
      token.onCleanup(cleanup3)
      
      cancellationService.cancel(token.id, 'Order test')
      
      expect(callOrder).toEqual(['cleanup3', 'cleanup2', 'cleanup1'])
    })
    
    it('should handle cleanup errors gracefully', () => {
      const errorCleanup = vi.fn().mockImplementation(() => {
        throw new Error('Cleanup error')
      })
      const successCleanup = vi.fn()
      
      const token = cancellationService.createToken('error-test')
      
      token.onCleanup(errorCleanup)
      token.onCleanup(successCleanup)
      
      expect(() => {
        cancellationService.cancel(token.id, 'Error test')
      }).not.toThrow()
      
      expect(errorCleanup).toHaveBeenCalled()
      expect(successCleanup).toHaveBeenCalled()
    })
  })

  describe('Integration with Async Operations', () => {
    it('should support Promise-based cancellation', async () => {
      const token = cancellationService.createToken('promise-test')
      
      const cancellablePromise = new Promise((resolve, reject) => {
        token.onCancel((reason) => {
          reject(new CancellationError(reason, token.id))
        })
        
        setTimeout(resolve, 100)
      })
      
      setTimeout(() => {
        cancellationService.cancel(token.id, 'Promise cancelled')
      }, 50)
      
      await expect(cancellablePromise).rejects.toThrow(CancellationError)
    })
    
    it('should work with async generators', async () => {
      const token = cancellationService.createToken('generator-test')
      
      async function* cancellableGenerator() {
        for (let i = 0; i < 10; i++) {
          token.throwIfCancelled()
          yield i
          await new Promise(resolve => setTimeout(resolve, 10))
        }
      }
      
      const generator = cancellableGenerator()
      const results = []
      
      setTimeout(() => {
        cancellationService.cancel(token.id, 'Generator cancelled')
      }, 25)
      
      try {
        for await (const value of generator) {
          results.push(value)
        }
      } catch (error) {
        expect(error).toBeInstanceOf(CancellationError)
      }
      
      expect(results.length).toBeLessThan(10)
    })
  })

  describe('Statistics and Monitoring', () => {
    it('should track cancellation statistics', () => {
      const token1 = cancellationService.createToken('op1')
      const token2 = cancellationService.createToken('op2')
      const token3 = cancellationService.createToken('op3')
      
      cancellationService.cancel(token1.id, 'User request')
      cancellationService.cancel(token2.id, 'Timeout')
      
      const stats = cancellationService.getStatistics()
      
      expect(stats.totalTokens).toBe(3)
      expect(stats.activeTokens).toBe(1)
      expect(stats.cancelledTokens).toBe(2)
      expect(stats.cancellationReasons).toEqual({
        'User request': 1,
        'Timeout': 1
      })
    })
    
    it('should provide operation duration statistics', () => {
      const token = cancellationService.createToken('duration-test')
      
      // Simulate some operation time
      setTimeout(() => {
        cancellationService.cancel(token.id, 'Test completion')
      }, 10)
      
      setTimeout(() => {
        const stats = cancellationService.getStatistics()
        expect(stats.averageOperationDuration).toBeGreaterThan(0)
      }, 20)
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid token IDs gracefully', () => {
      expect(() => {
        cancellationService.cancel(null, 'reason')
      }).not.toThrow()
      
      expect(() => {
        cancellationService.cancel(undefined, 'reason')
      }).not.toThrow()
      
      expect(() => {
        cancellationService.cancel('', 'reason')
      }).not.toThrow()
    })
    
    it('should handle invalid reasons gracefully', () => {
      const token = cancellationService.createToken('error-test')
      
      expect(() => {
        cancellationService.cancel(token.id, null)
      }).not.toThrow()
      
      expect(() => {
        cancellationService.cancel(token.id, undefined)
      }).not.toThrow()
      
      expect(token.reason).toBe('No reason provided')
    })
  })

  describe('Performance Considerations', () => {
    it('should handle large numbers of tokens efficiently', () => {
      const startTime = Date.now()
      const tokens = []
      
      // Create 1000 tokens
      for (let i = 0; i < 1000; i++) {
        tokens.push(cancellationService.createToken(`operation-${i}`))
      }
      
      const creationTime = Date.now() - startTime
      expect(creationTime).toBeLessThan(100) // Should create 1000 tokens in less than 100ms
      
      // Cancel all tokens
      const cancelStartTime = Date.now()
      cancellationService.cancelAll('Performance test')
      const cancelTime = Date.now() - cancelStartTime
      
      expect(cancelTime).toBeLessThan(50) // Should cancel all tokens quickly
    })
    
    it('should clean up completed tokens to prevent memory leaks', () => {
      const initialMemory = cancellationService.getStatistics().totalTokens
      
      // Create and cancel many tokens
      for (let i = 0; i < 100; i++) {
        const token = cancellationService.createToken(`temp-${i}`)
        cancellationService.cancel(token.id, 'Cleanup test')
      }
      
      // Trigger cleanup
      cancellationService.cleanupCompletedTokens()
      
      const finalMemory = cancellationService.getStatistics().totalTokens
      expect(finalMemory).toBeLessThanOrEqual(initialMemory)
    })
  })
})