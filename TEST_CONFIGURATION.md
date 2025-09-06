# Test Configuration and Execution Guide

This document outlines the comprehensive testing strategy for the compression tool, including test execution, CI/CD integration, and validation criteria.

## Test Structure Overview

```
src/tests/
├── Unit Tests (Services)
│   ├── compressionService.test.js      ✅ Existing (to be fixed)
│   ├── encryptionService.test.js       ✅ Existing (to be fixed)  
│   ├── fileService.test.js             ✅ Existing
│   ├── browserFileService.test.js      🆕 New comprehensive
│   ├── errorHandlingService.test.js    🆕 New comprehensive
│   ├── notificationService.test.js     🆕 New comprehensive
│   ├── operationCancellationService.test.js  🆕 New comprehensive
│   └── progressTrackingService.test.js 🆕 New comprehensive
│
├── Component Tests (Vue)
│   ├── CompressTool.component.test.js  🆕 Integration tests
│   └── BackgroundOperationIndicator.component.test.js  🆕 Component tests
│
├── Specialized Test Suites
│   ├── performance.test.js             🆕 Large file performance (up to 2GB)
│   ├── security.test.js                🆕 Encryption security validation
│   ├── memory.test.js                  🆕 Memory usage validation (<500MB)
│   ├── successRate.test.js             🆕 99.9% success rate validation
│   └── userExperience.test.js          🆕 Complete user workflow tests
│
└── Configuration
    ├── vitest.config.js                🆕 Comprehensive test configuration
    └── test-setup.js                   🆕 Global test setup
```

## Test Categories and Execution

### 1. Unit Tests (Fast - ~2-5 minutes)
```bash
# Run all unit tests
npm run test:unit

# Run specific service tests  
npm run test src/tests/compressionService.test.js
npm run test src/tests/encryptionService.test.js
```

**Coverage Requirements:**
- All service functions: 100%
- Error paths: 95%
- Edge cases: 90%

### 2. Component Integration Tests (Medium - ~5-10 minutes)
```bash
# Run component tests
npm run test:components

# Run with UI feedback
npm run test:components -- --reporter=verbose
```

**Coverage Requirements:**
- Component interactions: 95%
- User workflows: 90%
- Accessibility features: 85%

### 3. Performance Tests (Slow - ~15-30 minutes)
```bash
# Run performance validation
npm run test:performance

# Skip large file tests in CI
npm run test:performance -- --skip-large-files
```

**Performance Criteria:**
- 100MB files: <10 seconds compression
- Memory usage: <500MB during operations
- Throughput: >10MB/s for fast compression

### 4. Security Tests (Medium - ~5-15 minutes)
```bash
# Run security validation
npm run test:security

# Include cryptographic compliance
npm run test:security -- --include-compliance
```

**Security Requirements:**
- AES-256-GCM encryption
- PBKDF2 >100,000 iterations
- Cryptographically secure random generation
- Side-channel attack resistance

### 5. Memory Validation Tests (Slow - ~20-45 minutes)
```bash
# Run memory usage validation
npm run test:memory

# Include leak detection
npm run test:memory -- --detect-leaks
```

**Memory Requirements:**
- Peak usage: <500MB absolute limit
- Memory leaks: <50MB growth over 500 operations
- Concurrent operations: Linear scaling prevention

### 6. Success Rate Tests (Very Slow - ~30-60 minutes)
```bash
# Run success rate validation
npm run test:success-rate

# Quick validation (reduced test count)
npm run test:success-rate -- --quick
```

**Success Rate Requirements:**
- Standard file types: 99.9% success rate
- Edge cases: >95% graceful handling
- Statistical significance: >1000 operations per test

### 7. User Experience Tests (Medium - ~10-15 minutes)
```bash
# Run UX workflow validation
npm run test:ux

# Include accessibility tests
npm run test:ux -- --include-a11y
```

**UX Requirements:**
- Complete workflows: 100% functional
- Accessibility: WCAG 2.1 AA compliance
- Mobile responsiveness: Full feature parity

## Test Execution Commands

