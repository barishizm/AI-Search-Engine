"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase";

interface AuthButtonProps {
  variant?: "header" | "sidebar";
}

export default function AuthButton({ variant = "header" }: AuthButtonProps) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setOpen(false);
    router.push("/auth/login");
  };

  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.user_metadata?.preferred_username ||
    user?.user_metadata?.username ||
    user?.email?.split("@")[0] ||
    "Account";

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => router.push("/auth/login")}
          className="px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white border border-white/10 hover:border-white/20 transition-colors"
        >
          Sign in
        </button>
        <button
          onClick={() => router.push("/auth/register")}
          className="px-3 py-1.5 rounded-lg text-sm text-white bg-purple-600 hover:bg-purple-500 transition-colors"
        >
          Register
        </button>
      </div>
    );
  }

  const initial = (user.email?.[0] ?? "?").toUpperCase();
  const isSidebar = variant === "sidebar";

  return (
    <div className={`relative ${isSidebar ? "w-full" : ""}`} ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className={
          isSidebar
            ? "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-gray-300 transition-colors hover:bg-white/5 hover:text-white"
            : "flex h-8 w-8 items-center justify-center rounded-full bg-purple-600 text-sm font-medium text-white transition-colors hover:bg-purple-500"
        }
      >
        <span
          className={
            isSidebar
              ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-600 text-sm font-medium text-white"
              : "flex h-8 w-8 items-center justify-center rounded-full bg-purple-600 text-sm font-medium text-white"
          }
        >
          {initial}
        </span>
        {isSidebar && (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-white">
              {displayName}
            </span>
            <span className="block truncate text-xs text-gray-500">
              {user.email}
            </span>
          </span>
        )}
      </button>

      {open && (
        <div
          className={
            isSidebar
              ? "absolute bottom-full left-0 right-0 z-50 mb-2 rounded-lg border border-white/10 bg-[#2a2a2a] py-1 shadow-xl"
              : "absolute right-0 z-50 mt-2 w-48 rounded-lg border border-white/10 bg-[#2a2a2a] py-1 shadow-xl"
          }
        >
          <p className="px-3 py-2 text-xs text-gray-500 truncate border-b border-white/5">
            {user.email}
          </p>
          <button
            onClick={handleSignOut}
            className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-white/5 transition-colors"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
