#!/usr/bin/env python3
"""
Script to generate app icons and favicons from SVG logo
Requires: pip install cairosvg pillow
"""

import os
import sys
from pathlib import Path

def generate_icons():
    try:
        import cairosvg
        from PIL import Image
    except ImportError:
        print("Required packages not found. Please install them:")
        print("pip install cairosvg pillow")
        return False
    
    # Define sizes needed
    sizes = {
        # macOS app icon sizes
        'icon_16x16.png': 16,
        'icon_32x32.png': 32,
        'icon_128x128.png': 128,
        'icon_256x256.png': 256,
        'icon_512x512.png': 512,
        'icon_1024x1024.png': 1024,
        
        # Web favicon sizes
        'favicon-16x16.png': 16,
        'favicon-32x32.png': 32,
        'favicon-96x96.png': 96,
        'favicon-192x192.png': 192,
        'apple-touch-icon.png': 180,
    }
    
    svg_file = Path('logo.svg')
    if not svg_file.exists():
        print(f"SVG file {svg_file} not found!")
        return False
    
    print("Generating icons...")
    
    for filename, size in sizes.items():
        print(f"  {filename} ({size}x{size})")
        
        # Convert SVG to PNG at specified size
        png_data = cairosvg.svg2png(
            url=str(svg_file),
            output_width=size,
            output_height=size
        )
        
        # Save PNG
        with open(filename, 'wb') as f:
            f.write(png_data)
    
    # Generate .ico file for Windows
    print("  favicon.ico")
    ico_sizes = [16, 32, 48, 64]
    ico_images = []
    
    for size in ico_sizes:
        png_data = cairosvg.svg2png(
            url=str(svg_file),
            output_width=size,
            output_height=size
        )
        img = Image.open(io.BytesIO(png_data))
        ico_images.append(img)
    
    # Save ICO file
    ico_images[0].save('favicon.ico', format='ICO', sizes=[(img.width, img.height) for img in ico_images])
    
    # Generate ICNS file for macOS
    print("  icon.icns (replacing existing)")
    icns_sizes = [16, 32, 128, 256, 512, 1024]
    icns_images = []
    
    for size in icns_sizes:
        png_data = cairosvg.svg2png(
            url=str(svg_file),
            output_width=size,
            output_height=size
        )
        with open(f'icon_{size}x{size}.png', 'wb') as f:
            f.write(png_data)
    
    print("\nIcons generated successfully!")
    print("\nTo create ICNS file for macOS:")
    print("1. Create an iconset folder: mkdir icon.iconset")
    print("2. Copy PNG files with proper names:")
    print("   cp icon_16x16.png icon.iconset/icon_16x16.png")
    print("   cp icon_32x32.png icon.iconset/icon_16x16@2x.png")
    print("   cp icon_32x32.png icon.iconset/icon_32x32.png")
    print("   cp icon_128x128.png icon.iconset/icon_32x32@2x.png")
    print("   cp icon_128x128.png icon.iconset/icon_128x128.png")
    print("   cp icon_256x256.png icon.iconset/icon_128x128@2x.png")
    print("   cp icon_256x256.png icon.iconset/icon_256x256.png")
    print("   cp icon_512x512.png icon.iconset/icon_256x256@2x.png")
    print("   cp icon_512x512.png icon.iconset/icon_512x512.png")
    print("   cp icon_1024x1024.png icon.iconset/icon_512x512@2x.png")
    print("3. Generate ICNS: iconutil -c icns icon.iconset")
    
    return True

if __name__ == '__main__':
    if not generate_icons():
        sys.exit(1)