<template>
  <div class="p-8">
    <div class="max-w-4xl mx-auto">
      <h1 class="text-3xl font-bold text-gray-800 mb-4">欢迎使用 DevTools</h1>
      <p class="text-gray-600 mb-8">一个为开发者设计的离线工具集，简洁高效。</p>
      
      <div class="grid grid-cols-2 gap-6">
        <router-link
          v-for="tool in tools"
          :key="tool.path"
          :to="tool.path"
          class="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-200"
        >
          <div class="text-3xl mb-3">{{ tool.icon }}</div>
          <h3 class="text-lg font-semibold text-gray-800 mb-2">{{ tool.name }}</h3>
          <p class="text-sm text-gray-600">{{ tool.description }}</p>
        </router-link>
      </div>

      <div class="mt-12 p-6 bg-blue-50 rounded-lg">
        <h2 class="text-lg font-semibold text-blue-900 mb-2">特性</h2>
        <ul class="text-sm text-blue-800 space-y-1">
          <li>✅ 完全离线可用</li>
          <li>✅ 原生 macOS 应用体验</li>
          <li>✅ 简洁高效的界面设计</li>
          <li>✅ 快速响应，无需等待</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
const tools = [
  {
    path: '/json-parser',
    name: 'JSON 解析器',
    icon: '📝',
    description: '格式化和美化 JSON 数据，支持错误检测和友好提示'
  },
  {
    path: '/json-compress',
    name: 'JSON 压缩/转义',
    icon: '🗜️',
    description: '压缩 JSON 为单行格式，支持转义和去除转义'
  },
  {
    path: '/compress-tool',
    name: '压缩/解压缩',
    icon: '📦',
    description: '压缩和解压文件，支持多种格式和密码保护'
  },
  {
    path: '/qr-generator',
    name: '二维码生成器',
    icon: '📱',
    description: '将任意文本转换为二维码，支持下载保存'
  },
  {
    path: '/timestamp',
    name: 'Unix 时间戳',
    icon: '🕐',
    description: 'Unix 时间戳与日期时间相互转换，支持本地时区'
  }
]
</script>