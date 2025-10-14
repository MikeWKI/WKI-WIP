# Favicon Setup Guide

## Quick Setup

You need to add a `favicon.ico` file to the `/public` folder.

### Option 1: Use an Online Generator

1. Go to [Favicon.io](https://favicon.io/favicon-converter/) or [RealFaviconGenerator](https://realfavicongenerator.net/)
2. Upload a Kenworth logo or WKI logo image
3. Download the generated `favicon.ico`
4. Place it in: `c:\Users\michaela\Downloads\repair-order-app\public\favicon.ico`

### Option 2: Create from Text

1. Go to [Favicon.io Text Generator](https://favicon.io/favicon-generator/)
2. Settings:
   - Text: `WKI`
   - Background: `#1e3a8a` (blue)
   - Font: Roboto Bold
   - Font Size: 80
   - Font Color: `#ffffff` (white)
3. Download and extract
4. Copy `favicon.ico` to `/public` folder

### Option 3: Use Windows Paint (Quick & Dirty)

1. Create a small image (32x32 or 64x64 pixels)
2. Add "WKI" text or logo
3. Save as PNG
4. Rename to `favicon.ico`
5. Place in `/public` folder

### Current Status

The HTML is already configured to use `/favicon.ico`:
```html
<link rel="icon" type="image/x-icon" href="/favicon.ico" />
```

Once you add the file, it will automatically appear in browser tabs!

## What It Does

- Shows in browser tabs
- Shows in bookmarks
- Shows in browser history
- Displays as "WKI-WIP" with your icon
