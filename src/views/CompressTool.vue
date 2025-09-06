<template>
  <div class="p-8">
    <div class="max-w-6xl mx-auto">
      <h1 class="text-2xl font-bold text-gray-800 mb-6">压缩/解压缩</h1>
      
      <!-- Tab Navigation -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div class="border-b border-gray-200">
          <nav class="-mb-px flex">
            <button
              @click="activeTab = 'compress'"
              :class="[
                'px-6 py-3 border-b-2 font-medium text-sm transition-colors',
                activeTab === 'compress'
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              ]"
              type="button"
              role="tab"
              :aria-selected="activeTab === 'compress'"
              aria-controls="compress-panel"
            >
              压缩文件
            </button>
            <button
              @click="activeTab = 'decompress'"
              :class="[
                'px-6 py-3 border-b-2 font-medium text-sm transition-colors',
                activeTab === 'decompress'
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              ]"
              type="button"
              role="tab"
              :aria-selected="activeTab === 'decompress'"
              aria-controls="decompress-panel"
            >
              解压文件
            </button>
          </nav>
        </div>

        <!-- Compress Tab Panel -->
        <div
          v-show="activeTab === 'compress'"
          id="compress-panel"
          class="p-6"
          role="tabpanel"
          aria-labelledby="compress-tab"
        >
          <!-- File Selection Area -->
          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 mb-3">选择要压缩的文件</label>
            
            <!-- Drag and Drop Area -->
            <div
              @drop="handleDrop"
              @dragover.prevent
              @dragenter.prevent
              @dragleave="handleDragLeave"
              :class="[
                'relative border-2 border-dashed rounded-lg p-8 text-center transition-colors',
                isDragging
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              ]"
            >
              <div class="space-y-4">
                <div class="text-4xl text-gray-400">📁</div>
                <div>
                  <p class="text-lg text-gray-600">
                    拖放文件到此区域，或
                    <button
                      @click="openFilePicker"
                      class="text-blue-600 hover:text-blue-800 underline font-medium"
                      type="button"
                    >
                      点击选择文件
                    </button>
                  </p>
                  <p class="text-sm text-gray-500 mt-2">支持多个文件和文件夹</p>
                </div>
              </div>
              
              <!-- Hidden file input -->
              <input
                ref="fileInput"
                type="file"
                multiple
                webkitdirectory=""
                class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                @change="handleFileSelect"
                aria-label="选择要压缩的文件"
              />
            </div>
          </div>

          <!-- Selected Files List -->
          <div v-if="selectedFiles.length > 0" class="mb-6">
            <div class="flex items-center justify-between mb-3">
              <label class="text-sm font-medium text-gray-700">
                已选择 {{ selectedFiles.length }} 个文件
              </label>
              <button
                @click="clearFiles"
                class="text-sm text-red-600 hover:text-red-800 transition-colors"
                type="button"
              >
                清空列表
              </button>
            </div>
            
            <div class="bg-gray-50 border border-gray-200 rounded-md p-4 max-h-40 overflow-y-auto">
              <div
                v-for="(file, index) in selectedFiles"
                :key="index"
                class="flex items-center justify-between py-1"
              >
                <span class="text-sm text-gray-700 truncate flex-1">{{ file.name }}</span>
                <div class="flex items-center space-x-2 ml-4">
                  <span class="text-xs text-gray-500">{{ formatFileSize(file.size) }}</span>
                  <button
                    @click="removeFile(index)"
                    class="text-red-500 hover:text-red-700 text-xs"
                    type="button"
                    :aria-label="`删除文件 ${file.name}`"
                  >
                    删除
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Compression Settings -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <!-- Format Selection -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">压缩格式</label>
              <select
                v-model="compressionFormat"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="选择压缩格式"
              >
                <option value="zip">ZIP (.zip)</option>
                <option value="tar" disabled>TAR (.tar) - 即将支持</option>
                <option value="7z" disabled>7-Zip (.7z) - 即将支持</option>
              </select>
            </div>

            <!-- Compression Level -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">压缩级别</label>
              <select
                v-model="compressionLevel"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="选择压缩级别"
              >
                <option value="fast">快速 - 压缩速度快，体积稍大</option>
                <option value="normal">标准 - 平衡压缩速度和体积</option>
                <option value="maximum">最大 - 最小体积，速度较慢</option>
              </select>
            </div>
          </div>

          <!-- Password Protection -->
          <div class="mb-6">
            <div class="flex items-center space-x-3 mb-2">
              <input
                id="enablePassword"
                v-model="enablePassword"
                type="checkbox"
                class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label for="enablePassword" class="text-sm font-medium text-gray-700">
                设置密码保护
              </label>
            </div>
            
            <div v-if="enablePassword" class="relative">
              <input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                class="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="输入压缩包密码"
                aria-label="压缩包密码"
              />
              <button
                @click="showPassword = !showPassword"
                type="button"
                class="absolute inset-y-0 right-0 pr-3 flex items-center"
                :aria-label="showPassword ? '隐藏密码' : '显示密码'"
              >
                <span class="text-gray-400 hover:text-gray-600">
                  {{ showPassword ? '🙈' : '👁️' }}
                </span>
              </button>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex gap-3">
            <button
              @click="compressFiles"
              :disabled="selectedFiles.length === 0 || isProcessing"
              :class="[
                'px-6 py-2 rounded-md font-medium transition-colors',
                selectedFiles.length === 0 || isProcessing
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              ]"
              type="button"
            >
              {{ isProcessing ? '压缩中...' : '开始压缩' }}
            </button>
            <button
              @click="openFilePicker"
              class="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
              type="button"
            >
              添加更多文件
            </button>
          </div>
        </div>

        <!-- Decompress Tab Panel -->
        <div
          v-show="activeTab === 'decompress'"
          id="decompress-panel"
          class="p-6"
          role="tabpanel"
          aria-labelledby="decompress-tab"
        >
          <!-- Archive File Selection -->
          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 mb-3">选择要解压的文件</label>
            
            <!-- Drag and Drop Area for Archives -->
            <div
              @drop="handleArchiveDrop"
              @dragover.prevent
              @dragenter.prevent
              @dragleave="handleDragLeave"
              :class="[
                'relative border-2 border-dashed rounded-lg p-8 text-center transition-colors',
                isDragging
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              ]"
            >
              <div class="space-y-4">
                <div class="text-4xl text-gray-400">🗜️</div>
                <div>
                  <p class="text-lg text-gray-600">
                    拖放压缩文件到此区域，或
                    <button
                      @click="openArchivePicker"
                      class="text-blue-600 hover:text-blue-800 underline font-medium"
                      type="button"
                    >
                      点击选择文件
                    </button>
                  </p>
                  <p class="text-sm text-gray-500 mt-2">支持 ZIP、TAR、7Z 等格式</p>
                </div>
              </div>
              
              <!-- Hidden archive file input -->
              <input
                ref="archiveInput"
                type="file"
                accept=".zip,.tar,.tar.gz,.7z,.rar"
                class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                @change="handleArchiveSelect"
                aria-label="选择要解压的压缩文件"
              />
            </div>
          </div>

          <!-- Selected Archive -->
          <div v-if="selectedArchive" class="mb-6">
            <label class="text-sm font-medium text-gray-700 mb-2 block">选中的压缩文件</label>
            <div class="bg-gray-50 border border-gray-200 rounded-md p-4">
              <div class="flex items-center justify-between">
                <span class="text-sm text-gray-700">{{ selectedArchive.name }}</span>
                <div class="flex items-center space-x-2">
                  <span class="text-xs text-gray-500">{{ formatFileSize(selectedArchive.size) }}</span>
                  <button
                    @click="clearArchive"
                    class="text-red-500 hover:text-red-700 text-xs"
                    type="button"
                    aria-label="清除选中的压缩文件"
                  >
                    清除
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Extraction Settings -->
          <div class="mb-6">
            <div class="flex items-center space-x-3 mb-4">
              <input
                id="needPassword"
                v-model="needPassword"
                type="checkbox"
                class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label for="needPassword" class="text-sm font-medium text-gray-700">
                此压缩文件需要密码
              </label>
            </div>
            
            <div v-if="needPassword" class="relative">
              <input
                v-model="extractPassword"
                :type="showExtractPassword ? 'text' : 'password'"
                class="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="输入解压密码"
                aria-label="解压密码"
              />
              <button
                @click="showExtractPassword = !showExtractPassword"
                type="button"
                class="absolute inset-y-0 right-0 pr-3 flex items-center"
                :aria-label="showExtractPassword ? '隐藏密码' : '显示密码'"
              >
                <span class="text-gray-400 hover:text-gray-600">
                  {{ showExtractPassword ? '🙈' : '👁️' }}
                </span>
              </button>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex gap-3">
            <button
              @click="extractArchive"
              :disabled="!selectedArchive || isProcessing"
              :class="[
                'px-6 py-2 rounded-md font-medium transition-colors',
                !selectedArchive || isProcessing
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              ]"
              type="button"
            >
              {{ isProcessing ? '解压中...' : '开始解压' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Error/Success Messages -->
      <div v-if="error" class="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
        <div class="flex">
          <div class="ml-3">
            <h3 class="text-sm font-medium text-red-800">操作失败</h3>
            <p class="text-sm text-red-700 mt-1">{{ error }}</p>
          </div>
        </div>
      </div>

      <div v-if="success" class="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
        <div class="flex">
          <div class="ml-3">
            <h3 class="text-sm font-medium text-green-800">操作成功</h3>
            <p class="text-sm text-green-700 mt-1">{{ success }}</p>
          </div>
        </div>
      </div>

      <!-- Progress Bar -->
      <div v-if="isProcessing" class="mb-6">
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-medium text-gray-700">处理进度</span>
            <div class="flex items-center space-x-2">
              <span class="text-sm text-gray-500">{{ Math.round(progress) }}%</span>
              <button
                @click="cancelOperation"
                class="px-3 py-1 text-sm bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors"
                type="button"
              >
                取消
              </button>
            </div>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-2">
            <div
              class="bg-blue-600 h-2 rounded-full transition-all duration-300"
              :style="{ width: `${progress}%` }"
            ></div>
          </div>
        </div>
      </div>

      <!-- File Picker Modal -->
      <div
        v-if="showFilePicker"
        class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        @click="closeFilePicker"
      >
        <div
          class="bg-white rounded-lg shadow-xl max-w-md w-full m-4"
          @click.stop
        >
          <div class="p-6">
            <h3 class="text-lg font-medium text-gray-900 mb-4">选择文件类型</h3>
            <div class="space-y-3">
              <button
                @click="selectFiles(false)"
                class="w-full text-left px-4 py-3 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                type="button"
              >
                <div class="font-medium text-gray-900">选择文件</div>
                <div class="text-sm text-gray-500">选择一个或多个文件进行压缩</div>
              </button>
              <button
                @click="selectFiles(true)"
                class="w-full text-left px-4 py-3 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                type="button"
              >
                <div class="font-medium text-gray-900">选择文件夹</div>
                <div class="text-sm text-gray-500">选择整个文件夹进行压缩</div>
              </button>
            </div>
            <div class="mt-6 flex justify-end">
              <button
                @click="closeFilePicker"
                class="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                type="button"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, onMounted, onUnmounted } from 'vue'
import { compressionService, CompressionError } from '../services/compressionService.js'
import { fileService } from '../services/fileService.js'
import { errorHandlingService, ERROR_CODES } from '../services/errorHandlingService.js'
import { progressTrackingService, ProgressUtils, PROGRESS_EVENTS } from '../services/progressTrackingService.js'
import { operationCancellationService, CANCELLATION_REASONS } from '../services/operationCancellationService.js'
import { notificationService } from '../services/notificationService.js'

// State management
const activeTab = ref('compress')
const isDragging = ref(false)
const isProcessing = ref(false)
const progress = ref(0)
const progressDetails = ref(null)
const error = ref('')
const success = ref('')
const notification = ref(null)
const showProgressModal = ref(false)
const currentOperation = ref(null)
const showFilePicker = ref(false)
const currentOperationId = ref(null)

// File selection state
const selectedFiles = ref([])
const selectedArchive = ref(null)
const fileInput = ref(null)
const archiveInput = ref(null)

// Settings state
const compressionFormat = ref('zip')
const compressionLevel = ref('normal')
const enablePassword = ref(false)
const password = ref('')
const showPassword = ref(false)
const needPassword = ref(false)
const extractPassword = ref('')
const showExtractPassword = ref(false)

// File handling methods
const handleDrop = (event) => {
  event.preventDefault()
  isDragging.value = false
  
  const files = Array.from(event.dataTransfer.files)
  if (files.length > 0) {
    addFiles(files)
  }
}

const handleArchiveDrop = (event) => {
  event.preventDefault()
  isDragging.value = false
  
  const files = Array.from(event.dataTransfer.files)
  if (files.length > 0 && isArchiveFile(files[0])) {
    selectedArchive.value = files[0]
    clearMessages()
  } else {
    error.value = '请拖放有效的压缩文件'
  }
}

const handleDragLeave = (event) => {
  if (!event.currentTarget.contains(event.relatedTarget)) {
    isDragging.value = false
  }
}

const handleFileSelect = (event) => {
  const files = Array.from(event.target.files)
  if (files.length > 0) {
    addFiles(files)
  }
}

const handleArchiveSelect = (event) => {
  const files = Array.from(event.target.files)
  if (files.length > 0) {
    selectedArchive.value = files[0]
    clearMessages()
  }
}

const addFiles = (files) => {
  // Filter out duplicates based on name and size
  const newFiles = files.filter(file => {
    return !selectedFiles.value.some(existing => 
      existing.name === file.name && existing.size === file.size
    )
  })
  
  selectedFiles.value.push(...newFiles)
  clearMessages()
}

const removeFile = (index) => {
  selectedFiles.value.splice(index, 1)
}

const clearFiles = () => {
  selectedFiles.value = []
  clearMessages()
}

const clearArchive = () => {
  selectedArchive.value = null
  clearMessages()
}

// File picker modal methods
const openFilePicker = () => {
  showFilePicker.value = true
}

const closeFilePicker = () => {
  showFilePicker.value = false
}

const openArchivePicker = () => {
  archiveInput.value?.click()
}

const selectFiles = async (selectDirectory) => {
  closeFilePicker()
  await nextTick()
  
  if (selectDirectory) {
    fileInput.value?.setAttribute('webkitdirectory', '')
  } else {
    fileInput.value?.removeAttribute('webkitdirectory')
  }
  
  fileInput.value?.click()
}

// Utility methods
const formatFileSize = ProgressUtils.formatFileSize

const isArchiveFile = (file) => {
  const archiveExtensions = ['.zip', '.tar', '.tar.gz', '.7z', '.rar']
  return archiveExtensions.some(ext => file.name.toLowerCase().endsWith(ext))
}

const clearMessages = () => {
  error.value = ''
  success.value = ''
  notification.value = null
}

// Format utilities for display
const formatDuration = ProgressUtils.formatDuration
const formatSpeed = ProgressUtils.formatSpeed

// Progress event handlers
const handleProgressEvents = () => {
  progressTrackingService.addEventListener(PROGRESS_EVENTS.UPDATED, (progressData) => {
    if (currentOperation.value && progressData.operationId === currentOperation.value.operationId) {
      progress.value = progressData.percentage
    }
  })
  
  progressTrackingService.addEventListener(PROGRESS_EVENTS.COMPLETED, (progressData) => {
    console.log('Operation completed:', progressData)
  })
  
  progressTrackingService.addEventListener(PROGRESS_EVENTS.FAILED, (progressData) => {
    console.error('Operation failed:', progressData)
  })
}

// Lifecycle hooks
onMounted(() => {
  handleProgressEvents()
})

onUnmounted(() => {
  // Cancel any active operations when component is destroyed
  if (currentOperation.value) {
    operationCancellationService.cancelOperation(
      currentOperation.value.operationId,
      CANCELLATION_REASONS.SYSTEM_SHUTDOWN
    )
  }
})

// Convert File objects to file paths for compression service
const convertFilesToPaths = async (files) => {
  const filePaths = []
  
  for (const file of files) {
    try {
      // Create temporary file from File object
      const tempPath = await fileService.createTempFile()
      const buffer = await file.arrayBuffer()
      
      // Write file using Node.js fs (only available in Electron main process)
      // For now, we'll simulate this - in a real implementation, this would need
      // to be handled through IPC to the main process
      
      filePaths.push({
        path: tempPath,
        relativePath: file.name,
        buffer: buffer // Pass buffer for now
      })
    } catch (err) {
      console.error('Error converting file:', err)
      throw new Error(`无法处理文件 ${file.name}: ${err.message}`)
    }
  }
  
  return filePaths
}

// Main processing methods
const compressFiles = async () => {
  if (selectedFiles.value.length === 0) {
    error.value = '请先选择要压缩的文件'
    return
  }

  if (enablePassword.value && !password.value.trim()) {
    error.value = '请输入密码'
    return
  }

  clearMessages()
  isProcessing.value = true
  progress.value = 0
  
  try {
    // Convert browser File objects to file paths
    const filePaths = await convertFilesToPaths(selectedFiles.value)
    
    // Create output path
    const outputPath = await fileService.createTempFile('.zip')
    
    // Compress files using the compression service
    const result = await compressionService.compress(filePaths, outputPath, {
      format: compressionFormat.value,
      level: compressionLevel.value,
      password: enablePassword.value ? password.value : null,
      onProgress: (progressInfo) => {
        progress.value = progressInfo.progress
      }
    })
    
    if (result.success) {
      currentOperationId.value = result.operationId
      success.value = `成功压缩 ${result.filesProcessed} 个文件为 ${compressionFormat.value.toUpperCase()} 格式`
      
      // In a real implementation, you would download the compressed file
      // For now, we'll just show success
      console.log('Compression completed:', result)
      
      // Clean up temporary files
      for (const file of filePaths) {
        try {
          await fileService.cleanupTemp(file.path)
        } catch (e) {
          console.warn('Failed to cleanup temp file:', e)
        }
      }
    }
    
  } catch (err) {
    console.error('Compression error:', err)
    
    if (err instanceof CompressionError) {
      error.value = err.getUserMessage()
    } else {
      error.value = `压缩失败: ${err.message}`
    }
  } finally {
    isProcessing.value = false
    progress.value = 0
    currentOperationId.value = null
  }
}

const extractArchive = async () => {
  if (!selectedArchive.value) {
    error.value = '请先选择要解压的文件'
    return
  }

  if (needPassword.value && !extractPassword.value.trim()) {
    error.value = '请输入解压密码'
    return
  }

  clearMessages()
  isProcessing.value = true
  progress.value = 0

  try {
    // Create temporary file for the archive
    const archivePath = await fileService.createTempFile()
    const buffer = await selectedArchive.value.arrayBuffer()
    
    // Write archive file - in a real implementation, this would need
    // to be handled through IPC to the main process
    // For now, we'll simulate this
    
    // Create output directory
    const outputDir = await fileService.createTempDirectory()
    
    // Decompress using the compression service
    const result = await compressionService.decompress(archivePath, outputDir, {
      password: needPassword.value ? extractPassword.value : null,
      onProgress: (progressInfo) => {
        progress.value = progressInfo.progress
      }
    })
    
    if (result.success) {
      success.value = `成功解压 ${result.filesExtracted} 个文件`
      
      // In a real implementation, you would provide download or preview of extracted files
      console.log('Extraction completed:', result)
      
      // Clean up
      await fileService.cleanupTemp(archivePath)
    }
    
  } catch (err) {
    console.error('Extraction error:', err)
    
    if (err instanceof CompressionError) {
      error.value = err.getUserMessage()
    } else {
      error.value = `解压失败: ${err.message}`
    }
  } finally {
    isProcessing.value = false
    progress.value = 0
  }
}

// Cancel operation if needed
const cancelOperation = () => {
  if (currentOperationId.value) {
    compressionService.cancelOperation(currentOperationId.value)
    isProcessing.value = false
    progress.value = 0
    currentOperationId.value = null
    success.value = '操作已取消'
  }
}

// Drag and drop event handlers
document.addEventListener('dragenter', (e) => {
  e.preventDefault()
  isDragging.value = true
})

document.addEventListener('dragover', (e) => {
  e.preventDefault()
})

document.addEventListener('drop', (e) => {
  e.preventDefault()
  isDragging.value = false
})
</script>