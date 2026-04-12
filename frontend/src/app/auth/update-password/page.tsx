"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Lock } from "lucide-react";
import AuthShell from "@/components/auth/AuthShell";
import styles from "@/app/auth/auth.module.css";
import { createClient } from "@/lib/supabase";

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    const checkSession = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        setError(error.message);
        setCheckingSession(false);
        return;
      }

      setReady(Boolean(data.session));
      setCheckingSession(false);
    };

    void checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
        setCheckingSession(false);
        setError(null);
        return;
      }

      setReady(Boolean(session));
      setCheckingSession(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handlePasswordUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  return (
    <AuthShell
      title={success ? "Password updated" : "Set a new password"}
      subtitle={
        success
          ? "Your account is ready for a fresh login."
          : "Choose a new password for your Limited-Search account."
      }
    >
      {error ? (
        <div className={`${styles.message} ${styles.errorMessage}`}>{error}</div>
      ) : null}

      {success ? (
        <>
          <div className={`${styles.message} ${styles.successMessage}`}>
            Your password has been updated successfully.
          </div>

          <div className={styles.buttonRow}>
            <Link
              className={`${styles.actionButton} ${styles.primaryButton}`}
              href="/auth/login"
            >
              Login
            </Link>
            <Link
              className={`${styles.actionButton} ${styles.secondaryButton}`}
              href="/"
            >
              Home
            </Link>
          </div>
        </>
      ) : checkingSession ? (
        <div className={`${styles.message} ${styles.infoMessage}`}>
          Verifying your recovery session...
        </div>
      ) : !ready ? (
        <>
          <div className={`${styles.message} ${styles.infoMessage}`}>
            Open the password recovery link from your email to continue here.
          </div>

          <div className={styles.buttonRow}>
            <Link
              className={`${styles.actionButton} ${styles.primaryButton}`}
              href="/auth/forgot-password"
            >
              Resend Link
            </Link>
            <Link
              className={`${styles.actionButton} ${styles.secondaryButton}`}
              href="/auth/login"
            >
              Login
            </Link>
          </div>
        </>
      ) : (
        <form className={styles.form} onSubmit={handlePasswordUpdate}>
          <div className={styles.field}>
            <span className={styles.fieldIcon}>
              <Lock size={18} />
            </span>
            <input
              autoComplete="new-password"
              className={styles.inputField}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password"
              required
              type={showPassword ? "text" : "password"}
              value={password}
            />
            <button
              aria-label={showPassword ? "Hide password" : "Show password"}
              className={styles.iconButton}
              onClick={() => setShowPassword(!showPassword)}
              type="button"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <div className={styles.field}>
            <span className={styles.fieldIcon}>
              <Lock size={18} />
            </span>
            <input
              autoComplete="new-password"
              className={styles.inputField}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              required
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
            />
            <button
              aria-label={
                showConfirmPassword ? "Hide confirm password" : "Show confirm password"
              }
              className={styles.iconButton}
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              type="button"
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <div className={styles.buttonRow}>
            <button
              className={`${styles.actionButton} ${styles.primaryButton}`}
              disabled={loading}
              type="submit"
            >
              {loading ? "Saving..." : "Update Password"}
            </button>
            <Link
              className={`${styles.actionButton} ${styles.secondaryButton}`}
              href="/auth/login"
            >
              Cancel
            </Link>
          </div>
        </form>
      )}
    </AuthShell>
  );
}
