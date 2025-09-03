<template>
  <div class="p-8">
    <div class="max-w-4xl mx-auto">
      <h1 class="text-2xl font-bold text-gray-800 mb-6">Unix 时间戳转换</h1>
      
      <div class="grid grid-cols-2 gap-6">
        <!-- 时间戳转日期 -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 class="text-lg font-semibold text-gray-700 mb-4">时间戳 → 日期时间</h2>
          
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">Unix 时间戳</label>
            <input
              v-model="timestamp"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="例如: 1704067200"
            />
          </div>
          
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">单位</label>
            <select
              v-model="timestampUnit"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="seconds">秒 (s)</option>
              <option value="milliseconds">毫秒 (ms)</option>
            </select>
          </div>
          
          <button
            @click="timestampToDate"
            class="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            转换
          </button>
          
          <div v-if="dateResult" class="mt-4 p-3 bg-gray-50 rounded-md">
            <p class="text-sm text-gray-600">结果:</p>
            <div class="flex items-center gap-2">
              <p class="font-mono flex-1">{{ dateResult }}</p>
              <button
                @click="copyToClipboard(dateResult, $event)"
                class="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
                title="复制"
              >
                📋
              </button>
            </div>
          </div>
        </div>

        <!-- 日期转时间戳 -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 class="text-lg font-semibold text-gray-700 mb-4">日期时间 → 时间戳</h2>
          
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">日期</label>
            <input
              v-model="dateInput"
              type="date"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">时间</label>
            <input
              v-model="timeInput"
              type="time"
              step="1"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <button
            @click="dateToTimestamp"
            class="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            转换
          </button>
          
          <div v-if="timestampResult" class="mt-4 p-3 bg-gray-50 rounded-md">
            <p class="text-sm text-gray-600">结果:</p>
            <div class="space-y-2">
              <div class="flex items-center gap-2">
                <p class="font-mono flex-1">秒: {{ timestampResult.seconds }}</p>
                <button
                  @click="copyToClipboard(timestampResult.seconds, $event)"
                  class="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
                  title="复制"
                >
                  📋
                </button>
              </div>
              <div class="flex items-center gap-2">
                <p class="font-mono flex-1">毫秒: {{ timestampResult.milliseconds }}</p>
                <button
                  @click="copyToClipboard(timestampResult.milliseconds, $event)"
                  class="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
                  title="复制"
                >
                  📋
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 当前时间 -->
      <div class="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 class="text-lg font-semibold text-gray-700 mb-4">当前时间</h2>
        <div class="grid grid-cols-3 gap-4">
          <div>
            <p class="text-sm text-gray-600">当前日期时间</p>
            <div class="flex items-center gap-2">
              <p class="font-mono flex-1">{{ currentDateTime }}</p>
              <button
                @click="copyToClipboard(currentDateTime, $event)"
                class="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
                title="复制"
              >
                📋
              </button>
            </div>
          </div>
          <div>
            <p class="text-sm text-gray-600">Unix 时间戳 (秒)</p>
            <div class="flex items-center gap-2">
              <p class="font-mono flex-1">{{ currentTimestamp }}</p>
              <button
                @click="copyToClipboard(currentTimestamp, $event)"
                class="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
                title="复制"
              >
                📋
              </button>
            </div>
          </div>
          <div>
            <p class="text-sm text-gray-600">Unix 时间戳 (毫秒)</p>
            <div class="flex items-center gap-2">
              <p class="font-mono flex-1">{{ currentTimestampMs }}</p>
              <button
                @click="copyToClipboard(currentTimestampMs, $event)"
                class="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
                title="复制"
              >
                📋
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const timestamp = ref('')
const timestampUnit = ref('seconds')
const dateResult = ref('')

const dateInput = ref('')
const timeInput = ref('')
const timestampResult = ref(null)

const currentDateTime = ref('')
const currentTimestamp = ref('')
const currentTimestampMs = ref('')

let timer = null

const timestampToDate = () => {
  if (!timestamp.value) {
    alert('请输入时间戳')
    return
  }
  
  try {
    const ts = parseInt(timestamp.value)
    const date = new Date(timestampUnit.value === 'seconds' ? ts * 1000 : ts)
    
    if (isNaN(date.getTime())) {
      alert('无效的时间戳')
      return
    }
    
    dateResult.value = date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
  } catch (error) {
    alert('转换失败: ' + error.message)
  }
}

const dateToTimestamp = () => {
  if (!dateInput.value) {
    alert('请选择日期')
    return
  }
  
  try {
    const dateTimeString = timeInput.value 
      ? `${dateInput.value}T${timeInput.value}`
      : `${dateInput.value}T00:00:00`
    
    const date = new Date(dateTimeString)
    const ms = date.getTime()
    
    if (isNaN(ms)) {
      alert('无效的日期时间')
      return
    }
    
    timestampResult.value = {
      seconds: Math.floor(ms / 1000),
      milliseconds: ms
    }
  } catch (error) {
    alert('转换失败: ' + error.message)
  }
}

const updateCurrentTime = () => {
  const now = new Date()
  currentDateTime.value = now.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
  currentTimestamp.value = Math.floor(now.getTime() / 1000)
  currentTimestampMs.value = now.getTime()
}

const copyToClipboard = async (text, event) => {
  try {
    await navigator.clipboard.writeText(text.toString())
    // 视觉反馈
    const button = event.target
    const originalText = button.textContent
    button.textContent = '✓'
    button.classList.add('bg-green-100', 'text-green-600')
    button.classList.remove('bg-gray-100', 'text-gray-600')
    
    setTimeout(() => {
      button.textContent = originalText
      button.classList.remove('bg-green-100', 'text-green-600')
      button.classList.add('bg-gray-100', 'text-gray-600')
    }, 1000)
  } catch (err) {
    // 降级方案：选中文本让用户手动复制
    const textarea = document.createElement('textarea')
    textarea.value = text.toString()
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    
    // 同样的视觉反馈
    const button = event.target
    const originalText = button.textContent
    button.textContent = '✓'
    button.classList.add('bg-green-100', 'text-green-600')
    button.classList.remove('bg-gray-100', 'text-gray-600')
    
    setTimeout(() => {
      button.textContent = originalText
      button.classList.remove('bg-green-100', 'text-green-600')
      button.classList.add('bg-gray-100', 'text-gray-600')
    }, 1000)
  }
}

onMounted(() => {
  updateCurrentTime()
  timer = setInterval(updateCurrentTime, 1000)
})

onUnmounted(() => {
  if (timer) {
    clearInterval(timer)
  }
})
</script>