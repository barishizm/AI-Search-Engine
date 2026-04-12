"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";

type ExchangeState = "idle" | "exchanging" | "error";

export default function AuthCodeHandler() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [state, setState] = useState<ExchangeState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/";

  useEffect(() => {
    if (!code) {
      setState("idle");
      setErrorMessage(null);
      return;
    }

    let active = true;

    const exchange = async () => {
      setState("exchanging");
      setErrorMessage(null);

      const supabase = createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (!active) return;

      if (error) {
        setState("error");
        setErrorMessage(error.message);
        return;
      }

      const safeTarget = next.startsWith("/") ? next : "/";
      window.history.replaceState({}, "", safeTarget);
      router.refresh();
      setState("idle");
    };

    void exchange();

    return () => {
      active = false;
    };
  }, [code, next, pathname, router]);

  if (!code || state === "idle") {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-4">
      <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#171717] px-6 py-5 text-center shadow-[0_30px_120px_rgba(0,0,0,0.45)]">
        {state === "error" ? (
          <>
            <h2 className="text-lg font-semibold text-white">Google sign-in failed</h2>
            <p className="mt-2 text-sm leading-6 text-white/70">
              {errorMessage || "We could not finish the sign-in callback."}
            </p>
            <div className="mt-5 flex items-center justify-center gap-3">
              <Link
                href="/auth/login"
                className="rounded-lg bg-white/10 px-4 py-2 text-sm text-white transition-colors hover:bg-white/20"
              >
                Back to login
              </Link>
              <button
                className="rounded-lg bg-white px-4 py-2 text-sm text-black transition-colors hover:bg-white/90"
                onClick={() => router.refresh()}
                type="button"
              >
                Retry
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-lg font-semibold text-white">Finishing sign-in...</h2>
            <p className="mt-2 text-sm leading-6 text-white/70">
              Google authentication completed. We are restoring your session now.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
