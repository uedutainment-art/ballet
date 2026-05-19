import { ImageResponse } from "next/og";

// 1200×630 Open Graph card. Try to fetch a Korean serif at build time so we
// can render the hero tagline in 한글; if the fetch fails we fall back to a
// clean English layout that still reads as the brand.

export const alt = "K BALLET & CO. — 발레의 모든 정보, 한 곳에서.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function loadKoreanFont(): Promise<ArrayBuffer | null> {
  try {
    const resp = await fetch(
      "https://cdn.jsdelivr.net/npm/@fontsource/noto-serif-kr@5.1.1/files/noto-serif-kr-korean-700-normal.woff",
    );
    if (!resp.ok) return null;
    return await resp.arrayBuffer();
  } catch {
    return null;
  }
}

export default async function OG() {
  const fontData = await loadKoreanFont();
  const family = fontData ? "Noto Serif KR" : "serif";

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
          padding: "80px",
        }}
      >
        <div
          style={{
            fontSize: 22,
            color: "#8A8579",
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            marginBottom: 40,
          }}
        >
          K BALLET & CO.
        </div>
        <div
          style={{
            fontFamily: family,
            fontSize: 92,
            fontWeight: 500,
            color: "#2C3E4A",
            lineHeight: 1.2,
            textAlign: "center",
          }}
        >
          발레의 모든 정보,
        </div>
        <div
          style={{
            fontFamily: family,
            fontSize: 92,
            fontWeight: 500,
            fontStyle: "italic",
            color: "#C4A36B",
            lineHeight: 1.2,
            textAlign: "center",
          }}
        >
          한 곳에서.
        </div>
        <div
          style={{
            marginTop: 56,
            fontSize: 24,
            color: "#8A8579",
            display: "flex",
            gap: 16,
          }}
        >
          <span>콩쿠르</span>
          <span>·</span>
          <span>입시</span>
          <span>·</span>
          <span>공연</span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: fontData ?
        [
          {
            name: "Noto Serif KR",
            data: fontData,
            style: "normal",
            weight: 700,
          },
        ] :
        undefined,
    },
  );
}
