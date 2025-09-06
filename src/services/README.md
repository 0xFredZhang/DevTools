# Service Architecture Documentation

## Overview

The compress tool services are designed as a modular architecture using Node.js built-in modules only, following the existing DevTools project patterns. All services are implemented as singleton instances and export their functionality through a common interface.

## Directory Structure

```
src/services/
├── compressionService.js    # Data/file compression using zlib
├── encryptionService.js     # Data/file encryption using crypto
└── fileService.js          # File system operations using fs/path
```

## Service Dependencies

### Module Dependencies

All services use **Node.js built-in modules only**:

- **zlib**: Compression operations (gzip, deflate, brotli)
- **crypto**: Encryption/decryption, hashing, key derivation
- **fs**: File system operations (read, write, stat)
- **path**: Path manipulation utilities

### Inter-Service Dependencies

```
fileService (base layer)
    ↑
    ├── compressionService (depends on fileService for I/O)
    └── encryptionService (depends on fileService for I/O)
```

### Electron IPC Integration

File operations are exposed to the renderer process through IPC channels:

- `file:select` - Open file dialog
- `file:save-as` - Save file dialog  
- `file:read` - Read file content
- `file:write` - Write file content
- `file:stat` - Get file statistics
- `file:exists` - Check file existence

## Service Interfaces

### CompressionService

**Purpose**: Handle data and file compression operations
**Main Methods**:
- `compressData(data, format, level)` - Compress data
- `decompressData(data, format)` - Decompress data
- `compressFile(input, output, format, level)` - Compress file
- `decompressFile(input, output, format)` - Decompress file
- `getCompressionEstimate(data, format)` - Estimate compression ratio

**Supported Formats**: gzip, deflate, brotli

### EncryptionService

**Purpose**: Handle data and file encryption operations
**Main Methods**:
- `encryptData(data, password, algorithm)` - Encrypt data
- `decryptData(data, password, salt, iv, tag, algorithm)` - Decrypt data
- `encryptFile(input, output, password, algorithm)` - Encrypt file
- `decryptFile(input, output, password)` - Decrypt file
- `generateSecurePassword(length, includeSpecial)` - Generate passwords

**Supported Algorithms**: aes-256-gcm, aes-256-cbc, aes-192-gcm, aes-128-gcm

### FileService

**Purpose**: Handle file system operations and validation
**Main Methods**:
- `readFile(path)` - Read file as buffer
- `writeFile(path, data)` - Write buffer to file
- `getFileMetadata(path)` - Get file statistics
- `validateFile(path)` - Validate file accessibility
- `generateOutputPath(input, operation, format)` - Generate output paths

**Supported Extensions**: .gz, .zip, .br, .txt, .json, .csv, .log
**Size Limit**: 100MB per file

## Error Handling Strategy

Following the project's error handling philosophy:

- **Fail fast**: Critical validation (file access, module availability)
- **Log and continue**: Optional features (metadata extraction)
- **Graceful degradation**: When external services unavailable
- **User-friendly messages**: Through service response objects

## Security Considerations

1. **File Path Validation**: All paths validated before operations
2. **Size Limits**: 100MB limit to prevent memory issues
3. **Extension Filtering**: Only supported file types allowed
4. **Secure Defaults**: Strong encryption algorithms by default
5. **Memory Management**: Buffers cleared after operations

## Testing Strategy

Each service will include comprehensive tests:
- Unit tests for all public methods
- Integration tests for file operations
- Security tests for encryption/decryption
- Performance tests for large files
- Error handling validation

## Implementation Notes

1. All services export singleton instances using `module.exports = new ServiceClass()`
2. Methods return Promise-based APIs for consistency
3. Configuration uses sensible defaults with override options
4. Services are designed to work offline without external dependencies
5. Error responses include structured information for UI feedback

## Next Steps

This foundation enables implementation of:
- Issue #3: Core compression functionality
- Issue #4: File encryption capabilities  
- Issue #5: User interface components
- Issue #6: Integration testing and validation