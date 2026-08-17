"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import {
  forgotPassword,
  loginUser,
  loginWithGoogle,
  registerUser,
  resendVerification,
  resetPassword,
  verifyEmail,
} from "@/lib/api/auth";

import { clearToken, setCurrentUser, useCurrentUser } from "@/lib/storage";
import { useToast } from "@/hooks/useToast";

let googleScriptPromise: Promise<void> | null = null;
let initializedGoogleClientId = "";
let googleInitialized = false;
let googleCredentialHandler:
  ((response: { credential: string }) => void) | null = null;

function loadGoogleIdentityScript(): Promise<void> {
  if (
    typeof window !== "undefined" &&
    (window as unknown as { google?: { accounts?: { id: unknown } } }).google
      ?.accounts?.id
  ) {
    return Promise.resolve();
  }

  if (googleScriptPromise) {
    return googleScriptPromise;
  }

  googleScriptPromise = new Promise<void>((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Could not load Google sign-in."));
      return;
    }

    const existingScript = document.querySelector(
      'script[src="https://accounts.google.com/gsi/client"]',
    );

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load Google sign-in."));

    if (!existingScript) {
      document.head.appendChild(script);
    } else {
      existingScript.addEventListener("load", () => resolve(), { once: true });
    }
  }).catch((error) => {
    googleScriptPromise = null;
    throw error;
  });

  return googleScriptPromise;
}

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const modeFromUrl = searchParams.get("mode");
  const tokenFromUrl = searchParams.get("token");
  const legacyVerifyToken = searchParams.get("verifyToken");
  const verifyTokenFromUrl =
    modeFromUrl === "verify-email" ? tokenFromUrl : legacyVerifyToken;
  const resetTokenFromUrl =
    modeFromUrl === "reset-password" ? tokenFromUrl : null;
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPasswordMode, setIsForgotPasswordMode] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetPasswordValue, setResetPasswordValue] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isResetPasswordVisible, setIsResetPasswordVisible] = useState(false);
  const [showVerificationTools, setShowVerificationTools] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const currentUser = useCurrentUser() as Record<string, unknown> | null;
  const isAuthenticated = Boolean(currentUser);
  const toast = useToast();

  const inputClassName = "input-field-dark";

  const fromParam = (() => {
    const raw = searchParams.get("from");
    if (!raw) return "/";
    if (raw.startsWith("/") && !raw.startsWith("//")) {
      return raw;
    }
    return "/";
  })();

  const finishAuthenticatedLogin = useCallback(
    async (data: { user: Record<string, unknown> }, successMessage: string) => {
      setShowVerificationTools(false);
      setCurrentUser(data.user);

      if (data.user?.role === "ADMIN") {
        router.push("/admin?cartMessage=" + encodeURIComponent(successMessage));
        return;
      }

      let redirectMessage = successMessage;
      if (fromParam === "/cart" || fromParam === "/wishlist") {
        redirectMessage =
          "Welcome back! Your saved items have been restored to your account.";
      }

      router.push(
        fromParam + "?cartMessage=" + encodeURIComponent(redirectMessage),
      );
    },
    [router, fromParam],
  );

  useEffect(() => {
    if (!isAuthenticated || resetTokenFromUrl || verifyTokenFromUrl) {
      return;
    }

    router.push(currentUser?.role === "ADMIN" ? "/admin" : "/", {
      scroll: false,
    });
  }, [
    currentUser?.role,
    isAuthenticated,
    router,
    resetTokenFromUrl,
    verifyTokenFromUrl,
  ]);

  useEffect(() => {
    if (!verifyTokenFromUrl) {
      return;
    }

    verifyEmail(verifyTokenFromUrl)
      .then((data) => {
        const message = (data as { message?: string | undefined })?.message;
        toast.showToast({
          severity: "success",
          summary: "Verification successful",
          detail: message,
          life: 4000,
        });
        setShowVerificationTools(false);
        setIsForgotPasswordMode(false);
      })
      .catch((err) => {
        toast.showToast({
          severity: "error",
          summary: "Verification failed",
          detail: (err as Error).message || "Verification failed",
          life: 5000,
        });
      });
  }, [verifyTokenFromUrl, toast]);

  useEffect(() => {
    if (!resetTokenFromUrl) {
      return;
    }

    setIsLogin(true);
    setIsForgotPasswordMode(true);
    toast.showToast({
      severity: "info",
      summary: "Password reset",
      detail: "Enter a new password to finish resetting your account.",
      life: 3000,
    });
  }, [resetTokenFromUrl, toast]);

  useEffect(() => {
    if (resetTokenFromUrl || isForgotPasswordMode) {
      return;
    }

    setIsLogin(true);
  }, [isForgotPasswordMode, resetTokenFromUrl]);

  useEffect(() => {
    if (!googleClientId || !googleButtonRef.current || resetTokenFromUrl) {
      return undefined;
    }

    let cancelled = false;

    const activeHandler = async (response: { credential: string }) => {
      if (!response.credential) {
        toast.showToast({
          severity: "error",
          summary: "Google sign-in",
          detail: "Google sign-in did not return a valid credential.",
          life: 4000,
        });
        return;
      }

      setIsGoogleLoading(true);
      setShowVerificationTools(false);

      try {
        const data = (await loginWithGoogle(response.credential)) as {
          user: Record<string, unknown>;
        };
        await finishAuthenticatedLogin(
          data,
          "Google sign-in successful. You can now continue shopping.",
        );
      } catch (err) {
        toast.showToast({
          severity: "error",
          summary: "Google sign-in failed",
          detail: (err as Error).message || "Google sign-in failed.",
          life: 4000,
        });
      } finally {
        if (!cancelled) {
          setIsGoogleLoading(false);
        }
      }
    };

    googleCredentialHandler = activeHandler;

    const renderGoogleButton = () => {
      if (cancelled || !googleButtonRef.current) {
        return;
      }

      const googleWindow = window as unknown as {
        google?: {
          accounts?: {
            id: {
              initialize: (opts: unknown) => void;
              renderButton: (
                parent: HTMLDivElement,
                opts: Record<string, unknown>,
              ) => void;
            };
          };
        };
      };
      if (!googleWindow.google?.accounts?.id) {
        return;
      }

      if (!googleInitialized || initializedGoogleClientId !== googleClientId) {
        googleWindow.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: (response: { credential: string }) =>
            googleCredentialHandler?.(response),
        });
        initializedGoogleClientId = googleClientId;
        googleInitialized = true;
      }

      googleButtonRef.current.innerHTML = "";
      const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
      googleWindow.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: "outline",
        size: isMobile ? "medium" : "large",
        width: isMobile ? googleButtonRef.current.clientWidth || 280 : 300,
        text: isLogin ? "signin_with" : "signup_with",
        shape: "pill",
      });
    };

    loadGoogleIdentityScript()
      .then(() => {
        if (!cancelled) {
          renderGoogleButton();
        }
      })
      .catch((err) => {
        if (!cancelled) {
          toast.showToast({
            severity: "error",
            summary: "Google sign-in",
            detail: (err as Error).message || "Could not load Google sign-in.",
            life: 4000,
          });
        }
      });

    return () => {
      cancelled = true;
      googleCredentialHandler = null;
    };
  }, [
    finishAuthenticatedLogin,
    googleClientId,
    isLogin,
    resetTokenFromUrl,
    toast,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (resetTokenFromUrl) {
        const data = (await resetPassword(
          resetTokenFromUrl,
          resetPasswordValue,
        )) as { message: string; email: string };
        const loginData = (await loginUser(data.email, resetPasswordValue)) as {
          user: Record<string, unknown>;
        };
        toast.showToast({
          severity: "success",
          summary: "Password reset",
          detail: "Your password has been updated. Redirecting...",
          life: 2000,
        });
        setTimeout(() => {
          void finishAuthenticatedLogin(
            loginData,
            "Password reset successful. You are now signed in.",
          );
        }, 200);
        return;
      }

      if (isForgotPasswordMode) {
        const data = (await forgotPassword(email)) as { message: string };
        toast.showToast({
          severity: "success",
          summary: "Reset link sent",
          detail: data.message,
          life: 4000,
        });
        return;
      }

      if (isLogin) {
        const data = (await loginUser(email, password)) as {
          user: Record<string, unknown>;
        };
        await finishAuthenticatedLogin(
          data,
          "Login successful. You can now add items to your cart.",
        );
        toast.showToast({
          severity: "success",
          summary: "Login successful",
          detail: "You can now add items to your cart.",
          life: 3000,
        });
        return;
      } else {
        clearToken();
        const data = (await registerUser(name, email, password)) as {
          message: string;
          user: Record<string, unknown>;
        };
        const message =
          data.message ||
          "Registration successful. Check your email to verify your account.";
        setShowVerificationTools(true);
        setIsLogin(true);
        toast.showToast({
          severity: "success",
          summary: "Account created",
          detail: message,
          life: 4000,
        });
      }
    } catch (err) {
      const message = (err as Error).message || "Request failed";
      toast.showToast({
        severity: "error",
        summary: "Authentication failed",
        detail: message,
        life: 5000,
      });
      if (message.toLowerCase().includes("verify your email")) {
        setShowVerificationTools(true);
      }
    }
  };

  const handleResendVerification = async () => {
    setShowVerificationTools(false);

    try {
      const data = (await resendVerification(email)) as { message: string };
      toast.showToast({
        severity: "success",
        summary: "Verification email sent",
        detail: data.message,
        life: 4000,
      });
      setShowVerificationTools(true);
    } catch (err) {
      toast.showToast({
        severity: "error",
        summary: "Could not resend verification email",
        detail: (err as Error).message || "Could not resend verification email",
        life: 4000,
      });
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 theme-transition">
      <div className="absolute left-4 right-4 top-4 flex items-center justify-between sm:left-8 sm:top-6">
        <Link
          href="/"
          className="font-serif text-xl text-white transition hover:text-emerald-200 sm:text-2xl"
        >
          Moringa Store Online
        </Link>
        <ThemeToggle />
      </div>
      {/* BACKGROUND */}
      <div className="absolute inset-0">
        <Image
          src="/images/bg-login.webp"
          alt=""
          width={1920}
          height={1080}
          priority
          fetchPriority="high"
          className="h-full w-full object-cover"
          aria-hidden="true"
        />
        <div className="absolute inset-0 backdrop-blur-sm bg-gradient-to-br from-slate-950/90 via-emerald-950/70 to-black/85" />
      </div>

      {/* CARD */}
      <div className="relative z-10 w-full max-w-md rounded-[2rem] border border-emerald-400/20 bg-slate-950/88 p-5 text-slate-100 shadow-[0_30px_80px_rgba(0,0,0,0.45)] sm:p-8">
        {/* LOGO */}
        <div className="flex justify-center mb-6">
          {/* <img src="/logo.svg" className="h-10" /> */}
        </div>

        {/* TITLE */}
        <h1 className="text-2xl font-semibold text-white">
          {resetTokenFromUrl ? (
            "Reset password"
          ) : isForgotPasswordMode ? (
            "Forgot password"
          ) : isLogin ? (
            <>
              Sign in to <span className="text-emerald-300">Moringa Store</span>
            </>
          ) : (
            "Create your account"
          )}
        </h1>

        {!resetTokenFromUrl && !isForgotPasswordMode ? (
          <p className="mt-2 text-sm text-slate-300">
            {isLogin
              ? "Already have an account with us? Sign in to continue."
              : "Register first to save your cart, place orders, and track deliveries."}
          </p>
        ) : null}

        {/* FORM */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {/* NAME (Register only) */}
          {!isLogin && !isForgotPasswordMode && !resetTokenFromUrl && (
            <input
              placeholder="Full name"
              aria-label="Full name"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClassName}
            />
          )}

          {/* EMAIL */}
          {!resetTokenFromUrl ? (
            <input
              placeholder="Email"
              aria-label="Email"
              autoComplete="email"
              spellCheck={false}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClassName}
            />
          ) : null}

          {/* PASSWORD */}
          {resetTokenFromUrl ? (
            <div className="relative">
              <input
                type={isResetPasswordVisible ? "text" : "password"}
                placeholder="New password"
                aria-label="New password"
                autoComplete="new-password"
                value={resetPasswordValue}
                onChange={(e) => setResetPasswordValue(e.target.value)}
                className={inputClassName}
              />
              <button
                type="button"
                aria-label={
                  isResetPasswordVisible ? "Hide password" : "Show password"
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                onClick={() => setIsResetPasswordVisible((prev) => !prev)}
              >
                {isResetPasswordVisible ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5"
                  >
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5"
                  >
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                )}
              </button>
            </div>
          ) : !isForgotPasswordMode ? (
            <div className="relative">
              <input
                type={isPasswordVisible ? "text" : "password"}
                placeholder="Password"
                aria-label="Password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClassName}
              />
              <button
                type="button"
                aria-label={
                  isPasswordVisible ? "Hide password" : "Show password"
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                onClick={() => setIsPasswordVisible((prev) => !prev)}
              >
                {isPasswordVisible ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5"
                  >
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          ) : null}

          {/* BUTTON */}
          <button type="submit" className="btn-admin w-full">
            {resetTokenFromUrl
              ? "Reset password"
              : isForgotPasswordMode
                ? "Send reset link"
                : isLogin
                  ? "Sign in"
                  : "Register"}
          </button>
        </form>

        {!resetTokenFromUrl && !isForgotPasswordMode ? (
          <div className="mt-5 space-y-3">
            <div className="flex items-center gap-3 text-sm uppercase tracking-[0.15em] text-[var(--text-muted)]">
              <span className="h-px flex-1 bg-[var(--border-strong)]" />
              <span>Or continue with</span>
              <span className="h-px flex-1 bg-[var(--border-strong)]" />
            </div>

            {googleClientId ? (
              <div
                ref={googleButtonRef}
                className="flex min-h-[44px] items-center justify-center"
                aria-label="Sign in with Google"
              />
            ) : (
              <button
                type="button"
                disabled
                className="btn-secondary w-full opacity-80"
              >
                Continue with Google
              </button>
            )}

            <p className="text-center text-sm text-[var(--text-secondary)]">
              {isLogin
                ? "Use your existing Google account to sign in instantly."
                : "Create your account using your existing Google account."}
            </p>

            {!googleClientId ? (
              <p className="text-center text-sm text-[var(--warning-text)]">
                Google sign-in is not configured yet. Add{" "}
                <code>NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> in the frontend env to
                enable this button.
              </p>
            ) : null}

            {isGoogleLoading ? (
              <p className="text-center text-sm text-emerald-500">
                Finishing Google sign-in...
              </p>
            ) : null}
          </div>
        ) : null}

        {showVerificationTools || Boolean(verifyTokenFromUrl) ? (
          <div className="mt-6 space-y-3 rounded-[1.5rem] border border-[var(--border-color)] bg-[var(--bg-secondary)]/80 p-4">
            <p className="text-sm text-[var(--text-secondary)]">
              Verify your email before signing in. Use the link sent to your
              inbox.
            </p>

            <button
              type="button"
              onClick={handleResendVerification}
              className="btn-secondary w-full"
            >
              Resend verification email
            </button>
          </div>
        ) : null}

        {isLogin && !resetTokenFromUrl ? (
          <button
            type="button"
            onClick={() => {
              setIsForgotPasswordMode(!isForgotPasswordMode);
            }}
            className="mt-4 text-sm text-emerald-300 hover:underline"
          >
            {isForgotPasswordMode ? "Back to sign in" : "Forgot password?"}
          </button>
        ) : null}

        {/* SWITCH */}
        <p className="mt-6 text-center text-sm text-slate-400">
          {isLogin ? "New here?" : "Already have an account with us?"}{" "}
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setIsForgotPasswordMode(false);
            }}
            className="text-emerald-300 hover:underline"
          >
            {isLogin ? "Create an account" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}

function LoginPageFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <p className="text-sm text-[var(--text-muted)]">Loading...</p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageFallback />}>
      <LoginPageInner />
    </Suspense>
  );
}
