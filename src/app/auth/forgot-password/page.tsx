"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";
import AuthShell from "@/components/auth/AuthShell";
import styles from "@/app/auth/auth.module.css";
import { createClient } from "@/lib/supabase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleResetRequest = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/update-password`,
    });

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
      title={success ? "Check your email" : "Recover Password"}
      subtitle={
        success
          ? "Use the recovery link from your inbox to choose a new password."
          : "Enter the email address connected to your account."
      }
    >
      {error ? (
        <div className={`${styles.message} ${styles.errorMessage}`}>{error}</div>
      ) : null}

      {success ? (
        <>
          <div className={`${styles.message} ${styles.successMessage}`}>
            If an account exists for <strong>{email}</strong>, a password reset
            link is on its way.
          </div>

          <div className={styles.buttonRow}>
            <Link
              className={`${styles.actionButton} ${styles.primaryButton}`}
              href="/auth/login"
            >
              Back to Login
            </Link>
            <Link
              className={`${styles.actionButton} ${styles.secondaryButton}`}
              href="/auth/register"
            >
              Sign Up
            </Link>
          </div>
        </>
      ) : (
        <form className={styles.form} onSubmit={handleResetRequest}>
          <div className={styles.field}>
            <span className={styles.fieldIcon}>
              <Mail size={18} />
            </span>
            <input
              autoComplete="email"
              className={styles.inputField}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
              type="email"
              value={email}
            />
          </div>

          <div className={styles.buttonRow}>
            <button
              className={`${styles.actionButton} ${styles.primaryButton}`}
              disabled={loading}
              type="submit"
            >
              {loading ? "Sending..." : "Send Link"}
            </button>
            <Link
              className={`${styles.actionButton} ${styles.secondaryButton}`}
              href="/auth/login"
            >
              Login
            </Link>
          </div>
        </form>
      )}

      <p className={styles.footnote}>
        Need an account instead?{" "}
        <Link className={styles.inlineLink} href="/auth/register">
          Create one here
        </Link>
      </p>
    </AuthShell>
  );
}
