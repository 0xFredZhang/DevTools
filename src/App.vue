<template>
  <div class="flex h-screen bg-gray-50">
    <!-- Sidebar -->
    <aside class="w-64 bg-white border-r border-gray-200">
      <div class="p-6">
        <h1 class="text-2xl font-bold text-gray-800">DevTools</h1>
        <p class="text-sm text-gray-500 mt-1">开发者工具集</p>
        
        <!-- Search Box -->
        <div class="mt-4">
          <div class="relative">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="搜索工具..."
              class="w-full px-3 py-2 pl-9 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
            >
            <span class="absolute left-3 top-2.5 text-gray-400">🔍</span>
          </div>
        </div>
      </div>
      
      <nav class="px-4 pb-4">
        <router-link
          v-for="item in filteredMenuItems"
          :key="item.path"
          :to="item.path"
          class="flex items-center px-4 py-3 mb-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors duration-200"
          active-class="bg-blue-50 text-blue-600 hover:bg-blue-50"
        >
          <span class="text-xl mr-3">{{ item.icon }}</span>
          <span class="font-medium">{{ item.name }}</span>
        </router-link>
      </nav>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 overflow-y-auto">
      <router-view></router-view>
    </main>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const searchQuery = ref('')

const menuItems = [
  { path: '/', name: '首页', icon: '🏠' },
  { path: '/json-parser', name: 'JSON 解析器', icon: '📝' },
  { path: '/json-compress', name: 'JSON 压缩/转义', icon: '🗜️' },
  { path: '/qr-generator', name: '二维码生成器', icon: '📱' },
  { path: '/timestamp', name: 'Unix 时间戳', icon: '🕐' }
]

const filteredMenuItems = computed(() => {
  if (!searchQuery.value.trim()) {
    return menuItems
  }
  
  const query = searchQuery.value.toLowerCase()
  return menuItems.filter(item => 
    item.name.toLowerCase().includes(query) ||
    item.name.toLowerCase().replace(/\s+/g, '').includes(query.replace(/\s+/g, ''))
  )
})
</script>