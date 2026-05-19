// Brand placeholder shown on first Vercel deploy.
// Inline styles only — Tailwind tokens / globals.css / font setup will land in T1.

export default function Home() {
  return (
    <main
      style={{
        display: 'flex',
        minHeight: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: 'linear-gradient(135deg, #FDF8F3 0%, #F4ECDF 100%)',
      }}
    >
      <div style={{ textAlign: 'center', maxWidth: 480 }}>
        <div
          style={{
            fontSize: 11,
            letterSpacing: '0.2em',
            color: '#8A8579',
            marginBottom: 16,
          }}
        >
          K BALLET &amp; CO.
        </div>
        <h1
          style={{
            fontSize: 36,
            fontWeight: 500,
            color: '#2C3E4A',
            margin: 0,
            fontFamily: "'Noto Serif KR', 'Times New Roman', serif",
            letterSpacing: '-0.01em',
            lineHeight: 1.35,
          }}
        >
          발레의 모든 정보,
        </h1>
        <h1
          style={{
            fontSize: 36,
            fontWeight: 500,
            color: '#C4A36B',
            margin: 0,
            fontFamily: "'Noto Serif KR', 'Times New Roman', serif",
            fontStyle: 'italic',
            letterSpacing: '-0.01em',
            lineHeight: 1.35,
          }}
        >
          한 곳에서.
        </h1>
        <p
          style={{
            marginTop: 16,
            fontSize: 13,
            color: '#8A8579',
            lineHeight: 1.6,
          }}
        >
          콩쿠르 · 입시 · 공연 정보를 매주 새로 정리해 드립니다
        </p>
        <p
          style={{
            marginTop: 32,
            fontSize: 11,
            color: '#B8B3A8',
            letterSpacing: '0.05em',
          }}
        >
          coming soon · 곧 만나요
        </p>
      </div>
    </main>
  );
}
