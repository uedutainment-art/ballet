import Link from "next/link";
import Image from "next/image";
import {
  LEVEL_COLORS,
  LEVEL_LABELS,
  SERIES_LABELS,
  type Video,
} from "@/lib/types/video";
import { formatDuration, getThumbnailUrl } from "@/lib/utils/youtube";
import { cn } from "@/lib/cn";

type Props = {
  video: Video;
};

// Shorts (type === "short") use a 9:16 frame to match the source format.
// hqdefault.jpg still letterboxes short content with black bars top+bottom,
// so we render against bg-black and rely on object-cover to crop the bars
// out of the visible area — same trick used by YouTube's own grid.
export function VideoCard({ video: v }: Props) {
  const thumb = v.thumbnailUrl || getThumbnailUrl(v.youtubeId);
  const duration = formatDuration(v.durationSeconds);
  const isShort = v.type === "short";

  return (
    <Link
      href={`/videos/${v.id}`}
      className="group block border border-border rounded-md bg-white overflow-hidden transition-transform hover:-translate-y-px"
    >
      <div
        className={cn(
          "relative bg-black",
          isShort ? "aspect-[9/16]" : "aspect-video bg-cream-start/40",
        )}
      >
        <Image
          src={thumb}
          alt=""
          fill
          sizes={
            isShort
              ? "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
              : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          }
          className="object-cover"
        />
        {duration ? (
          <div className="absolute bottom-2 right-2 inline-flex items-center text-[10px] px-2 py-[3px] rounded-sm bg-ink/85 text-white font-mono">
            {duration}
          </div>
        ) : null}
        {isShort ? (
          <div className="absolute top-2 right-2 inline-flex items-center text-[10px] px-2 py-[3px] rounded-sm bg-red-600 text-white font-medium">
            쇼츠
          </div>
        ) : null}
        {v.level ? (
          <div
            className="absolute top-2 left-2 inline-flex items-center text-[10px] px-2 py-[3px] rounded-sm text-white font-medium tracking-wider"
            style={{ background: LEVEL_COLORS[v.level] }}
          >
            {LEVEL_LABELS[v.level]}
          </div>
        ) : null}
      </div>
      <div className="p-4">
        <div className="text-sm font-serif font-medium text-ink leading-snug line-clamp-2 min-h-[2.5em]">
          {v.title}
        </div>
        <div className="mt-2 flex items-baseline justify-between gap-2 text-[11px] text-warm-gray">
          <span className="truncate">
            {SERIES_LABELS[v.series]}
            {v.host ? <span className="mx-1">·</span> : null}
            {v.host ?? ""}
          </span>
          {v.viewCount ? (
            <span className="shrink-0">{v.viewCount.toLocaleString()}회</span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
