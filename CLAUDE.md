# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Status

DevTools - A developer toolset desktop application built with Vue 3 + Electron.

## Commands

```bash
# Install dependencies
pnpm install

# Run development server with Electron
pnpm run electron:serve

# Build for production
pnpm run build

# Build and package Electron app for macOS
pnpm run electron:build

# Run Vue dev server only
pnpm run dev
```

## Architecture

- **Frontend**: Vue 3 + Vite + Vue Router
- **Desktop**: Electron
- **Styling**: TailwindCSS
- **Tools**:
  - JSON Parser (formatting and validation)
  - JSON Compress/Escape utilities
  - QR Code Generator
  - Unix Timestamp Converter

All tools are designed to work completely offline.