# DevTools Logo

## Files Created

- `logo.svg` - Main logo in SVG format (scalable vector)
- `generate_icons.py` - Python script to generate all needed icon sizes

## Logo Design

The logo features:
- Modern gradient background in purple/blue tones
- Simulated app window with macOS-style controls
- Grid of 6 colorful tool icons representing different DevTools features:
  - JSON parser (`{}` symbol)
  - QR code generator (QR pattern)
  - Timestamp converter (clock icon)
  - JSON compress (compression arrows)
  - Code tools (code brackets)
  - Settings (gear icon)

## Usage

### For macOS App Icon

The current `icon.icns` in the build folder will be replaced. To generate a new one:

1. **Option 1: Use the Python script** (Recommended)
   ```bash
   cd build
   pip install cairosvg pillow
   python3 generate_icons.py
   ```

2. **Option 2: Manual conversion**
   - Use online SVG to PNG converters to create these sizes:
     - 16x16, 32x32, 128x128, 256x256, 512x512, 1024x1024
   - Use online PNG to ICNS converter or macOS `iconutil`

### For Web Favicon

Generate these sizes from the SVG:
- `favicon-16x16.png`
- `favicon-32x32.png` 
- `favicon.ico`

Add to your HTML:
```html
<link rel="icon" type="image/png" sizes="32x32" href="favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="favicon-16x16.png">
<link rel="shortcut icon" href="favicon.ico">
```

## Quick Online Conversion

If you don't want to install Python packages:

1. Upload `logo.svg` to https://convertio.co/svg-png/
2. Generate PNG files at these sizes: 16, 32, 128, 256, 512, 1024
3. Upload the 512x512 PNG to https://convertio.co/png-icns/ to create `icon.icns`
4. Replace the current `build/icon.icns` file

## Colors Used

- Primary gradient: `#667eea` to `#764ba2`
- JSON: Orange (`#f59e0b`)
- QR Code: Green (`#10b981`) 
- Clock: Blue (`#3b82f6`)
- Compress: Red (`#ef4444`)
- Code: Purple (`#8b5cf6`)
- Settings: Gray (`#6b7280`)