Add these scripts to `package.json`:

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:unit": "vitest run src/tests/*Service.test.js",
    "test:components": "vitest run src/tests/*.component.test.js", 
    "test:performance": "vitest run src/tests/performance.test.js",
    "test:security": "vitest run src/tests/security.test.js",
    "test:memory": "vitest run src/tests/memory.test.js",
    "test:success-rate": "vitest run src/tests/successRate.test.js",
    "test:ux": "vitest run src/tests/userExperience.test.js",
    "test:coverage": "vitest run --coverage",
    "test:ci": "npm run test:unit && npm run test:components && npm run test:security",
    "test:full": "npm run test:ci && npm run test:performance && npm run test:memory && npm run test:success-rate && npm run test:ux"
  }
}
```

## Continuous Integration Configuration

### GitHub Actions Workflow (`.github/workflows/test.yml`):

```yaml
name: Comprehensive Testing

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    name: Unit & Component Tests
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - run: npm ci
      - run: npm run test:ci
      - run: npm run test:coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  security-tests:
    runs-on: ubuntu-latest
    name: Security Validation
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - run: npm ci
      - run: npm run test:security

  performance-tests:
    runs-on: ubuntu-latest
    name: Performance Tests
    if: github.event_name == 'push' # Only on push, not PRs
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - run: npm ci
      - run: npm run test:performance -- --skip-extra-large
      - run: npm run test:memory

  full-validation:
    runs-on: ubuntu-latest
    name: Complete Validation Suite
    if: github.ref == 'refs/heads/main' # Only on main branch
    timeout-minutes: 90
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - run: npm ci
      - run: npm run test:full
      
      - name: Generate test report
        run: |
          echo "## Test Results Summary" >> $GITHUB_STEP_SUMMARY
          echo "- Unit Tests: ✅" >> $GITHUB_STEP_SUMMARY
          echo "- Security Tests: ✅" >> $GITHUB_STEP_SUMMARY
          echo "- Performance Tests: ✅" >> $GITHUB_STEP_SUMMARY
          echo "- Memory Validation: ✅" >> $GITHUB_STEP_SUMMARY
          echo "- Success Rate: ✅" >> $GITHUB_STEP_SUMMARY
          echo "- User Experience: ✅" >> $GITHUB_STEP_SUMMARY
```

## Local Development Testing

### Pre-commit Hooks (`.husky/pre-commit`):
```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Run fast tests before commit
npm run test:unit
npm run test:components

# Run security tests for crypto changes
if git diff --cached --name-only | grep -E "(encryption|security|crypto)"; then
  npm run test:security
fi
```

### Development Workflow:
1. **During Development**: `npm run test -- --watch`
2. **Before Commit**: `npm run test:ci`  
3. **Before Release**: `npm run test:full`

## Test Configuration Files

### Enhanced `vitest.config.js`:
```javascript
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    globals: true,
    testTimeout: 30000,
    hookTimeout: 10000,
    teardownTimeout: 10000,
    
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true
      }
    },
    
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/tests/',
        'dist/',
        'electron/',
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 85,
          lines: 85,
          statements: 85
        }
      }
    },
    
    // Separate configurations for different test types
    workspace: [
      {
        test: {
          name: 'unit',
          include: ['src/tests/*Service.test.js'],
          testTimeout: 10000
        }
      },
      {
        test: {
          name: 'components',
          include: ['src/tests/*.component.test.js'],
          testTimeout: 15000
        }
      },
      {
        test: {
          name: 'performance',
          include: ['src/tests/performance.test.js'],
          testTimeout: 300000
        }
      },
      {
        test: {
          name: 'security',
          include: ['src/tests/security.test.js'],
          testTimeout: 60000
        }
      },
      {
        test: {
          name: 'memory',
          include: ['src/tests/memory.test.js'],
          testTimeout: 180000
        }
      },
      {
        test: {
          name: 'success-rate',
          include: ['src/tests/successRate.test.js'],
          testTimeout: 900000
        }
      }
    ]
  },
  
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
})
```

## Validation Criteria Summary

### ✅ Completion Requirements

| Test Category | Success Criteria |
|---------------|------------------|
| **Unit Tests** | 100% service coverage, all tests pass |
| **Integration** | All user workflows functional |
| **Performance** | 100MB in <10s, memory <500MB |
| **Security** | AES-256-GCM, PBKDF2 >100k iterations |
| **Memory** | No leaks, <500MB peak usage |
| **Success Rate** | 99.9% success for standard files |
| **UX** | Complete workflows, WCAG AA compliance |

### 📊 Test Metrics Dashboard

The test suite provides comprehensive metrics:
- **Code Coverage**: Minimum 85% overall
- **Performance Benchmarks**: Automated regression detection
- **Memory Profiling**: Leak detection and usage patterns
- **Success Rate Tracking**: Statistical analysis across file types
- **Security Compliance**: Cryptographic standard validation

## Troubleshooting Common Issues

### Memory Test Failures
```bash
# Increase Node.js memory limit
NODE_OPTIONS="--max_old_space_size=4096" npm run test:memory
```

### Performance Test Timeouts  
```bash
# Skip extra large file tests
npm run test:performance -- --skip-xlarge
```

### CI Resource Constraints
```bash
# Use reduced test sets for resource-limited environments
npm run test:ci -- --parallel=false
```

## Final Validation Checklist

Before deployment, ensure:

- [ ] All unit tests pass (100% services)
- [ ] Component integration tests pass
- [ ] Performance benchmarks met
- [ ] Security tests validate encryption
- [ ] Memory usage stays under 500MB
- [ ] Success rate achieves 99.9% for standard files
- [ ] User experience workflows complete successfully
- [ ] CI pipeline runs successfully
- [ ] Test coverage exceeds 85%
- [ ] No memory leaks detected