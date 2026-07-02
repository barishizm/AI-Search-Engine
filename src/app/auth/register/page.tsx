"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import AuthShell from "@/components/auth/AuthShell";
import { createClient } from "@/lib/supabase";
import styles from "@/app/auth/auth.module.css";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
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
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin + "/auth/callback",
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    window.location.href = "/";
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setGoogleLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setGoogleLoading(false);
    }
  };

  return (
    <AuthShell
      title="Register"
      subtitle="Create an account to sync conversation history across sessions."
    >
      {error ? (
        <div className={`${styles.message} ${styles.errorMessage}`}>{error}</div>
      ) : null}

      <form className={styles.form} onSubmit={handleRegister}>
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

        <div className={styles.field}>
          <span className={styles.fieldIcon}>
            <Lock size={18} />
          </span>
          <input
            autoComplete="new-password"
            className={styles.inputField}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
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
            placeholder="Confirm password"
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
            {loading ? "Creating..." : "Create Account"}
          </button>
          <Link
            className={`${styles.actionButton} ${styles.secondaryButton}`}
            href="/auth/login"
          >
            Login
          </Link>
        </div>
      </form>

      <div className={styles.divider}>
        <div className={styles.dividerLine} />
        <span className={styles.dividerText}>or</span>
        <div className={styles.dividerLine} />
      </div>

      <button
        className={styles.oauthButton}
        disabled={googleLoading}
        onClick={handleGoogleLogin}
        type="button"
      >
        <GoogleIcon />
        {googleLoading ? "Redirecting..." : "Continue with Google"}
      </button>

      <p className={styles.footnote}>
        Already have an account?{" "}
        <Link className={styles.inlineLink} href="/auth/login">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
