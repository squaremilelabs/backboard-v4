# Replacing App Icons

To replace the placeholder icons with your branded icons:

1. **Prepare your icon files**:
   - Create a square icon design (512x512 or larger)
   - Export as PNG with transparent or solid background
   - Ensure the icon works at small sizes (192x192)

2. **Generate required sizes**:
   - `icon-192.png` — 192x192 pixels
   - `icon-512.png` — 512x512 pixels

3. **Replace files**:
   - Overwrite `public/icons/icon-192.png`
   - Overwrite `public/icons/icon-512.png`

4. **Update manifest** (if needed):
   - Edit `app/manifest.ts` to add more icon sizes
   - Common sizes: 72, 96, 128, 144, 152, 384

5. **Clear cache and reinstall**:
   - Uninstall the PWA from your device
   - Clear browser cache
   - Rebuild the app: `pnpm build`
   - Reinstall the PWA to see new icons

## Optional: Favicon

Also consider updating `public/favicon.ico` to match your icon design.
