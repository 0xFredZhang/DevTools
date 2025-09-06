# DevTools - 开发者工具集

一个基于 Vue 3 + Electron 构建的桌面开发者工具应用，提供常用的开发工具，支持完全离线使用，注重隐私和性能。

## ✨ 功能特性

### 核心工具
- **JSON 解析器** - 实时 JSON 格式化、验证和美化，支持语法错误定位和历史记录
- **JSON 压缩/转义** - 单行压缩和转义/反转义，适合嵌入代码或配置文件
- **文件压缩工具** - ZIP 文件压缩/解压，支持 AES-256 加密、密码保护和进度跟踪
- **二维码生成器** - 文本转二维码，支持 PNG 下载，可用于分享链接、WiFi 密码等
- **Unix 时间戳转换器** - 时间戳与日期格式双向转换，支持多种格式和时区

### 系统特性
- **🔒 完全离线** - 所有功能本地运行，无需网络连接，数据不离开设备
- **🚀 高性能** - 原生应用性能，<100ms 响应时间，支持大文件处理
- **🌍 跨平台** - 支持 macOS（已测试）、Windows、Linux（计划中）
- **🔐 安全加密** - AES-256-GCM 加密算法，安全密码处理
- **📊 进度跟踪** - 后台操作实时进度显示，支持取消操作
- **🌐 国际化** - 支持中英文界面（部分完成）

## 🚀 快速开始

### 环境要求

- Node.js 20.0+
- pnpm 8.0+
- macOS 10.15+ / Windows 10+ / Linux Ubuntu 20.04+
- 4GB RAM（建议 8GB 以支持大文件处理）

### 安装依赖

```bash
# 安装依赖
pnpm install
```

### 开发模式

```bash
# 启动 Vue 开发服务器（仅 Web）
pnpm run dev

# 启动带 Electron 的开发服务器（推荐）
pnpm run electron:serve
```

### 测试

```bash
# 运行单元测试
pnpm run test

# 运行测试（监听模式）
pnpm run test:watch

# 测试覆盖率
pnpm run test:coverage
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
│   ├── views/             # Vue 页面组件（工具页面）
│   │   ├── Home.vue       # 首页导航
│   │   ├── JsonParser.vue # JSON 解析器
│   │   ├── JsonCompress.vue # JSON 压缩工具
│   │   ├── CompressTool.vue # 文件压缩工具
│   │   ├── QrGenerator.vue # 二维码生成器
│   │   └── TimestampTool.vue # 时间戳转换器
│   ├── components/        # 可复用组件
│   │   └── BackgroundOperationIndicator.vue # 后台操作指示器
│   ├── services/          # 业务逻辑服务
│   │   ├── compressionService.js # 压缩服务
│   │   ├── encryptionService.js # 加密服务
│   │   ├── fileService.js # 文件处理服务
│   │   ├── notificationService.js # 通知服务
│   │   └── progressTrackingService.js # 进度跟踪
│   ├── tests/            # 测试套件
│   │   ├── *.test.js    # 单元测试
│   │   └── *.component.test.js # 组件测试
│   ├── router/           # 路由配置
│   ├── App.vue          # 根组件
│   └── main.js          # 应用入口
├── electron/            # Electron 主进程
│   ├── main.js         # 主进程文件
│   └── preload.js      # 预加载脚本（安全 IPC）
├── .spec-workflow/     # 规范文档
│   └── steering/       # 项目指导文档
├── build/             # 构建资源
│   └── icon.icns     # 应用图标
├── dist/             # Vue 构建输出
├── dist_electron/    # Electron 打包输出
├── Makefile         # Make 命令配置
├── CLAUDE.md        # AI 助手指南
├── vitest.config.js # 测试配置
└── package.json     # 项目配置
```

## 🔧 技术栈

### 核心技术
- **前端框架**: Vue 3.4.21 + Vue Router 4.3.0 (Composition API)
- **构建工具**: Vite 5.1.4 (Lightning-fast HMR)
- **桌面框架**: Electron 29.0.1 (Chromium 122)
- **样式框架**: Tailwind CSS 3.4.1
- **包管理器**: pnpm 8.0+

### 主要依赖
- **压缩处理**: 
  - `jszip` 3.10.1 - ZIP 文件创建和解压
  - `yauzl`/`yazl` - 低级 ZIP 操作
- **加密安全**: 
  - `crypto-js` 4.2.0 - AES-256 加密
- **UI 组件**:
  - `qrcode` 1.5.3 - 二维码生成
- **测试框架**:
  - `vitest` 1.3.1 - 单元测试
  - `@vue/test-utils` - 组件测试

## 📱 工具介绍

### JSON 解析器
- 实时 JSON 格式验证和错误定位
- 代码格式化和美化（2/4 空格缩进）
- 语法错误提示（精确到行号）
- 操作历史记录功能
- 支持大型 JSON 文件处理

