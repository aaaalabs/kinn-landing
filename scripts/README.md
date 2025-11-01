# PWA Screenshot Generator

## Usage

Generate PWA screenshots for the manifest.json file:

```bash
npm run screenshots
```

This will create two screenshots in the `public/` directory:
- `screenshot-wide.png` (1280x720) - Desktop/tablet landscape view
- `screenshot-narrow.png` (1080x1440) - Mobile portrait view @ 2x DPI

## Custom URL

To capture screenshots from a different URL (e.g., local development):

```bash
SCREENSHOT_URL=http://localhost:3000 npm run screenshots
```

## Technical Details

- **Tool**: Playwright with Chromium
- **Wide format**: 1280x720 viewport, 1x DPI
- **Narrow format**: 540x720 viewport, 2x DPI (results in 1080x1440 actual size)
- **Wait strategy**: Network idle + 1s buffer for animations

## Regenerating Screenshots

After any visual changes to the landing page:

1. Deploy changes to production
2. Run `npm run screenshots` to capture new screenshots
3. Commit the updated PNG files
4. Deploy again to update the PWA manifest

## Requirements

- Node.js 18+
- Playwright (automatically installed via `npm install`)
- Chromium browser (automatically installed via `npx playwright install chromium`)
