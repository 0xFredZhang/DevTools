<template>
  <div class="p-8">
    <div class="max-w-4xl mx-auto">
      <h1 class="text-2xl font-bold text-gray-800 mb-6">二维码生成器</h1>
      
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">输入文本</label>
          <textarea
            v-model="input"
            class="w-full h-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="输入要生成二维码的文本..."
          ></textarea>
        </div>

        <div class="flex gap-3 mb-6">
          <button
            @click="generateQR"
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            生成二维码
          </button>
          <button
            @click="clear"
            class="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
          >
            清空
          </button>
        </div>

        <div v-if="qrCode" class="flex flex-col items-center">
          <div class="p-4 bg-white border-2 border-gray-200 rounded-lg mb-4">
            <canvas ref="qrCanvas"></canvas>
          </div>
          <button
            @click="downloadQR"
            class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            下载二维码
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import QRCode from 'qrcode'

const input = ref('')
const qrCode = ref('')
const qrCanvas = ref(null)

const generateQR = async () => {
  if (!input.value.trim()) {
    alert('请输入文本内容')
    return
  }
  
  try {
    qrCode.value = input.value
    await nextTick()
    
    await QRCode.toCanvas(qrCanvas.value, input.value, {
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    })
  } catch (error) {
    alert('生成二维码失败: ' + error.message)
  }
}

const downloadQR = () => {
  if (!qrCanvas.value) return
  
  const link = document.createElement('a')
  link.download = 'qrcode.png'
  link.href = qrCanvas.value.toDataURL()
  link.click()
}

const clear = () => {
  input.value = ''
  qrCode.value = ''
  if (qrCanvas.value) {
    const ctx = qrCanvas.value.getContext('2d')
    ctx.clearRect(0, 0, qrCanvas.value.width, qrCanvas.value.height)
  }
}
</script>