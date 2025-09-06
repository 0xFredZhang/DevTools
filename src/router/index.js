import { createRouter, createWebHashHistory } from 'vue-router'
import Home from '../views/Home.vue'
import JsonParser from '../views/JsonParser.vue'
import JsonCompress from '../views/JsonCompress.vue'
import QrGenerator from '../views/QrGenerator.vue'
import TimestampTool from '../views/TimestampTool.vue'
import CompressTool from '../views/CompressTool.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/json-parser',
    name: 'JsonParser',
    component: JsonParser
  },
  {
    path: '/json-compress',
    name: 'JsonCompress',
    component: JsonCompress
  },
  {
    path: '/qr-generator',
    name: 'QrGenerator',
    component: QrGenerator
  },
  {
    path: '/timestamp',
    name: 'TimestampTool',
    component: TimestampTool
  },
  {
    path: '/compress-tool',
    name: 'CompressTool',
    component: CompressTool
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router