<template>
  <div class="p-8">
    <div class="max-w-4xl mx-auto">
      <h1 class="text-2xl font-bold text-gray-800 mb-6">JSON 压缩/转义</h1>
      
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
            @click="compress"
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            压缩
          </button>
          <button
            @click="escape"
            class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            转义
          </button>
          <button
            @click="unescape"
            class="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
          >
            去除转义
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
          <label class="block text-sm font-medium text-gray-700 mb-2">处理结果</label>
          <div class="relative">
            <textarea
              v-model="output"
              readonly
              class="w-full h-32 px-3 py-2 bg-gray-50 border border-gray-200 rounded-md font-mono text-sm"
            ></textarea>
            <button
              @click="copyToClipboard"
              class="absolute top-2 right-2 px-3 py-1 bg-white border border-gray-300 rounded text-sm hover:bg-gray-50"
            >
              复制
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const input = ref('')
const output = ref('')
const error = ref('')

const compress = () => {
  error.value = ''
  output.value = ''
  
  if (!input.value.trim()) {
    error.value = '请输入 JSON 字符串'
    return
  }
  
  try {
    const parsed = JSON.parse(input.value)
    output.value = JSON.stringify(parsed)
  } catch (e) {
    error.value = `JSON 解析错误: ${e.message}`
  }
}

const escape = () => {
  error.value = ''
  output.value = ''
  
  if (!input.value.trim()) {
    error.value = '请输入内容'
    return
  }
  
  output.value = JSON.stringify(input.value)
}

const unescape = () => {
  error.value = ''
  output.value = ''
  
  if (!input.value.trim()) {
    error.value = '请输入内容'
    return
  }
  
  try {
    output.value = JSON.parse(input.value)
  } catch (e) {
    error.value = `去除转义失败: ${e.message}`
  }
}

const clear = () => {
  input.value = ''
  output.value = ''
  error.value = ''
}

const copyToClipboard = async () => {
  try {
    await navigator.clipboard.writeText(output.value)
    alert('已复制到剪贴板')
  } catch (e) {
    alert('复制失败')
  }
}
</script>