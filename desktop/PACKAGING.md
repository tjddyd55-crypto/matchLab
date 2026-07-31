# MATCHON Manager — desktop packaging notes

## Icons

Source of truth for the app mark is the same brand SVG as the web header logo:

- `public/favicon.svg` (MATCHON hex mark, `#0A47FF`)

Generate Windows assets:

```bash
npm --prefix desktop run icons
```

Outputs:

- `desktop/assets/icon.ico` (16/24/32/48/64/128/256)
- `desktop/assets/icon.png` (256)
- `desktop/assets/icon-{size}.png`

Do **not** overwrite these with `public/icon.png` (32px favicon).

## Package / installer

```bash
npm run desktop:build
npm run desktop:package        # NSIS + unpacked
npm run desktop:package:nsis   # NSIS only
```

Artifacts under `desktop/out-pc2/` (or configured `directories.output`):

- `MATCHON-Manager-Setup-1.0.0.exe`
- `win-unpacked/`

## Code signing (optional)

Build does **not** require a certificate. When ready:

- Set `CSC_LINK` (pfx/p12 path or base64) and `CSC_KEY_PASSWORD`
- Or configure `win.certificateFile` / `win.certificatePassword` in `package.json` build section
- Keep `forceCodeSigning` unset/false until a real cert exists

## Auto-update (optional)

`electron/auto-update.ts` is a disabled stub by default.

To enable later:

1. Add `electron-updater` dependency
2. Set `MATCHON_DESKTOP_AUTO_UPDATE=1`
3. Set feed URL via env / publish config
4. Wire `initAutoUpdate()` implementation
