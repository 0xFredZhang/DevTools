/**
 * Progress Tracking Service Tests
 * 
 * Comprehensive test suite for progress tracking functionality
 * including progress calculation, callbacks, and performance monitoring.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { 
  ProgressTrackingService, 
  ProgressTracker,
  ProgressUtils
} from '../services/progressTrackingService.js'

describe('ProgressTrackingService', () => {
  let progressService
  
  beforeEach(() => {
    progressService = new ProgressTrackingService()
  })
  
  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('ProgressTracker Creation', () => {
    it('should create progress tracker with unique ID', () => {
      const tracker1 = progressService.createTracker('operation-1', 100)
      const tracker2 = progressService.createTracker('operation-2', 200)
      
      expect(tracker1).toBeInstanceOf(ProgressTracker)
      expect(tracker2).toBeInstanceOf(ProgressTracker)
      expect(tracker1.id).not.toBe(tracker2.id)
      expect(typeof tracker1.id).toBe('string')
    })
    
    it('should initialize tracker with correct properties', () => {
      const tracker = progressService.createTracker('test-operation', 1000)
      
      expect(tracker.operationName).toBe('test-operation')
      expect(tracker.total).toBe(1000)
      expect(tracker.current).toBe(0)
      expect(tracker.percentage).toBe(0)
      expect(tracker.isCompleted).toBe(false)
      expect(tracker.startTime).toBeInstanceOf(Date)
    })
    
    it('should support custom configuration', () => {
      const config = {
        updateInterval: 500,
        enableETACalculation: false,
        enableRateCalculation: true
      }
      
      const tracker = progressService.createTracker('custom-op', 100, config)
      
      expect(tracker.config.updateInterval).toBe(500)
      expect(tracker.config.enableETACalculation).toBe(false)
      expect(tracker.config.enableRateCalculation).toBe(true)
    })
  })

  describe('Progress Updates', () => {
    it('should update progress correctly', () => {
      const tracker = progressService.createTracker('test', 100)
      
      tracker.update(25)
      
      expect(tracker.current).toBe(25)
      expect(tracker.percentage).toBe(25)
      expect(tracker.isCompleted).toBe(false)
    })
    
    it('should handle completion correctly', () => {
      const tracker = progressService.createTracker('test', 100)
      
      tracker.update(100)
      
      expect(tracker.current).toBe(100)
      expect(tracker.percentage).toBe(100)
      expect(tracker.isCompleted).toBe(true)
      expect(tracker.endTime).toBeInstanceOf(Date)
    })
    
    it('should handle over-completion gracefully', () => {
      const tracker = progressService.createTracker('test', 100)
      
      tracker.update(150)
      
      expect(tracker.current).toBe(150)
      expect(tracker.percentage).toBe(100) // Capped at 100%
      expect(tracker.isCompleted).toBe(true)
    })
    
    it('should increment progress', () => {
      const tracker = progressService.createTracker('test', 100)
      
      tracker.increment(10)
      tracker.increment(15)
      
      expect(tracker.current).toBe(25)
      expect(tracker.percentage).toBe(25)
    })
    
    it('should handle negative increments', () => {
      const tracker = progressService.createTracker('test', 100)
      tracker.update(50)
      
      tracker.increment(-10)
      
      expect(tracker.current).toBe(40)
      expect(tracker.percentage).toBe(40)
    })
  })

  describe('Progress Callbacks', () => {
    it('should execute progress callbacks on updates', () => {
      const mockCallback = vi.fn()
      const tracker = progressService.createTracker('test', 100)
      
      tracker.onProgress(mockCallback)
      tracker.update(50)
      
      expect(mockCallback).toHaveBeenCalledWith({
        id: tracker.id,
        operationName: 'test',
        current: 50,
        total: 100,
        percentage: 50,
        isCompleted: false,
        estimatedTimeRemaining: expect.any(Number),
        elapsedTime: expect.any(Number),
        rate: expect.any(Number)
      })
    })
    
    it('should execute completion callbacks', () => {
      const mockProgressCallback = vi.fn()
      const mockCompletionCallback = vi.fn()
      
      const tracker = progressService.createTracker('test', 100)
      tracker.onProgress(mockProgressCallback)
      tracker.onComplete(mockCompletionCallback)
      
      tracker.update(100)
      
      expect(mockCompletionCallback).toHaveBeenCalledWith({
        id: tracker.id,
        operationName: 'test',
        totalTime: expect.any(Number),
        averageRate: expect.any(Number),
        success: true
      })
    })
    
    it('should handle multiple callbacks', () => {
      const callback1 = vi.fn()
      const callback2 = vi.fn()
      const callback3 = vi.fn()
      
      const tracker = progressService.createTracker('test', 100)
      tracker.onProgress(callback1)
      tracker.onProgress(callback2)
      tracker.onComplete(callback3)
      
      tracker.update(50)
      
      expect(callback1).toHaveBeenCalled()
      expect(callback2).toHaveBeenCalled()
      expect(callback3).not.toHaveBeenCalled()
      
      tracker.update(100)
      
      expect(callback3).toHaveBeenCalled()
    })
    
    it('should handle callback errors gracefully', () => {
      const errorCallback = vi.fn().mockImplementation(() => {
        throw new Error('Callback error')
      })
      const successCallback = vi.fn()
      
      const tracker = progressService.createTracker('test', 100)
      tracker.onProgress(errorCallback)
      tracker.onProgress(successCallback)
      
      expect(() => {
        tracker.update(50)
      }).not.toThrow()
      
      expect(errorCallback).toHaveBeenCalled()
      expect(successCallback).toHaveBeenCalled()
    })
  })

  describe('Time and Rate Calculations', () => {
    it('should calculate elapsed time', () => {
      const tracker = progressService.createTracker('test', 100)
      
      // Simulate some time passing
      vi.advanceTimersByTime(1000)
      
      tracker.update(50)
      
      expect(tracker.getElapsedTime()).toBeGreaterThanOrEqual(1000)
    })
    
    it('should calculate processing rate', () => {
      const tracker = progressService.createTracker('test', 100)
      
      // Simulate processing over time
      vi.advanceTimersByTime(1000)
      tracker.update(25)
      
      const rate = tracker.getRate()
      expect(rate).toBeCloseTo(25, 1) // 25 units per second
    })
    
    it('should estimate time remaining', () => {
      const tracker = progressService.createTracker('test', 100)
      
      vi.advanceTimersByTime(1000)
      tracker.update(25) // 25% complete in 1 second
      
      const eta = tracker.getEstimatedTimeRemaining()
      expect(eta).toBeCloseTo(3000, 500) // Should estimate ~3 more seconds
    })
    
    it('should handle zero rate gracefully', () => {
      const tracker = progressService.createTracker('test', 100)
      
      const eta = tracker.getEstimatedTimeRemaining()
      expect(eta).toBe(Infinity)
    })
    
    it('should calculate completion time', () => {
      const tracker = progressService.createTracker('test', 100)
      
      vi.advanceTimersByTime(2000)
      tracker.update(100)
      
      expect(tracker.getTotalTime()).toBeCloseTo(2000, 100)
    })
  })

  describe('Progress Statistics', () => {
    it('should calculate average rate over time', () => {
      const tracker = progressService.createTracker('test', 100)
      
      vi.advanceTimersByTime(500)
      tracker.update(20)
      
      vi.advanceTimersByTime(500)
      tracker.update(50)
      
      vi.advanceTimersByTime(500)
      tracker.update(80)
      
      const avgRate = tracker.getAverageRate()
      expect(avgRate).toBeCloseTo(53.33, 1) // 80 units in 1.5 seconds
    })
    
    it('should track peak processing rate', () => {
      const tracker = progressService.createTracker('test', 100)
      
      vi.advanceTimersByTime(100)
      tracker.update(5) // 50 units/second
      
      vi.advanceTimersByTime(100)
      tracker.update(20) // 150 units/second (peak)
      
      vi.advanceTimersByTime(100)
      tracker.update(25) // 50 units/second
      
      const peakRate = tracker.getPeakRate()
      expect(peakRate).toBeGreaterThan(100)
    })
    
    it('should provide comprehensive statistics', () => {
      const tracker = progressService.createTracker('test', 1000)
      
      vi.advanceTimersByTime(1000)
      tracker.update(300)
      
      vi.advanceTimersByTime(1000)
      tracker.update(700)
      
      vi.advanceTimersByTime(1000)
      tracker.update(1000)
      
      const stats = tracker.getStatistics()
      
      expect(stats).toMatchObject({
        totalTime: expect.any(Number),
        averageRate: expect.any(Number),
        peakRate: expect.any(Number),
        completionPercentage: 100,
        updatesCount: expect.any(Number)
      })
    })
  })

  describe('Batch Progress Tracking', () => {
    it('should track multiple operations simultaneously', () => {
      const tracker1 = progressService.createTracker('operation-1', 100)
      const tracker2 = progressService.createTracker('operation-2', 200)
      const tracker3 = progressService.createTracker('operation-3', 50)
      
      tracker1.update(50)
      tracker2.update(100)
      tracker3.update(25)
      
      const activeTrackers = progressService.getActiveTrackers()
      
      expect(activeTrackers).toHaveLength(3)
      expect(activeTrackers[0].percentage).toBe(50)
      expect(activeTrackers[1].percentage).toBe(50)
      expect(activeTrackers[2].percentage).toBe(50)
    })
    
    it('should calculate overall progress for batch operations', () => {
      const tracker1 = progressService.createTracker('op1', 100)
      const tracker2 = progressService.createTracker('op2', 100)
      
      tracker1.update(30)
      tracker2.update(70)
      
      const overallProgress = progressService.getOverallProgress()
      
      expect(overallProgress.percentage).toBe(50) // (30 + 70) / (100 + 100) * 100
      expect(overallProgress.completedOperations).toBe(0)
      expect(overallProgress.totalOperations).toBe(2)
    })
    
    it('should handle completion of batch operations', () => {
      const tracker1 = progressService.createTracker('op1', 100)
      const tracker2 = progressService.createTracker('op2', 100)
      const tracker3 = progressService.createTracker('op3', 100)
      
      tracker1.update(100)
      tracker2.update(50)
      tracker3.update(100)
      
      const overallProgress = progressService.getOverallProgress()
      
      expect(overallProgress.completedOperations).toBe(2)
      expect(overallProgress.activeOperations).toBe(1)
      expect(overallProgress.percentage).toBe(83.33) // (100 + 50 + 100) / 300
    })
  })

  describe('Progress Smoothing and Throttling', () => {
    it('should throttle progress updates to prevent flooding', () => {
      const mockCallback = vi.fn()
      const tracker = progressService.createTracker('test', 1000, {
        updateInterval: 100
      })
      
      tracker.onProgress(mockCallback)
      
      // Rapid updates should be throttled
      tracker.update(10)
      tracker.update(20)
      tracker.update(30)
      tracker.update(40)
      tracker.update(50)
      
      // Should only call callback once initially
      expect(mockCallback).toHaveBeenCalledTimes(1)
      
      vi.advanceTimersByTime(100)
      
      // Should now call with latest value
      expect(mockCallback).toHaveBeenCalledTimes(2)
      expect(mockCallback).toHaveBeenLastCalledWith(
        expect.objectContaining({ current: 50 })
      )
    })
    
    it('should smooth progress updates to prevent jitter', () => {
      const tracker = progressService.createTracker('test', 100, {
        enableSmoothing: true,
        smoothingFactor: 0.5
      })
      
      tracker.update(10)
      tracker.update(50) // Large jump
      
      // Smoothed value should be between 10 and 50
      expect(tracker.smoothedProgress).toBeGreaterThan(10)
      expect(tracker.smoothedProgress).toBeLessThan(50)
    })
  })

  describe('ProgressUtils Utility Functions', () => {
    it('should format time durations', () => {
      expect(ProgressUtils.formatDuration(1000)).toBe('1s')
      expect(ProgressUtils.formatDuration(65000)).toBe('1m 5s')
      expect(ProgressUtils.formatDuration(3665000)).toBe('1h 1m 5s')
    })
    
    it('should format file sizes', () => {
      expect(ProgressUtils.formatBytes(1024)).toBe('1.00 KB')
      expect(ProgressUtils.formatBytes(1024 * 1024)).toBe('1.00 MB')
      expect(ProgressUtils.formatBytes(1024 * 1024 * 1024)).toBe('1.00 GB')
    })
    
    it('should format rates with units', () => {
      expect(ProgressUtils.formatRate(1024)).toBe('1.00 KB/s')
      expect(ProgressUtils.formatRate(1024 * 1024, 'items')).toBe('1.00 M items/s')
    })
    
    it('should calculate percentage with precision', () => {
      expect(ProgressUtils.calculatePercentage(1, 3)).toBe(33.33)
      expect(ProgressUtils.calculatePercentage(2, 3, 1)).toBe(66.7)
      expect(ProgressUtils.calculatePercentage(0, 0)).toBe(0)
    })
    
    it('should validate progress values', () => {
      expect(ProgressUtils.validateProgress(-5, 100)).toBe(0)
      expect(ProgressUtils.validateProgress(150, 100)).toBe(100)
      expect(ProgressUtils.validateProgress(50, 100)).toBe(50)
    })
  })

  describe('Progress Persistence', () => {
    it('should save progress state', () => {
      const tracker = progressService.createTracker('persistent-op', 100)
      tracker.update(75)
      
      const state = tracker.getState()
      
      expect(state).toMatchObject({
        id: tracker.id,
        operationName: 'persistent-op',
        current: 75,
        total: 100,
        percentage: 75,
        isCompleted: false
      })
    })
    
    it('should restore progress state', () => {
      const savedState = {
        id: 'restored-tracker',
        operationName: 'restored-op',
        current: 60,
        total: 100,
        percentage: 60,
        isCompleted: false,
        startTime: new Date(Date.now() - 5000)
      }
      
      const tracker = progressService.restoreTracker(savedState)
      
      expect(tracker.id).toBe('restored-tracker')
      expect(tracker.operationName).toBe('restored-op')
      expect(tracker.current).toBe(60)
      expect(tracker.percentage).toBe(60)
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle zero total gracefully', () => {
      const tracker = progressService.createTracker('zero-total', 0)
      
      expect(tracker.percentage).toBe(100) // 0/0 = 100% complete
      expect(tracker.isCompleted).toBe(true)
    })
    
    it('should handle negative totals', () => {
      expect(() => {
        progressService.createTracker('negative-total', -100)
      }).toThrow('Total must be a positive number')
    })
    
    it('should handle invalid progress updates', () => {
      const tracker = progressService.createTracker('test', 100)
      
      expect(() => {
        tracker.update(NaN)
      }).not.toThrow()
      
      expect(() => {
        tracker.update('invalid')
      }).not.toThrow()
      
      // Should remain at previous valid value
      expect(tracker.current).toBe(0)
    })
    
    it('should handle tracker cleanup on completion', () => {
      const tracker = progressService.createTracker('cleanup-test', 100)
      const initialCount = progressService.getActiveTrackers().length
      
      tracker.update(100)
      
      // Should auto-cleanup completed trackers
      setTimeout(() => {
        expect(progressService.getActiveTrackers().length).toBe(initialCount - 1)
      }, 100)
    })
  })

  describe('Performance Monitoring', () => {
    it('should monitor memory usage during progress tracking', () => {
      const tracker = progressService.createTracker('memory-test', 10000)
      
      // Simulate intensive progress updates
      for (let i = 0; i < 1000; i++) {
        tracker.update(i * 10)
      }
      
      const memoryUsage = tracker.getMemoryUsage()
      
      expect(memoryUsage).toHaveProperty('heapUsed')
      expect(memoryUsage).toHaveProperty('heapTotal')
      expect(typeof memoryUsage.heapUsed).toBe('number')
    })
    
    it('should detect performance bottlenecks', () => {
      const tracker = progressService.createTracker('performance-test', 1000, {
        enablePerformanceMonitoring: true
      })
      
      // Simulate slow updates
      for (let i = 0; i < 10; i++) {
        const start = Date.now()
        while (Date.now() - start < 50) {
          // Busy wait to simulate slow processing
        }
        tracker.update(i * 100)
      }
      
      const performanceMetrics = tracker.getPerformanceMetrics()
      
      expect(performanceMetrics.averageUpdateTime).toBeGreaterThan(40)
      expect(performanceMetrics.slowUpdates).toBeGreaterThan(0)
    })
  })

  describe('Integration Features', () => {
    it('should integrate with cancellation tokens', () => {
      const mockCancellationToken = {
        isCancelled: false,
        throwIfCancelled: vi.fn()
      }
      
      const tracker = progressService.createTracker('cancellable-op', 100)
      tracker.setCancellationToken(mockCancellationToken)
      
      tracker.update(50)
      
      expect(mockCancellationToken.throwIfCancelled).toHaveBeenCalled()
    })
    
    it('should support custom progress formatters', () => {
      const customFormatter = (progress) => {
        return `Processing file ${progress.current}/${progress.total} (${progress.percentage}%)`
      }
      
      const tracker = progressService.createTracker('custom-format', 10)
      tracker.setFormatter(customFormatter)
      
      tracker.update(3)
      
      const formatted = tracker.getFormattedProgress()
      expect(formatted).toBe('Processing file 3/10 (30%)')
    })
  })
})