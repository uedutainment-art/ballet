import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "이용약관 — K BALLET & CO.",
  description:
    "K BALLET 서비스 이용에 관한 약관 — 서비스 정의, 이용자 의무, 콘텐츠 권리, 면책 및 분쟁 해결.",
};

const REVISED = "2026-05-21";
const CONTACT_EMAIL = "uedutainment@gmail.com";

export default function TermsPage() {
  return (
    <article className="px-6 py-12">
      <div className="mx-auto max-w-3xl space-y-8">
        <header>
          <h1 className="text-2xl md:text-3xl font-serif font-medium text-ink leading-tight">
            이용약관
          </h1>
          <p className="mt-3 text-xs text-warm-gray">
            최종 개정일: {REVISED}
          </p>
        </header>

        <Section title="제1조 (목적)">
          <p>
            이 약관은 K BALLET &amp; CO. (이하 &ldquo;서비스&rdquo;)가 제공하는
            발레 정보 큐레이션 서비스의 이용 조건과 절차, 서비스와 이용자의
            권리·의무 및 책임 사항을 규정함을 목적으로 합니다.
          </p>
        </Section>

        <Section title="제2조 (정의)">
          <List>
            <li>
              <strong>서비스</strong>: 한국 발레와 관련된 콩쿠르, 입시, 공연,
              영상, 기관 정보를 공식 자료를 바탕으로 정리·게시하는 웹사이트
              및 부속 기능
            </li>
            <li>
              <strong>이용자</strong>: 서비스에 접속해 정보를 열람하거나 제보·
              문의 폼을 통해 자료를 제출하는 모든 사람
            </li>
            <li>
              <strong>운영자</strong>: 서비스의 콘텐츠 검수·게시 권한을 가진
              관리자 계정 보유자
            </li>
            <li>
              <strong>콘텐츠</strong>: 사이트에 게시되는 텍스트, 이미지, 영상
              링크 등 모든 자료
            </li>
          </List>
        </Section>

        <Section title="제3조 (약관의 효력 및 변경)">
          <p>
            이 약관은 서비스 페이지에 게시함으로써 효력이 발생합니다.
            서비스는 필요한 경우 약관을 개정할 수 있으며, 개정 시 홈페이지
            공지를 통해 안내합니다. 개정 후 이용자가 서비스를 계속 이용하는
            경우 개정 약관에 동의한 것으로 간주합니다.
          </p>
        </Section>

        <Section title="제4조 (서비스의 제공)">
          <List>
            <li>서비스는 공개된 공식 자료, 운영자 큐레이션, 외부 제보를 종합하여 콘텐츠를 게시합니다.</li>
            <li>AI 도구를 이용해 1차 추출하지만, 모든 콘텐츠는 운영자 검토 후 공개됩니다.</li>
            <li>최신성과 정확성을 위해 정기적으로 자료를 갱신하지만, 모든 정보가 실시간 사실과 100% 일치함을 보장하지는 않습니다. 최종 의사결정은 반드시 각 기관의 공식 자료를 확인해 주세요.</li>
            <li>서비스는 시스템 점검, 외부 사업자 장애 등 불가피한 경우 일시 중단될 수 있습니다.</li>
          </List>
        </Section>

        <Section title="제5조 (이용자의 의무)">
          <List>
            <li>이용자는 사실에 기반한 제보·자료를 제출해야 하며, 허위 정보나 타인의 권리를 침해하는 자료는 제출하지 말아야 합니다.</li>
            <li>서비스의 정상 운영을 방해하는 행위 (자동화된 대량 호출, 시스템 침투 시도 등)는 금지됩니다.</li>
            <li>제출 자료에 제3자의 저작권·상표권·초상권이 포함된 경우, 이용자는 해당 권리자로부터 사전 동의를 받았음을 보증합니다.</li>
          </List>
        </Section>

        <Section title="제6조 (콘텐츠의 권리)">
          <List>
            <li>서비스에 표시된 각 기관의 명칭, 로고, 포스터 등은 해당 기관의 자산이며, 식별·정보 제공 목적으로 사용됩니다.</li>
            <li>운영자가 자체 작성한 텍스트(요약, 분류, 해설 등)의 권리는 K BALLET &amp; CO.에 귀속됩니다.</li>
            <li>서비스 콘텐츠를 인용·공유할 때는 출처를 표기해 주시고, 상업적 이용이나 대량 복제는 사전에 문의해 주세요.</li>
            <li>기관 관계자가 자료 삭제·수정을 요청하시면 1~3일 내 처리합니다 (
              <a
                href="/contact"
                className="text-brand hover:underline"
              >
                /contact
              </a>
              ).</li>
          </List>
        </Section>

        <Section title="제7조 (면책)">
          <List>
            <li>서비스는 게시된 정보를 바탕으로 한 이용자의 의사결정 결과에 대해 책임지지 않습니다. 실제 신청·구매 전 반드시 공식 자료를 확인해 주세요.</li>
            <li>외부 링크의 내용 및 외부 사업자 장애로 인한 서비스 중단에 대해서는 책임이 제한됩니다.</li>
            <li>천재지변, 정부 조치 등 불가항력에 의한 손해에 대해서는 책임지지 않습니다.</li>
          </List>
        </Section>

        <Section title="제8조 (개인정보 보호)">
          <p>
            이용자의 개인정보 처리에 관한 사항은 별도{" "}
            <a
              href="/privacy"
              className="text-brand hover:underline"
            >
              개인정보 처리방침
            </a>
            에 따릅니다.
          </p>
        </Section>

        <Section title="제9조 (분쟁 해결 및 준거법)">
          <p>
            이 약관과 관련된 분쟁은 대한민국 법령에 따르며, 분쟁이 발생할 경우
            상호 협의로 해결함을 원칙으로 합니다. 협의가 이루어지지 않을 경우
            관할 법원은 운영자의 주소지를 관할하는 법원으로 합니다.
          </p>
        </Section>

        <Section title="제10조 (문의)">
          <p>
            본 약관 또는 서비스 이용에 관한 문의는 아래로 보내주세요.
            <br />
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-brand hover:underline"
            >
              {CONTACT_EMAIL}
            </a>
          </p>
        </Section>

        <p className="text-xs text-warm-gray pt-4 border-t border-border">
          본 약관은 {REVISED}부터 시행됩니다.
        </p>
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
