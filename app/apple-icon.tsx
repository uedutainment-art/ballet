import { ImageResponse } from "next/og";

// 180×180 apple-touch-icon, used on iOS home-screen bookmarks.

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(135deg, #FDF8F3 0%, #F4ECDF 100%)",
          color: "#2C3E4A",
          fontFamily: "serif",
        }}
      >
        <div
          style={{
            fontSize: 64,
            fontWeight: 600,
            letterSpacing: "-0.04em",
            lineHeight: 1,
          }}
        >
          KB
        </div>
        <div
          style={{
            marginTop: 8,
            fontSize: 12,
            color: "#8A8579",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
          }}
        >
          BALLET
        </div>
      </div>
    ),
    { ...size },
  );
}
