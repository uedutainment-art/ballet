import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "개인정보 처리방침 — K BALLET & CO.",
  description:
    "K BALLET이 수집·이용하는 개인정보의 종류, 보유 기간, 제3자 제공 여부, 이용자 권리에 대한 안내.",
};

// Last revision date — bump this when changing the policy substantively.
const REVISED = "2026-05-21";
const CONTACT_EMAIL = "uedutainment@gmail.com";

export default function PrivacyPage() {
  return (
    <article className="px-6 py-12">
      <div className="mx-auto max-w-3xl space-y-8">
        <header>
          <h1 className="text-2xl md:text-3xl font-serif font-medium text-ink leading-tight">
            개인정보 처리방침
          </h1>
          <p className="mt-3 text-xs text-warm-gray">
            최종 개정일: {REVISED}
          </p>
        </header>

        <Section title="1. 수집하는 개인정보 항목과 수집 방법">
          <p>
            K BALLET &amp; CO. (이하 &ldquo;서비스&rdquo;)는 아래 항목을 수집합니다.
          </p>
          <List>
            <li>
              <strong>제보·문의 폼 (/contact)</strong>: 제목, 내용, 첨부 파일,
              이메일(선택), 접속 시점의 IP 주소 해시, 브라우저 정보
            </li>
            <li>
              <strong>익명 자료 제출 (/submit)</strong>: 포스터·PDF 파일, 이메일(선택)
            </li>
            <li>
              <strong>운영자 로그인 (/admin)</strong>: 이메일, 표시 이름, 권한 등급.
              구글 계정 로그인 시 구글이 제공하는 프로필 정보
            </li>
          </List>
          <p>
            이용자가 직접 입력하거나 업로드하는 경우에만 수집하며, 자동 추적 도구
            (이벤트 로깅, 광고 픽셀 등)는 사용하지 않습니다.
          </p>
        </Section>

        <Section title="2. 수집·이용 목적">
          <List>
            <li>제보 내용 확인 및 답신</li>
            <li>익명 자료 검수 및 사이트 콘텐츠 등록</li>
            <li>운영자 권한 관리 및 변경 이력 추적</li>
            <li>스팸·악용 방지를 위한 IP 기반 횟수 제한</li>
          </List>
        </Section>

        <Section title="3. 보유 및 이용 기간">
          <p>
            제보·문의·제출 자료는 처리 완료 후 <strong>12개월</strong> 보관 후
            파기합니다. 운영자 계정은 권한이 회수된 시점까지 보관됩니다.
            관계 법령에서 별도 보관을 요구하는 경우 해당 기간을 따릅니다.
          </p>
        </Section>

        <Section title="4. 제3자 제공 및 처리 위탁">
          <p>
            서비스 운영을 위해 아래 사업자에 일부 정보 처리를 위탁합니다.
            모두 보안 표준(SOC 2 등)을 충족하는 글로벌 서비스이며,
            위탁 범위 외 용도로 정보를 사용하지 않습니다.
          </p>
          <Table>
            <tr>
              <th>수탁자</th>
              <th>처리 범위</th>
            </tr>
            <tr>
              <td>Google (Firebase)</td>
              <td>인증, 데이터베이스, 파일 저장, 서버리스 함수</td>
            </tr>
            <tr>
              <td>Vercel Inc.</td>
              <td>웹사이트 호스팅 및 ISR 캐싱</td>
            </tr>
            <tr>
              <td>OpenAI Inc.</td>
              <td>이미지·텍스트 기반 정보 추출 (AI 보조)</td>
            </tr>
            <tr>
              <td>Resend Inc.</td>
              <td>제보 접수·답신 이메일 발송</td>
            </tr>
            <tr>
              <td>Google reCAPTCHA</td>
              <td>스팸 방지 (점수 0.5 미만 차단)</td>
            </tr>
          </Table>
          <p>
            법령에 따른 수사·재판 절차의 요청이 있는 경우 외에는 제3자에게
            정보를 제공하지 않습니다.
          </p>
        </Section>

        <Section title="5. 이용자의 권리와 행사 방법">
          <p>이용자는 언제든지 아래 권리를 행사할 수 있습니다.</p>
          <List>
            <li>본인 정보의 열람·정정·삭제 요청</li>
            <li>본인 제보·제출 자료의 사이트 게시 중단 요청</li>
            <li>개인정보 처리에 대한 동의 철회</li>
          </List>
          <p>
            요청은 아래 문의처로 이메일을 보내주시면 영업일 기준 7일 내에
            처리합니다.
          </p>
        </Section>

        <Section title="6. 개인정보 파기 절차 및 방법">
          <p>
            보관 기간이 만료되거나 처리 목적이 달성된 정보는 지체 없이 파기합니다.
            Firestore·Cloud Storage 객체는 영구 삭제 처리하며, 백업 매체에
            잔류하는 경우에는 다음 백업 순환 주기에 함께 파기됩니다.
          </p>
        </Section>

        <Section title="7. 안전성 확보 조치">
          <List>
            <li>HTTPS 전송 구간 암호화</li>
            <li>Firebase IAM 및 Firestore Security Rules 기반 접근 통제</li>
            <li>운영자 계정 권한 등급 분리 (Editor / Admin / Super Admin)</li>
            <li>모든 데이터 변경 이력은 editLogs 컬렉션에 추가 기록 (append-only)</li>
            <li>IP 주소는 SHA-256 해시로만 저장 (원문 미보관)</li>
          </List>
        </Section>

        <Section title="8. 개인정보 보호 책임자">
          <p>
            서비스 운영자: <strong>포올</strong> · 사단법인 K BALLET &amp; CO.
            <br />
            문의:{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-brand hover:underline"
            >
              {CONTACT_EMAIL}
            </a>
          </p>
        </Section>

        <Section title="9. 방침 변경">
          <p>
            본 방침은 법령 또는 서비스 변경에 따라 개정될 수 있으며, 개정 시
            홈페이지 공지를 통해 안내합니다. 본 페이지 상단의 &ldquo;최종 개정일&rdquo;을
            참고해 주세요.
          </p>
        </Section>
      </div>
    </article>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-serif font-medium text-ink border-b border-border pb-2">
        {title}
      </h2>
      <div className="text-sm leading-relaxed text-ink/85 space-y-3">
        {children}
      </div>
    </section>
  );
}

function List({ children }: { children: React.ReactNode }) {
  return (
    <ul className="list-disc pl-5 space-y-1.5 text-sm leading-relaxed">
      {children}
    </ul>
  );
}

function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border border-border [&_th]:bg-cream-start/40 [&_th]:text-left [&_th]:px-3 [&_th]:py-2 [&_th]:font-medium [&_th]:text-warm-gray [&_th]:text-xs [&_th]:tracking-wider [&_td]:px-3 [&_td]:py-2 [&_td]:border-t [&_td]:border-border">
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
