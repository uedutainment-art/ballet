# K BALLET & CO. — Info Hub

발레 콩쿠르 · 입시 정보를 AI가 1차 정리하고 관리자가 검수해 공개하는 통합 정보 플랫폼.

## 기술 스택
- Next.js 14 (App Router) · TypeScript · Tailwind · shadcn/ui
- Firebase Auth · Firestore · Storage · Cloud Functions (asia-northeast3)
- OpenAI GPT-4o
- Vercel · GitHub
- pnpm

## 빠른 시작

```bash
pnpm install
cp .env.local.example .env.local
# Fill in .env.local (Firebase + OpenAI keys)
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Functions

```bash
cd functions
pnpm install
pnpm build
```

## 배포

main 브랜치 push → Vercel 자동 배포.
