# PWA Setup Notes

## What Was Configured

- **Service Worker**: `src/app/sw.ts` with Serwist (builds to `public/sw.js`)
- **Manifest**: `src/app/manifest.ts` (TypeScript, auto-discovered by Next.js)
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

- **Manifest not loading**: Check DevTools > Application > Manifest, ensure `src/app/manifest.ts` exports correctly
- **Service worker not registering**: Check HTTPS (required except localhost). Use `pnpm dev --experimental-https` for local mobile testing
- **Icons not showing**: Verify file paths in manifest match actual files in `public/icons/`
- **Install prompt not appearing**: Ensure HTTPS, valid manifest, and service worker registered
- **Security headers missing**: Check Network tab for sw.js, should see `Cache-Control: no-cache`

## Future Enhancements

- Custom splash screens
- Install prompt UI with custom trigger
- Update notifications when new version available
- Advanced caching strategies for offline-first features
