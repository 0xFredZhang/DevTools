# DevTools Makefile
# A developer toolset desktop application built with Vue 3 + Electron

.PHONY: help install dev build serve package clean dist

# Default target
help:
	@echo "DevTools - Available commands:"
	@echo ""
	@echo "  make install    - Install all dependencies"
	@echo "  make dev        - Run Vue development server only"
	@echo "  make serve      - Run development server with Electron"
	@echo "  make build      - Build Vue app for production"
	@echo "  make package    - Build and package Electron app for macOS"
	@echo "  make dist       - Package Electron app (alternative)"
	@echo "  make clean      - Clean build artifacts"
	@echo "  make electron   - Run Electron with current build"
	@echo ""

# Install dependencies
install:
	@echo "Installing dependencies..."
	pnpm install

# Run Vue development server only
dev:
	@echo "Starting Vue development server..."
	pnpm run dev

# Run development server with Electron
serve:
	@echo "Starting development server with Electron..."
	pnpm run electron:serve

# Build Vue app for production
build:
	@echo "Building Vue app for production..."
	pnpm run build

# Build and package Electron app for macOS
package:
	@echo "Building and packaging Electron app..."
	pnpm run electron:build

# Alternative packaging command
dist:
	@echo "Packaging Electron app..."
	pnpm run dist

# Run Electron with current build
electron:
	@echo "Running Electron..."
	pnpm run electron

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	rm -rf dist/
	rm -rf dist_electron/
	rm -rf node_modules/.vite/
	@echo "Clean complete!"

# Development workflow shortcuts
dev-full: install serve

# Production workflow
prod: install build package

# Quick rebuild and package
rebuild: clean build package