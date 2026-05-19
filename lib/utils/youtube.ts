// YouTube URL → ID extraction supporting the common formats:
//   https://youtu.be/{id}
//   https://www.youtube.com/watch?v={id}
//   https://m.youtube.com/watch?v={id}
//   https://www.youtube.com/shorts/{id}
//   https://www.youtube.com/embed/{id}
//   https://www.youtube.com/live/{id}
//   Plain 11-character IDs are also accepted.

const ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

export function extractYoutubeId(input: string | null | undefined): string | null {
  if (!input) return null;
  const raw = input.trim();
  if (!raw) return null;
  if (ID_PATTERN.test(raw)) return raw;
  try {
    const url = new URL(raw);
    const host = url.hostname.replace(/^www\.|^m\./, "");
    if (host === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id && ID_PATTERN.test(id) ? id : null;
    }
    if (host === "youtube.com" || host === "youtube-nocookie.com") {
      const v = url.searchParams.get("v");
      if (v && ID_PATTERN.test(v)) return v;
      const parts = url.pathname.split("/").filter(Boolean);
      if (parts.length >= 2) {
        const [kind, id] = parts;
        if (
          (kind === "shorts" ||
            kind === "embed" ||
            kind === "live" ||
            kind === "v") &&
          ID_PATTERN.test(id)
        ) {
          return id;
        }
      }
    }
  } catch {
    // Not a valid URL — fall through.
  }
  return null;
}

export function getThumbnailUrl(id: string): string {
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
}

export function getEmbedUrl(id: string): string {
  return `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1`;
}

export function formatDuration(seconds: number | undefined): string {
  if (!seconds || !Number.isFinite(seconds) || seconds <= 0) return "";
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(h > 0 ? 2 : 1, "0");
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
