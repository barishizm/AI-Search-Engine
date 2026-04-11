"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase";

export default function AuthButton() {
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

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="w-8 h-8 rounded-full bg-purple-600 text-white text-sm font-medium flex items-center justify-center hover:bg-purple-500 transition-colors"
      >
        {initial}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-[#2a2a2a] border border-white/10 rounded-lg shadow-xl py-1 z-50">
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