### JSON 压缩/转义
- JSON 数据单行压缩
- 字符串转义和反转义
- 适合嵌入代码或配置文件
- 一键复制功能
- 支持特殊字符处理

### 文件压缩工具 🆕
- ZIP 格式压缩和解压
- AES-256-GCM 加密保护
- 密码强度验证
- 实时进度跟踪（百分比、时间估算）
- 支持取消长时间操作
- 批量文件处理
- 最大支持 1GB 文件

### 二维码生成器
- 文本/URL 转二维码
- 支持多种尺寸（128-512px）
- 实时预览
- PNG 格式下载
- 支持 WiFi 密码、联系人等格式

### Unix 时间戳转换器
- 时间戳转日期格式
- 日期转时间戳
- 支持毫秒/秒精度
- 多种日期格式
- 本地时区自动识别

## 🎯 开发指南

### 项目架构原则
- **服务分离**: 业务逻辑封装在服务类中，UI 组件只处理界面逻辑
- **离线优先**: 所有功能本地运行，无外部依赖
- **安全设计**: 上下文隔离，安全的 IPC 通信
- **性能优化**: 流式处理大文件，避免内存溢出

### 添加新工具

1. 在 `src/views/` 目录下创建新的 Vue 组件
2. 在 `src/router/index.js` 中添加路由配置
3. 在 `src/views/Home.vue` 的工具列表中添加新工具
4. 如需业务逻辑，在 `src/services/` 下创建对应服务
5. 在 `src/tests/` 下添加单元测试

### 服务开发规范
- 使用 ES6 类定义服务
- 公开方法提供完整的 JSDoc 文档
- 错误处理要友好和具体
- 大文件操作需支持进度回调
- 敏感数据处理后及时清理内存

### 代码规范
- 使用 Vue 3 Composition API
- 组件使用 `<script setup>` 语法
- 样式使用 Tailwind CSS 类名
- 文件命名使用 PascalCase（组件）或 camelCase（服务）
- 测试文件以 `.test.js` 结尾

### 自定义样式

项目使用 Tailwind CSS，可以：
- 直接在组件中使用 Tailwind 类名
- 在 `src/style.css` 中添加全局样式
- 使用 `@apply` 指令创建自定义组件类

### Electron 配置

Electron 相关配置在 `package.json` 的 `build` 字段中：
- 窗口大小和行为设置
- 应用图标和元数据
- 打包目标平台
- 安全设置（contextIsolation、nodeIntegration）

## 🔨 构建配置

### 开发环境
- **Vite HMR**: 毫秒级热重载
- **Vue DevTools**: 组件调试支持
- **Electron DevTools**: Chrome DevTools 集成
- **本地服务器**: localhost:5173
- **并发进程**: Vite + Electron 同时运行

### 生产环境
- **代码分割**: 按需加载和 tree-shaking
- **资源优化**: 图片压缩、CSS 压缩
- **Electron 打包**: 
  - macOS: .dmg 安装包（已配置）
  - Windows: .exe 安装包（计划中）
  - Linux: .AppImage 通用包（计划中）
- **代码签名**: macOS 公证支持

### 测试环境
- **单元测试**: Vitest + jsdom 环境
- **组件测试**: @vue/test-utils 集成
- **测试分类**:
  - 服务层单元测试
  - 组件功能测试
  - 性能测试
  - 安全测试
  - 用户体验测试

## 🚀 性能特性

### 响应速度
- UI 交互 <50ms
- JSON 解析 <100ms (1MB 以内)
- 文件压缩支持进度跟踪
- 应用启动 <2s

### 内存管理
- 基础占用 <200MB
- 大文件流式处理
- 自动垃圾回收
- 敏感数据及时清理

### 安全保障
- AES-256-GCM 加密
- 上下文隔离
- 输入验证
- 路径遍历防护
- 无网络连接
- 零数据收集

## 📄 许可证

MIT License

## 🤝 贡献指南

### 开发流程
1. Fork 项目并创建功能分支
2. 使用 `pnpm install` 安装依赖
3. 开发新功能或修复 Bug
4. 运行 `pnpm run test` 确保测试通过
5. 提交代码并创建 Pull Request

### 代码贡献规范
- 遵循项目的代码风格和架构原则
- 为新功能添加相应的单元测试
- 更新相关文档和 README
- 提交信息使用规范格式（feat/fix/docs/test）

### 问题报告
- 使用 GitHub Issues 报告 Bug
- 提供详细的重现步骤
- 包含系统环境信息（OS、Node.js 版本等）
- 附上错误日志和截图

### 功能建议
- 在 Issues 中提出新功能建议
- 描述使用场景和期望行为
- 考虑是否符合"离线优先"原则

## 📞 支持

如果你在使用过程中遇到问题，请在 Issues 中反馈。