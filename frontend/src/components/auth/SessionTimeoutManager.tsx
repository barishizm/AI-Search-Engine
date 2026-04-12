"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase";

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;
const ABSOLUTE_SESSION_TIMEOUT_MS = 12 * 60 * 60 * 1000;
const CHECK_INTERVAL_MS = 60 * 1000;
const ACTIVITY_WRITE_THROTTLE_MS = 15 * 1000;

const LAST_ACTIVITY_KEY = "limited-search:last-activity-at";
const SESSION_STARTED_AT_KEY = "limited-search:session-started-at";

function readTimestamp(key: string): number | null {
  const value = window.localStorage.getItem(key);

  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function writeTimestamp(key: string, value: number) {
  window.localStorage.setItem(key, String(value));
}

function clearSessionTracking() {
  window.localStorage.removeItem(LAST_ACTIVITY_KEY);
  window.localStorage.removeItem(SESSION_STARTED_AT_KEY);
}

function getSessionStartedAt(session: Session): number {
  const lastSignInAt = session.user.last_sign_in_at
    ? Date.parse(session.user.last_sign_in_at)
    : Number.NaN;

  if (Number.isFinite(lastSignInAt)) {
    return lastSignInAt;
  }

  return Date.now();
}

function syncSessionTracking(session: Session, event?: AuthChangeEvent) {
  const now = Date.now();
  const storedSessionStartedAt = readTimestamp(SESSION_STARTED_AT_KEY);

  if (event === "SIGNED_IN" || !storedSessionStartedAt) {
    writeTimestamp(SESSION_STARTED_AT_KEY, getSessionStartedAt(session));
  }

  const storedLastActivityAt = readTimestamp(LAST_ACTIVITY_KEY);

  if (event === "SIGNED_IN" || !storedLastActivityAt) {
    writeTimestamp(LAST_ACTIVITY_KEY, now);
  }
}

export default function SessionTimeoutManager() {
  const router = useRouter();
  const isAuthenticatedRef = useRef(false);
  const signOutInProgressRef = useRef(false);
  const lastActivityWriteAtRef = useRef(0);

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;

    const signOutForTimeout = async () => {
      if (signOutInProgressRef.current) {
        return;
      }

      signOutInProgressRef.current = true;
      clearSessionTracking();
      await supabase.auth.signOut();

      if (!mounted) {
        return;
      }

      router.replace("/auth/login");
      router.refresh();
    };

    const checkSessionTimeout = async () => {
      if (!isAuthenticatedRef.current || signOutInProgressRef.current) {
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        isAuthenticatedRef.current = false;
        clearSessionTracking();
        return;
      }

      syncSessionTracking(session);

      const now = Date.now();
      const lastActivityAt = readTimestamp(LAST_ACTIVITY_KEY) ?? now;
      const sessionStartedAt =
        readTimestamp(SESSION_STARTED_AT_KEY) ?? getSessionStartedAt(session);

      const inactiveTooLong = now - lastActivityAt >= INACTIVITY_TIMEOUT_MS;
      const sessionTooOld = now - sessionStartedAt >= ABSOLUTE_SESSION_TIMEOUT_MS;

      if (inactiveTooLong || sessionTooOld) {
        await signOutForTimeout();
      }
    };

    const recordActivity = () => {
      if (!isAuthenticatedRef.current || signOutInProgressRef.current) {
        return;
      }

      const now = Date.now();
      const lastActivityAt = readTimestamp(LAST_ACTIVITY_KEY);
      const sessionStartedAt = readTimestamp(SESSION_STARTED_AT_KEY);

      const inactiveTooLong = Boolean(
        lastActivityAt && now - lastActivityAt >= INACTIVITY_TIMEOUT_MS,
      );
      const sessionTooOld = Boolean(
        sessionStartedAt && now - sessionStartedAt >= ABSOLUTE_SESSION_TIMEOUT_MS,
      );

      if (inactiveTooLong || sessionTooOld) {
        void signOutForTimeout();
        return;
      }

      if (now - lastActivityWriteAtRef.current < ACTIVITY_WRITE_THROTTLE_MS) {
        return;
      }

      lastActivityWriteAtRef.current = now;
      writeTimestamp(LAST_ACTIVITY_KEY, now);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") {
        return;
      }

      recordActivity();
      void checkSessionTimeout();
    };

    const handleStorage = (event: StorageEvent) => {
      if (
        event.key !== LAST_ACTIVITY_KEY &&
        event.key !== SESSION_STARTED_AT_KEY
      ) {
        return;
      }

      void checkSessionTimeout();
    };

    const syncCurrentSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) {
        return;
      }

      isAuthenticatedRef.current = Boolean(session);
      signOutInProgressRef.current = false;

      if (!session) {
        clearSessionTracking();
        return;
      }

      syncSessionTracking(session);
      await checkSessionTimeout();
    };

    const activityEvents: Array<keyof WindowEventMap> = [
      "click",
      "keydown",
      "mousemove",
      "scroll",
      "touchstart",
    ];

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, recordActivity, { passive: true });
    });

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("storage", handleStorage);

    const intervalId = window.setInterval(() => {
      void checkSessionTimeout();
    }, CHECK_INTERVAL_MS);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        isAuthenticatedRef.current = Boolean(session);

        if (!session || event === "SIGNED_OUT") {
          signOutInProgressRef.current = false;
          clearSessionTracking();
          return;
        }

        signOutInProgressRef.current = false;
        syncSessionTracking(session, event);
        await checkSessionTimeout();
      },
    );

    void syncCurrentSession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("storage", handleStorage);
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, recordActivity);
      });
    };
  }, [router]);

  return null;
}
