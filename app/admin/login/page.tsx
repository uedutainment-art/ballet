"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import {
  mapAuthError,
  signInWithEmail,
  signInWithGoogle,
} from "@/lib/firebase/auth";

const schema = z.object({
  email: z.string().email("이메일 형식이 올바르지 않아요"),
  password: z.string().min(6, "비밀번호는 6자 이상이어야 해요"),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-cream flex items-center justify-center px-6 py-12">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </main>
  );
}

function LoginForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const returnTo = sp.get("returnTo") ?? "/admin";

  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onEmailSubmit(data: FormData) {
    setServerError(null);
    setSubmitting(true);
    try {
      await signInWithEmail(data.email, data.password);
      router.replace(returnTo);
    } catch (err) {
      setServerError(mapAuthError(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function onGoogle() {
    setServerError(null);
    setSubmitting(true);
    try {
      await signInWithGoogle();
      router.replace(returnTo);
    } catch (err) {
      setServerError(mapAuthError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-sm p-8">
      <div className="text-center mb-6">
        <div className="text-[10px] tracking-[0.2em] text-warm-gray uppercase">
          K BALLET ADMIN
        </div>
        <h1 className="mt-2 font-serif text-xl text-ink">운영자 로그인</h1>
      </div>

      <form onSubmit={handleSubmit(onEmailSubmit)} className="space-y-3">
        <div>
          <label
            htmlFor="email"
            className="block text-xs text-warm-gray mb-1"
          >
            이메일
          </label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            {...register("email")}
            aria-invalid={!!errors.email}
          />
          {errors.email ? (
            <div className="mt-1 text-[11px] text-red-600">
              {errors.email.message}
            </div>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-xs text-warm-gray mb-1"
          >
            비밀번호
          </label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            {...register("password")}
            aria-invalid={!!errors.password}
          />
          {errors.password ? (
            <div className="mt-1 text-[11px] text-red-600">
              {errors.password.message}
            </div>
          ) : null}
        </div>

        {serverError ? (
          <div className="rounded-sm bg-red-50 text-red-700 text-xs px-3 py-2">
            {serverError}
          </div>
        ) : null}

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={submitting}
        >
          {submitting ? "로그인 중…" : "로그인"}
        </Button>
      </form>

      <div className="my-4 flex items-center gap-3">
        <div className="flex-1 h-px bg-border" />
        <span className="text-[10px] text-warm-gray uppercase tracking-wider">
          or
        </span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <Button
        type="button"
        variant="ghost"
        size="lg"
        className="w-full"
        onClick={onGoogle}
        disabled={submitting}
      >
        Google로 로그인
      </Button>

      <div className="mt-6 text-center">
        <Link href="/" className="text-xs text-warm-gray hover:text-ink">
          ← 홈으로
        </Link>
      </div>
    </Card>
  );
}
