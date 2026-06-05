<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-21 | Updated: 2026-05-21 -->

# lib/utils

## Purpose
Pure utility helpers — no React, no Firebase, no DOM dependencies. Safe to
import from anywhere (server components, client components, Cloud Functions,
scripts).

## Key Files
| File | Description |
|------|-------------|
| `youtube.ts` | `extractYoutubeId()` (handles 6 URL formats + plain 11-char IDs), `getThumbnailUrl()`, `getEmbedUrl()`, `formatDuration(seconds)` |
| `relativeTimeKo.ts` | `relativeTimeKo(ts)` → "방금 전", "5분 전", "2시간 전", "3일 전", "2개월 전", or `yyyy-mm-dd` fallback for >12 months |

## For AI Agents

### Working In This Directory
- **Pure functions only** — no side effects, no async, no module-level state
- **Korean-locale strings** are intentional — these are user-facing copy.
  Don't translate to English even in fallback paths.
- **YouTube ID extraction** covers: `youtu.be/X`, `youtube.com/watch?v=X`,
  `youtube.com/shorts/X`, `youtube.com/embed/X`, `youtube.com/live/X`,
  bare 11-char ID. If you add a new format, add a test seed video too.
- **`formatDuration`** handles `5:23` AND `1:23:45` format strings; the
  AI extractor sometimes returns one or the other

### Testing Requirements
- Unit test these inline with seed scripts (no formal framework yet) —
  e.g. `console.log(extractYoutubeId("https://youtu.be/abc12345678"))`

### Common Patterns
- All exported as named functions, never default export
- Take strings/numbers, return strings/numbers — keep them serializable

## Dependencies

### Internal
- None

### External
- Node built-ins only (no third-party here)

<!-- MANUAL: -->
