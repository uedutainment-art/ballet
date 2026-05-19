import { ImageResponse } from "next/og";

// 32×32 favicon, generated at build time. Drop a static `app/icon.png` next
// to this file to override (Next.js prefers static over generated).

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(135deg, #FDF8F3 0%, #F4ECDF 100%)",
          color: "#2C3E4A",
          fontFamily: "serif",
          fontSize: 18,
          fontWeight: 600,
          letterSpacing: "-0.04em",
        }}
      >
        KB
      </div>
    ),
    { ...size },
  );
}
