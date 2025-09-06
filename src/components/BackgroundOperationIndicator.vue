/**
 * Background Operation Indicator Component
 * 
 * Shows a floating indicator for active background operations
 * with progress and cancellation options.
 */

<template>
  <div v-if="hasActiveOperations" class="fixed bottom-4 right-4 z-50">
    <!-- Compact indicator when minimized -->
    <div v-if="!expanded" class="bg-white rounded-lg shadow-lg border border-gray-200 p-3">
      <div class="flex items-center space-x-3">
        <!-- Progress indicator -->
        <div class="relative">
          <div class="w-8 h-8">
            <svg class="w-8 h-8 transform -rotate-90" viewBox="0 0 36 36">
              <path
                d="m18,2.0845
                  a 15.9155,15.9155 0 0,1 0,31.831
                  a 15.9155,15.9155 0 0,1 0,-31.831"
                fill="none"
                stroke="#e5e7eb"
                stroke-width="3"
              />
              <path
                d="m18,2.0845
                  a 15.9155,15.9155 0 0,1 0,31.831
                  a 15.9155,15.9155 0 0,1 0,-31.831"
                fill="none"
                stroke="#3b82f6"
                stroke-width="3"
                :stroke-dasharray="`${averageProgress}, 100`"
                class="transition-all duration-300"
              />
            </svg>
            <div class="absolute inset-0 flex items-center justify-center">
              <span class="text-xs font-medium text-gray-600">
                {{ Math.round(averageProgress) }}%
              </span>
            </div>
          </div>
        </div>
        
        <!-- Operation info -->
        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium text-gray-900 truncate">
            {{ operationCount }}个操作进行中
          </div>
          <div class="text-xs text-gray-500 truncate">
            {{ currentOperationName }}
          </div>
        </div>
        
        <!-- Actions -->
        <div class="flex space-x-1">
          <button
            @click="expanded = true"
            class="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            type="button"
            title="展开详情"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
    
    <!-- Expanded view -->
    <div v-else class="bg-white rounded-lg shadow-lg border border-gray-200 max-w-sm">
      <!-- Header -->
      <div class="px-4 py-3 border-b border-gray-200">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-medium text-gray-900">
            后台操作 ({{ operationCount }})
          </h3>
          <button
            @click="expanded = false"
            class="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            type="button"
            title="最小化"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
            </svg>
          </button>
        </div>
      </div>
      
      <!-- Operations list -->
      <div class="max-h-64 overflow-y-auto">
        <div
          v-for="operation in activeOperations"
          :key="operation.id"
          class="px-4 py-3 border-b border-gray-100 last:border-b-0"
        >
          <div class="flex items-start space-x-3">
            <!-- Operation icon -->
            <div class="flex-shrink-0 mt-1">
              <div :class="[
                'w-2 h-2 rounded-full',
                operation.status === 'completed' ? 'bg-green-500' :
                operation.status === 'failed' ? 'bg-red-500' :
                operation.status === 'cancelled' ? 'bg-yellow-500' :
                'bg-blue-500'
              ]"></div>
            </div>
            
            <!-- Operation details -->
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-gray-900 truncate">
                {{ getOperationTitle(operation) }}
              </div>
              <div class="text-xs text-gray-500 truncate">
                {{ operation.message || getOperationStatus(operation) }}
              </div>
              
              <!-- Progress bar -->
              <div v-if="operation.percentage !== undefined" class="mt-2">
                <div class="flex items-center justify-between text-xs text-gray-500 mb-1">
                  <span>{{ Math.round(operation.percentage) }}%</span>
                  <span v-if="operation.remainingTime > 0">
                    剩余 {{ formatDuration(operation.remainingTime) }}
                  </span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-1">
                  <div
                    class="bg-blue-600 h-1 rounded-full transition-all duration-300"
                    :style="{ width: `${operation.percentage}%` }"
                  ></div>
                </div>
              </div>
              
              <!-- Statistics -->
              <div v-if="operation.speed > 0" class="mt-1 text-xs text-gray-500">
                {{ formatSpeed(operation.speed) }}
              </div>
            </div>
            
            <!-- Cancel button -->
            <div class="flex-shrink-0">
              <button
                v-if="canCancelOperation(operation)"
                @click="cancelOperation(operation.operationId)"
                class="p-1 text-gray-400 hover:text-red-600 transition-colors"
                type="button"
                title="取消操作"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Actions -->
      <div class="px-4 py-3 bg-gray-50 rounded-b-lg">
        <div class="flex justify-between text-xs">
          <button
            @click="clearCompleted"
            class="text-gray-500 hover:text-gray-700 transition-colors"
            type="button"
          >
            清除已完成
          </button>
          <button
            @click="showHistory = !showHistory"
            class="text-blue-600 hover:text-blue-800 transition-colors"
            type="button"
          >
            {{ showHistory ? '隐藏历史' : '显示历史' }}
          </button>
        </div>
      </div>
    </div>
    
    <!-- History panel -->
    <div v-if="showHistory && expanded" class="mt-2 bg-white rounded-lg shadow-lg border border-gray-200 max-w-sm">
      <div class="px-4 py-3 border-b border-gray-200">
        <h3 class="text-sm font-medium text-gray-900">操作历史</h3>
      </div>
      <div class="max-h-48 overflow-y-auto">
        <div
          v-for="operation in recentOperations"
          :key="operation.id"
          class="px-4 py-2 border-b border-gray-100 last:border-b-0"
        >
          <div class="flex items-center space-x-2">
            <div :class="[
              'w-2 h-2 rounded-full flex-shrink-0',
              operation.status === 'completed' ? 'bg-green-500' :
              operation.status === 'failed' ? 'bg-red-500' :
              'bg-yellow-500'
            ]"></div>
            <div class="flex-1 min-w-0">
              <div class="text-xs font-medium text-gray-700 truncate">
                {{ getOperationTitle(operation) }}
              </div>
              <div class="text-xs text-gray-500">
                {{ formatTimestamp(operation.timestamp) }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { progressTrackingService, ProgressUtils, PROGRESS_EVENTS } from '../services/progressTrackingService.js'
import { operationCancellationService, CANCELLATION_REASONS } from '../services/operationCancellationService.js'

// Component state
const expanded = ref(false)
const showHistory = ref(false)
const activeOperations = ref([])
const recentOperations = ref([])

// Computed properties
const hasActiveOperations = computed(() => activeOperations.value.length > 0)
const operationCount = computed(() => activeOperations.value.length)

const averageProgress = computed(() => {
  if (activeOperations.value.length === 0) return 0
  const totalProgress = activeOperations.value.reduce((sum, op) => sum + (op.percentage || 0), 0)
  return totalProgress / activeOperations.value.length
})

const currentOperationName = computed(() => {
  if (activeOperations.value.length === 0) return ''
  const current = activeOperations.value[0]
  return getOperationTitle(current)
})

// Event handlers
const updateOperations = () => {
  activeOperations.value = progressTrackingService.getActiveOperations()
  recentOperations.value = progressTrackingService.getRecentOperations(10)
}

const handleProgressUpdate = () => {
  updateOperations()
}

const handleOperationComplete = () => {
  updateOperations()
}

const handleOperationFailed = () => {
  updateOperations()
}

// Utility functions
const getOperationTitle = (operation) => {
  const titles = {
    compress: '压缩文件',
    decompress: '解压文件',
    validate: '验证文件',
    encrypt: '加密文件',
    decrypt: '解密文件'
  }
  return titles[operation.operationType] || '处理文件'
}

const getOperationStatus = (operation) => {
  const statuses = {
    initializing: '准备中...',
    running: '进行中...',
    paused: '已暂停',
    cancelling: '取消中...',
    cancelled: '已取消',
    completed: '已完成',
    failed: '失败'
  }
  return statuses[operation.status] || operation.status
}

const canCancelOperation = (operation) => {
  return ['initializing', 'running', 'paused'].includes(operation.status)
}

const cancelOperation = async (operationId) => {
  try {
    await operationCancellationService.cancelOperation(operationId, CANCELLATION_REASONS.USER_REQUESTED)
  } catch (error) {
    console.error('Failed to cancel operation:', error)
  }
}

const clearCompleted = () => {
  // This would trigger clearing completed operations from the service
  updateOperations()
}

const formatDuration = ProgressUtils.formatDuration
const formatSpeed = ProgressUtils.formatSpeed

const formatTimestamp = (timestamp) => {
  const now = Date.now()
  const diff = now - timestamp
  
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  return `${Math.floor(diff / 86400000)}天前`
}

// Lifecycle
onMounted(() => {
  // Set up event listeners
  progressTrackingService.addEventListener(PROGRESS_EVENTS.UPDATED, handleProgressUpdate)
  progressTrackingService.addEventListener(PROGRESS_EVENTS.COMPLETED, handleOperationComplete)
  progressTrackingService.addEventListener(PROGRESS_EVENTS.FAILED, handleOperationFailed)
  progressTrackingService.addEventListener(PROGRESS_EVENTS.CANCELLED, handleOperationComplete)
  
  // Initial load
  updateOperations()
  
  // Update every few seconds
  const interval = setInterval(updateOperations, 2000)
  
  onUnmounted(() => {
    // Clean up listeners and interval
    progressTrackingService.removeEventListener(PROGRESS_EVENTS.UPDATED, handleProgressUpdate)
    progressTrackingService.removeEventListener(PROGRESS_EVENTS.COMPLETED, handleOperationComplete)
    progressTrackingService.removeEventListener(PROGRESS_EVENTS.FAILED, handleOperationFailed)
    progressTrackingService.removeEventListener(PROGRESS_EVENTS.CANCELLED, handleOperationComplete)
    clearInterval(interval)
  })
})
</script>

<style scoped>
/* Add any custom styles if needed */
</style>