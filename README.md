# DevTools - 开发者工具集

一个基于 Vue 3 + Electron 构建的桌面开发者工具应用，提供常用的开发工具，支持完全离线使用。

## ✨ 功能特性

- **JSON 解析器** - JSON 格式化、验证和美化
- **JSON 压缩/转义** - JSON 压缩和字符串转义工具
- **二维码生成器** - 快速生成二维码
- **Unix 时间戳转换器** - 时间戳与日期格式互转
- **完全离线** - 所有工具都可在离线环境下使用
- **跨平台** - 支持 macOS、Windows、Linux

## 🚀 快速开始

### 环境要求

- Node.js 16.0+
- pnpm (推荐) 或 npm

### 安装依赖

```bash
# 使用 pnpm (推荐)
pnpm install

# 或使用 npm
npm install
```

### 开发模式

```bash
# 启动 Vue 开发服务器
pnpm run dev

# 启动带 Electron 的开发服务器
pnpm run electron:serve
```

### 构建和打包

```bash
# 构建 Vue 应用
pnpm run build

# 打包 Electron 应用
pnpm run electron:build
```

## 🛠️ Makefile 命令

项目提供了 Makefile 来简化常用操作：

```bash
# 查看所有可用命令
make help

# 安装依赖
make install

# 开发模式
make dev        # 仅 Vue 开发服务器
make serve      # Vue + Electron 开发服务器

# 构建打包
make build      # 构建应用
make package    # 打包 Electron 应用

# 工作流快捷命令
make dev-full   # 安装依赖 + 启动开发服务器
make prod       # 完整生产流程 (安装 + 构建 + 打包)
make rebuild    # 清理 + 构建 + 打包

# 清理构建文件
make clean
```

## 📁 项目结构

```
devtools/
├── src/                    # 源代码目录
│   ├── views/             # Vue 页面组件
│   │   ├── Home.vue       # 首页
│   │   ├── JsonParser.vue # JSON 解析器
│   │   ├── JsonCompress.vue # JSON 压缩工具
│   │   ├── QrGenerator.vue # 二维码生成器
│   │   └── TimestampTool.vue # 时间戳转换器
│   ├── router/            # 路由配置
│   ├── App.vue           # 根组件
│   └── main.js           # 应用入口
├── electron/             # Electron 主进程
│   ├── main.js          # 主进程文件
│   └── preload.js       # 预加载脚本
├── build/               # 构建资源
│   └── icon.icns       # 应用图标
├── dist/               # Vue 构建输出
├── dist_electron/      # Electron 打包输出
├── Makefile           # Make 命令配置
├── CLAUDE.md          # AI 助手指南
└── package.json       # 项目配置
```

## 🔧 技术栈

- **前端框架**: Vue 3 + Vue Router
- **构建工具**: Vite
- **桌面框架**: Electron
- **样式框架**: Tailwind CSS
- **包管理器**: pnpm
- **依赖库**:
  - `qrcode` - 二维码生成

## 📱 工具介绍

### JSON 解析器
- JSON 格式验证
- 代码格式化和美化
- 语法错误提示

### JSON 压缩/转义
- JSON 数据压缩
- 字符串转义和反转义
- 一键复制功能

### 二维码生成器
- 文本转二维码
- 支持多种尺寸
- 实时预览和下载

### Unix 时间戳转换器
- 时间戳转日期格式
- 日期转时间戳
- 多种时间格式支持

## 🎯 开发指南

### 添加新工具

1. 在 `src/views/` 目录下创建新的 Vue 组件
2. 在 `src/router/index.js` 中添加路由配置
3. 在 `src/App.vue` 的 `menuItems` 中添加菜单项

### 自定义样式

项目使用 Tailwind CSS，可以在组件中直接使用 Tailwind 类名，或在 `src/style.css` 中添加全局样式。

### Electron 配置

Electron 相关配置在 `package.json` 的 `build` 字段中，可以根据需要调整窗口大小、图标等设置。

## 🔨 构建配置

### 开发环境
- 热重载支持
- 开发者工具集成
- 本地开发服务器 (localhost:5173)

### 生产环境
- 代码压缩优化
- Electron 应用打包
- 支持 macOS dmg 打包

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📞 支持

如果你在使用过程中遇到问题，请在 Issues 中反馈。