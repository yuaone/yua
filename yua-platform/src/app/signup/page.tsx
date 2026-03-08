"use client";

import Link from "next/link";
import { useState } from "react";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = name.trim() && email.trim() && password.trim() && termsAccepted && !loading;

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError("");

    try {
      // TODO: Firebase Auth createUserWithEmailAndPassword + updateProfile
      // import { getAuth, createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
      // const auth = getAuth();
      // const cred = await createUserWithEmailAndPassword(auth, email, password);
      // await updateProfile(cred.user, { displayName: name });
      // router.push("/dashboard");
      console.log("[signup] stub:", { name, email });
      await new Promise((r) => setTimeout(r, 1000));
      window.location.href = "/dashboard";
    } catch (err: any) {
      setError(err.message ?? "Sign up failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    if (loading) return;
    setLoading(true);
    setError("");

    try {
      // TODO: Firebase Auth signInWithPopup + GoogleAuthProvider
      // import { getAuth, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
      // const auth = getAuth();
      // const provider = new GoogleAuthProvider();
      // await signInWithPopup(auth, provider);
      // router.push("/dashboard");
      console.log("[signup] google signup stub");
      await new Promise((r) => setTimeout(r, 1000));
      window.location.href = "/dashboard";
    } catch (err: any) {
      setError(err.message ?? "Google sign up failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "var(--app-bg)" }}
    >
      <div className="w-full max-w-[420px]">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div
            className="flex items-center justify-center rounded-xl mb-4"
            style={{
              width: 48,
              height: 48,
              background: "linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)",
              boxShadow: "0 4px 14px rgba(124, 58, 237, 0.3)",
            }}
          >
            <svg width="24" height="24" viewBox="0 0 18 18" fill="none">
              <path
                d="M9 2L3 6v6l6 4 6-4V6L9 2Z"
                fill="rgba(255,255,255,0.95)"
              />
            </svg>
          </div>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            Create your account
          </h1>
          <p
            className="text-sm mt-1"
            style={{ color: "var(--text-muted)" }}
          >
            Get started with YUA Developer Platform
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl border p-8"
          style={{
            background: "var(--surface-main)",
            borderColor: "var(--border-subtle)",
            boxShadow: "var(--shadow-lg)",
          }}
        >
          {/* Error */}
          {error && (
            <div
              className="rounded-xl px-4 py-3 mb-6 text-sm"
              style={{
                background: "rgba(239, 68, 68, 0.08)",
                border: "1px solid rgba(239, 68, 68, 0.2)",
                color: "var(--error)",
              }}
            >
              {error}
            </div>
          )}

          {/* Google OAuth */}
          <button
            onClick={handleGoogleSignup}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 rounded-xl text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              height: 44,
              background: "var(--surface-panel)",
              border: "1px solid var(--border-default)",
              color: "var(--text-primary)",
              boxShadow: "var(--shadow-xs)",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
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
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px" style={{ background: "var(--border-subtle)" }} />
            <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
              or
            </span>
            <div className="flex-1 h-px" style={{ background: "var(--border-subtle)" }} />
          </div>

          {/* Signup form */}
          <form onSubmit={handleSignup} className="flex flex-col gap-4">
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: "var(--text-secondary)" }}
              >
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                required
                autoComplete="name"
                autoFocus
                className="w-full px-4 py-3 rounded-xl text-sm transition-all"
                style={{
                  background: "var(--surface-panel)",
                  border: "1px solid var(--border-default)",
                  color: "var(--text-primary)",
                  outline: "none",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "var(--accent)";
                  e.currentTarget.style.boxShadow = "0 0 0 3px var(--accent-subtle)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-default)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            </div>

            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: "var(--text-secondary)" }}
              >
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                autoComplete="email"
                className="w-full px-4 py-3 rounded-xl text-sm transition-all"
                style={{
                  background: "var(--surface-panel)",
                  border: "1px solid var(--border-default)",
                  color: "var(--text-primary)",
                  outline: "none",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "var(--accent)";
                  e.currentTarget.style.boxShadow = "0 0 0 3px var(--accent-subtle)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-default)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            </div>

            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: "var(--text-secondary)" }}
              >
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                required
                minLength={8}
                autoComplete="new-password"
                className="w-full px-4 py-3 rounded-xl text-sm transition-all"
                style={{
                  background: "var(--surface-panel)",
                  border: "1px solid var(--border-default)",
                  color: "var(--text-primary)",
                  outline: "none",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "var(--accent)";
                  e.currentTarget.style.boxShadow = "0 0 0 3px var(--accent-subtle)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-default)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            </div>

            {/* Terms checkbox */}
            <label className="flex items-start gap-3 cursor-pointer mt-1">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-0.5 shrink-0 accent-violet-600"
                style={{ width: 16, height: 16 }}
              />
              <span className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                I agree to the{" "}
                <a
                  href="/legal/terms"
                  target="_blank"
                  className="font-medium underline"
                  style={{ color: "var(--accent)" }}
                >
                  Terms of Service
                </a>{" "}
                and{" "}
                <a
                  href="/legal/privacy"
                  target="_blank"
                  className="font-medium underline"
                  style={{ color: "var(--accent)" }}
                >
                  Privacy Policy
                </a>
              </span>
            </label>

            {/* Submit */}
            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full flex items-center justify-center rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-40 disabled:cursor-not-allowed mt-1"
              style={{
                height: 44,
                background: "linear-gradient(135deg, var(--accent) 0%, #6d28d9 100%)",
                boxShadow: canSubmit
                  ? "0 1px 3px 0 rgba(124,58,237,0.4), 0 1px 2px -1px rgba(124,58,237,0.3)"
                  : "none",
              }}
            >
              {loading ? (
                <div
                  className="w-5 h-5 rounded-full border-2 border-white/30 animate-spin"
                  style={{ borderTopColor: "#ffffff" }}
                />
              ) : (
                "Create account"
              )}
            </button>
          </form>
        </div>

        {/* Login link */}
        <p
          className="text-center text-sm mt-6"
          style={{ color: "var(--text-muted)" }}
        >
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold transition-colors hover:underline"
            style={{ color: "var(--accent)" }}
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
