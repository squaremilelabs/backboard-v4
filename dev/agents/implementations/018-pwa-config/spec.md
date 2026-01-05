# PWA Configuration

| Field            | Value       |
| ---------------- | ----------- |
| **ID**           | 018         |
| **Status**       | 🟢 In Progress |
| **Progress**     | Step 3 of 10 complete |
| **Created**      | 2026-01-05  |
| **Last Updated** | 2026-01-05  |
| **Note**         | Updated for Next.js 16 PWA best practices |

---

## Overview

Configure Progressive Web App functionality to enable native-like installation and offline support on desktop and mobile devices.

---

## References

Read these before implementing:

| Topic                    | Source                                           |
| ------------------------ | ------------------------------------------------ |
| PWA Configuration        | `dev/specs/trd.md` §7                            |
| Tech Stack               | `dev/specs/trd.md` §2                            |
| Project Structure        | `dev/specs/trd.md` §10                           |
| Next.js Config           | `next.config.ts`                                 |
| Serwist Documentation    | https://serwist.pages.dev/docs/next              |
| Next.js PWA Guide        | https://nextjs.org/docs/app/guides/progressive-web-apps |

---

## Scope

### In Scope

- Install and configure `@serwist/next` package
- Create service worker file (`src/app/sw.ts`)
- Update Next.js config to integrate Serwist with security headers
- Create web app manifest (`app/manifest.ts` - TypeScript)
- Generate placeholder app icons (192x192, 512x512) with easy replacement instructions
- Create minimal offline fallback page
- Update root layout with PWA metadata (theme-color, apple-web-app)
- Configure security headers for service worker in Next.js config

### Out of Scope

- Custom splash screens (TRD marks as optional)
- PWA install prompts or update notifications UI
- Advanced caching strategies beyond defaults
- App icon design (placeholder only)
- Service worker analytics/monitoring
- Push notifications setup

---

## Dependencies

None - standalone implementation

---

## Files Created

Exact files this implementation will create or modify:

- [x] `next.config.ts` — Add Serwist plugin + security headers
- [x] `src/app/sw.ts` — Service worker with default caching
- [ ] `app/manifest.ts` — Web app manifest (TypeScript)
- [ ] `public/icons/icon-192.png` — Placeholder 192x192 icon
- [ ] `public/icons/icon-512.png` — Placeholder 512x512 icon
- [ ] `public/icons/ICON-REPLACEMENT.md` — Instructions for replacing icons
- [ ] `src/app/offline/page.tsx` — Minimal offline fallback page
- [ ] `src/app/layout.tsx` — Update with PWA metadata
- [x] `package.json` — Add @serwist/next and serwist dependencies

---

## Implementation Plan

### Step 1: Install Serwist dependencies ✅

**Do**: Add PWA packages to the project.

**Commands**:
```bash
pnpm add @serwist/next serwist
```

**Verify**:
- Packages appear in `package.json`
- `node_modules` updated successfully

---

### Step 2: Create service worker file ✅

**Do**: Create the service worker with default caching configuration from TRD §7.1.

**Create** `src/app/sw.ts`:

```typescript
import { defaultCache } from "@serwist/next/worker"
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist"
import { Serwist } from "serwist"

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: ServiceWorkerGlobalScope

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
})

serwist.addEventListeners()
```

**Verify**: File created at correct path, no syntax errors

---

### Step 3: Update Next.js config with Serwist and security headers ✅

**Do**: Integrate Serwist plugin and add security headers per Next.js PWA best practices.

**Modify** `next.config.ts`:

Add import at top:
```typescript
import withSerwistInit from "@serwist/next"
```

Wrap existing config with Serwist and add security headers:
```typescript
const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
})

export default withSerwist({
  // ...existing Next.js config...

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self'",
          },
        ],
      },
    ]
  },
})
```

**Verify**:
- Config file syntax is valid
- Security headers are properly configured for service worker
- Service worker will be generated on next build

---

### Step 4: Create placeholder app icons

**Do**: Generate simple placeholder icons for PWA installation.

**Commands**:
```bash
mkdir -p public/icons
```

Then create placeholder PNGs. Use ImageMagick or Node.js script:

```bash
# If ImageMagick available:
convert -size 192x192 xc:#1a1a1a -gravity center -pointsize 48 -fill white -annotate +0+0 "BB" public/icons/icon-192.png
convert -size 512x512 xc:#1a1a1a -gravity center -pointsize 128 -fill white -annotate +0+0 "BB" public/icons/icon-512.png
```

**Alternative (manual)**: Create solid color 192x192 and 512x512 PNGs with "BB" text using any image editor.

**Verify**:
- Files exist at `public/icons/icon-192.png` and `public/icons/icon-512.png`
- Images are correct dimensions

---

### Step 5: Create icon replacement instructions

**Do**: Add documentation for easy icon replacement later.

**Create** `public/icons/ICON-REPLACEMENT.md`:

```markdown
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
```

**Verify**: File created with clear instructions

---

### Step 6: Create web app manifest (TypeScript)

**Do**: Create `app/manifest.ts` per Next.js 16 best practices (type-safe manifest).

**Create** `app/manifest.ts`:

```typescript
import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Backboard",
    short_name: "Backboard",
    description: "Task management for what's current",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#1a1a1a",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any maskable",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
    ],
  }
}
```

**Verify**:
- No TypeScript errors
- File is at `app/manifest.ts` (Next.js auto-discovers it)
- All icon paths match created files

---

### Step 7: Create offline fallback page

**Do**: Create a minimal offline page for when the user has no connection.

**Create** `src/app/offline/page.tsx`:

