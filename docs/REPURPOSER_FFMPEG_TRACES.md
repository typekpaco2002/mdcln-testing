# Photo/Video Repurposer: Avoiding FFmpeg Traces

## Vercel / serverless (no ffmpeg binary)

On Vercel (and when no system ffmpeg is available), the repurposer uses **@ffmpeg/ffmpeg (WASM)** so no binary install is needed. The server loads the core from CDN and runs ffmpeg in WebAssembly. This is slower and has memory limits (~500MB) — fine for short clips; for long videos use a backend with native ffmpeg (e.g. Railway, Render). `vercel.json` excludes `ffmpeg-static` / `@ffmpeg-installer` to stay under bundle size; `@ffmpeg/ffmpeg` and `@ffmpeg/util` are included for WASM.

## Why it matters

Repurposers use FFmpeg for encoding, filters, and metadata. By default FFmpeg writes encoder strings like `Lavf59.x.x` and codec metadata that identify the tool. Phone cameras and native apps write different metadata (e.g. "Apple iPhone", "Samsung Galaxy"). Platforms can use these fingerprints for deduplication or trust.

**Goal:** Make output MediaInfo/atoms look like a device recording (iPhone, Android, etc.), not like FFmpeg, DaVinci, CapCut, or Premiere.

## What we do

1. **Encoder metadata**  
   Every repurpose path (server FFmpeg, client ffmpeg.wasm, n8n command) sets:
   - `-metadata:s:v encoder=<device string>`  
   so the container stores a device name (e.g. "Apple iPhone 16 Pro", "Samsung Galaxy S25 Ultra") instead of Lavf.

2. **Metadata instruction**  
   `buildMetadataInstruction()` and the prepare-browser API return `encoder` (and `comment`, `creationTime`, `gps`) so the client and any external pipeline use the same device-like values.

3. **Server-side encoder fingerprint**  
   When "Encoder Fingerprint" is enabled, the server also sets:
   - `handler_name` (e.g. "VideoHandler", "Core Media Video")
   - `comment`, `creation_time`
   - Profile/level and color metadata typical of device encoders

4. **Exiftool (server)**  
   After FFmpeg, we run exiftool to write Make, Model, Software, LensModel, etc. from iPhone/Android profiles so EXIF/QuickTime tags match a real device.

5. **Byte-level scrubbing**  
   After FFmpeg (and exiftool on server), we open the file in RAM, search for FFmpeg/Lavf/Lavc/libx264/libx265 signatures in the raw bytes, and overwrite them with device-like strings (**same byte length**) so atoms/HEX no longer expose encoder tooling. Implemented in:
   - **Server:** `src/repurposer/services/encoderScrubber.js` → `scrubEncoderSignaturesInFile()`; called after `applyMetadata()` in `processVideoBatch` and `processImageBatch`.
   - **Client:** `client/src/utils/encoderScrubber.js` → `scrubEncoderSignatures()`; called in `repurposeFfmpegWasm.js` on the output buffer before creating the Blob.
   - Replacements (same-length): `FFmpeg` → `iPhone`, `libx264`/`libx265` → `Apple H`, `Lavf`/`Lavc` prefix + version → `Apple iPhone 14` (14 bytes). File size is unchanged.

## Where encoder is set

| Path              | Location |
|-------------------|----------|
| Server video      | `video-repurpose.service.js` → `buildFfmpegCommand()` → `-metadata:s:v encoder=...` (and encoder_fingerprint options) |
| Server image      | Exiftool only (no stream encoder in JPEG) |
| Client (browser)  | `repurposeFfmpegWasm.js` → `getMetadataArgs(instruction, isImage)` → `-metadata:s:v encoder=...` for video |
| n8n / external    | Disabled (dead code). Metadata is always applied by our app (server or client), not by N8N. |

## ENCODER_STRINGS

Defined in `src/services/video-repurpose.service.js`: device names such as "Apple iPhone 16 Pro", "Samsung Galaxy S25 Ultra", "Google Pixel 9 Pro", "DJI Osmo Action 5", "GoPro HERO13", etc. Used for both server and `buildMetadataInstruction()` (so the client gets the same list via the API).
