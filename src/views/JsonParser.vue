<template>
  <div class="p-8">
    <div class="max-w-6xl mx-auto">
      <h1 class="text-2xl font-bold text-gray-800 mb-6">JSON 解析器</h1>
      
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Main Parser Section -->
        <div class="lg:col-span-2">
          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-2">输入 JSON</label>
              <textarea
                v-model="input"
                class="w-full h-48 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                placeholder="粘贴你的 JSON 字符串..."
              ></textarea>
            </div>

            <div class="flex gap-3 mb-4">
              <button
                @click="formatJson"
                class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                格式化
              </button>
              <button
                @click="clear"
                class="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
              >
                清空
              </button>
            </div>

            <div v-if="error" class="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p class="text-sm text-red-600">{{ error }}</p>
            </div>

            <div v-if="output" class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-2">格式化结果</label>
              <pre class="w-full p-4 bg-gray-50 border border-gray-200 rounded-md overflow-x-auto font-mono text-sm">{{ output }}</pre>
            </div>
          </div>
        </div>

        <!-- History Section -->
        <div class="lg:col-span-1">
          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-medium text-gray-800">历史记录</h2>
              <button
                @click="clearHistory"
                class="text-sm text-red-600 hover:text-red-800 transition-colors"
                v-if="history.length > 0"
              >
                清空历史
              </button>
            </div>
            
            <div v-if="history.length === 0" class="text-sm text-gray-500 text-center py-8">
              暂无历史记录
            </div>
            
            <div v-else class="space-y-2 max-h-96 overflow-y-auto">
              <div
                v-for="(item, index) in history"
                :key="index"
                class="p-3 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer transition-colors"
                @click="loadFromHistory(item)"
              >
                <div class="flex items-center justify-between mb-2">
                  <span class="text-xs text-gray-500">{{ formatDate(item.timestamp) }}</span>
                  <button
                    @click.stop="removeHistoryItem(index)"
                    class="text-red-500 hover:text-red-700 text-xs"
                  >
                    删除
                  </button>
                </div>
                <div class="text-sm text-gray-700 truncate">
                  {{ getPreview(item.input) }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const input = ref('')
const output = ref('')
const error = ref('')
const history = ref([])

const HISTORY_KEY = 'json-parser-history'
const MAX_HISTORY_ITEMS = 20

const loadHistory = () => {
  const saved = localStorage.getItem(HISTORY_KEY)
  if (saved) {
    try {
      history.value = JSON.parse(saved)
    } catch (e) {
      history.value = []
    }
  }
}

const saveHistory = () => {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.value))
}

const addToHistory = (inputText, outputText) => {
  const historyItem = {
    input: inputText,
    output: outputText,
    timestamp: new Date().toISOString()
  }
  
  // Remove duplicate if exists
  const existingIndex = history.value.findIndex(item => item.input === inputText)
  if (existingIndex !== -1) {
    history.value.splice(existingIndex, 1)
  }
  
  // Add to beginning of history
  history.value.unshift(historyItem)
  
  // Keep only MAX_HISTORY_ITEMS
  if (history.value.length > MAX_HISTORY_ITEMS) {
    history.value = history.value.slice(0, MAX_HISTORY_ITEMS)
  }
  
  saveHistory()
}

const formatJson = () => {
  error.value = ''
  output.value = ''
  
  if (!input.value.trim()) {
    error.value = '请输入 JSON 字符串'
    return
  }
  
  try {
    const parsed = JSON.parse(input.value)
    const formatted = JSON.stringify(parsed, null, 2)
    output.value = formatted
    
    // Add to history
    addToHistory(input.value.trim(), formatted)
  } catch (e) {
    error.value = `JSON 解析错误: ${e.message}`
  }
}

const clear = () => {
  input.value = ''
  output.value = ''
  error.value = ''
}

const clearHistory = () => {
  history.value = []
  saveHistory()
}

const loadFromHistory = (item) => {
  input.value = item.input
  output.value = item.output
  error.value = ''
}

const removeHistoryItem = (index) => {
  history.value.splice(index, 1)
  saveHistory()
}

const formatDate = (timestamp) => {
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getPreview = (text) => {
  if (!text) return ''
  const cleaned = text.replace(/\s+/g, ' ').trim()
  return cleaned.length > 50 ? cleaned.substring(0, 50) + '...' : cleaned
}

onMounted(() => {
  loadHistory()
})
</script>