```typescript
export default function OfflinePage() {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-background px-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold">You're Offline</h1>
        <p className="mt-2 text-muted-foreground">
          Backboard is a local-first app, but some features require an internet connection.
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          Check your connection and try again.
        </p>
      </div>
      <button
        onClick={() => window.location.reload()}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Retry
      </button>
    </div>
  )
}
```

**Verify**:
- No TypeScript errors
- Page renders correctly

---

### Step 8: Update root layout with PWA metadata

**Do**: Add PWA meta tags to enable installation (manifest auto-discovered by Next.js).

**Modify** `src/app/layout.tsx`:

Update or add to the `metadata` export:

```typescript
export const metadata = {
  // ...existing metadata...
  themeColor: "#1a1a1a",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Backboard",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
}
```

**Note**: Next.js 16 auto-discovers `app/manifest.ts`, so no manual `<link rel="manifest">` needed. If `metadata` already exists, merge these properties.

**Verify**:
- No TypeScript errors
- Metadata properly exported

---

### Step 9: Build and test PWA functionality

**Do**: Build the app and verify PWA features are working.

**Commands**:
```bash
# Production build and test
pnpm build
pnpm start

# OR for local HTTPS testing (required for iOS PWA testing):
pnpm dev --experimental-https
```

**Note**: HTTPS is required for PWA features (except localhost). Use `--experimental-https` flag for local testing on mobile devices.

**Manual Testing Checklist**:

**Desktop (Chrome/Edge)**:
- [ ] Open app in browser (`http://localhost:3000`)
- [ ] Check DevTools > Application > Manifest (should show manifest data)
- [ ] Check DevTools > Application > Service Workers (sw.js should be registered)
- [ ] Verify security headers in Network tab (sw.js should have Cache-Control: no-cache)
- [ ] Look for install icon in address bar (⊕ or install prompt)
- [ ] Click install → app opens in standalone window
- [ ] Verify app icons appear in installed app window/taskbar

**Mobile (iOS Safari)**:
- [ ] Use HTTPS (deploy or `pnpm dev --experimental-https` + ngrok)
- [ ] Open app in Safari
- [ ] Tap Share button → "Add to Home Screen"
- [ ] Verify app name is "Backboard"
- [ ] Verify icon appears on home screen
- [ ] Launch from home screen → opens in standalone mode (no browser UI)
- [ ] Verify status bar style matches configuration

**Mobile (Android Chrome)**:
- [ ] Open app in Chrome
- [ ] Look for "Install app" banner or menu option
- [ ] Install the app
- [ ] Verify icon on home screen
- [ ] Launch → standalone mode
- [ ] Verify theme color in status bar

**Offline Test**:
- [ ] Open installed app
- [ ] Navigate to a few pages
- [ ] Turn off internet/wifi
- [ ] Reload app → should still work (cached)
- [ ] Try to navigate to uncached route → offline page should appear
- [ ] Turn internet back on and retry

**Verify**: All manual tests pass, app feels native on both platforms

---

### Step 10: Add PWA setup notes to project

**Do**: Document the PWA setup for future reference (optional but recommended).

**Create** `dev/agents/implementations/018-pwa-config/NOTES.md`:

```markdown
# PWA Setup Notes

## What Was Configured

- **Service Worker**: `src/app/sw.ts` with Serwist (builds to `public/sw.js`)
- **Manifest**: `app/manifest.ts` (TypeScript, auto-discovered by Next.js)
- **Icons**: Placeholder icons in `public/icons/` (192x192, 512x512)
- **Offline Page**: `src/app/offline/page.tsx`
- **Layout**: PWA meta tags in root layout
- **Security Headers**: Service worker headers in `next.config.ts`

## How to Update Icons

See `public/icons/ICON-REPLACEMENT.md` for detailed instructions.

## Testing PWA Installation

### Desktop
1. Build and run: `pnpm build && pnpm start`
2. Open in Chrome/Edge
3. Click install icon in address bar

### iOS
1. Requires HTTPS: Deploy or use `pnpm dev --experimental-https` + ngrok
2. Open in Safari
3. Share → Add to Home Screen

### Android
1. Deploy to production or use HTTPS
2. Open in Chrome
3. Install app banner or menu

## Troubleshooting

- **Manifest not loading**: Check DevTools > Application > Manifest, ensure `app/manifest.ts` exports correctly
- **Service worker not registering**: Check HTTPS (required except localhost). Use `pnpm dev --experimental-https` for local mobile testing
- **Icons not showing**: Verify file paths in manifest match actual files in `public/icons/`
- **Install prompt not appearing**: Ensure HTTPS, valid manifest, and service worker registered
- **Security headers missing**: Check Network tab for sw.js, should see `Cache-Control: no-cache`

## Future Enhancements

- Custom splash screens
- Install prompt UI with custom trigger
- Update notifications when new version available
- Advanced caching strategies for offline-first features
```

**Verify**: Documentation created for future reference

---

## Notes

- **HTTPS Required**: PWA features require HTTPS (localhost exception). Use `pnpm dev --experimental-https` for local mobile testing
- **Next.js 16 Specifics**:
  - Manifest at `app/manifest.ts` (TypeScript, type-safe)
  - Auto-discovered by Next.js (no manual linking needed)
  - Security headers configured in `next.config.ts`
- **Platform Support**: iOS Safari has limited PWA support compared to Android Chrome
- **Service Worker**: Generated during build from `src/app/sw.ts` to `public/sw.js`
- **Caching**: Service worker uses `Cache-Control: no-cache` to ensure users get updates
- **Icons**: Use "any maskable" purpose for better compatibility across platforms
- **Theme**: Theme color set to `#1a1a1a` (dark) - adjust if design changes
