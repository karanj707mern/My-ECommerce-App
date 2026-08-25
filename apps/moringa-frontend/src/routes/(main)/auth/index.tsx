import { $, component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";
import {
  Link,
  useLocation,
  useNavigate,
  type DocumentHead,
} from "@builder.io/qwik-city";
import ThemeToggle from "../../../components/ThemeToggle";
import {
  forgotPassword,
  loginUser,
  loginWithGoogle,
  registerUser,
  resendVerification,
  resetPassword,
  verifyEmail,
} from "../../../lib/api/auth";
import { clearToken, setCurrentUser } from "../../../lib/storage";
import { useToast } from "../../../hooks/useToast";
import { useAuthState } from "../../../hooks/useAuthState";
import { buildHead } from "../../../lib/seo";
import { env } from "../../../lib/env";

/* ------------------------------------------------------------------ */
/* Google Identity script loader (module-level single-flight cache)    */
/* ------------------------------------------------------------------ */

interface GoogleIdApi {
  initialize: (opts: unknown) => void;
  renderButton: (parent: HTMLDivElement, opts: Record<string, unknown>) => void;
}

function getGoogleId(): GoogleIdApi | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as {
    google?: { accounts?: { id?: GoogleIdApi } };
  };
  return w.google?.accounts?.id;
}

let googleScriptPromise: Promise<void> | null = null;

function loadGoogleIdentityScript(): Promise<void> {
  if (getGoogleId()) {
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

/**
 * Mutable Google-SignIn state lives in a holder OBJECT, never in bare
 * module-level `let` bindings: the Qwik optimizer extracts $()-wrapped tasks
 * into separate QRL chunks and shares module state with them via imports —
 * reassigning an imported binding is illegal ESM (Rollup
 * "ImportReassignment" build failure), while mutating a property of an
 * imported object is fine. Same idiom as `toastCounter` in lib/toast.ts.
 */
const googleAuthState = {
  initializedClientId: "",
  credentialHandler: null as
    ((response: { credential: string }) => void) | null,
};

const inputClassName = "input-field-dark";

type AuthUserPayload = { user: Record<string, unknown> };

/**
 * Qwik port of the legacy auth page.
 * Login / register / forgot / reset / verify-email flows + Google Sign-In.
 */
export default component$(() => {
  const loc = useLocation();
  const nav = useNavigate();
  const toast = useToast();
  const { currentUser, authChecked } = useAuthState();

  const url = new URL(loc.url.href);
  const modeFromUrl = url.searchParams.get("mode");
  const tokenFromUrl = url.searchParams.get("token");
  const legacyVerifyToken = url.searchParams.get("verifyToken");
  const verifyTokenFromUrl =
    modeFromUrl === "verify-email" ? tokenFromUrl : legacyVerifyToken;
  const resetTokenFromUrl =
    modeFromUrl === "reset-password" ? tokenFromUrl : null;
  const rawFrom = url.searchParams.get("from");
  const fromParam =
    rawFrom && rawFrom.startsWith("/") && !rawFrom.startsWith("//")
      ? rawFrom
      : "/";

  const isLogin = useSignal(true);
  const isForgotPasswordMode = useSignal(false);
  const name = useSignal("");
  const email = useSignal("");
  const password = useSignal("");
  const resetPasswordValue = useSignal("");
  const isPasswordVisible = useSignal(false);
  const isResetPasswordVisible = useSignal(false);
  const showVerificationTools = useSignal(false);
  const isGoogleLoading = useSignal(false);
  const googleButtonRef = useSignal<HTMLDivElement>();

  const isAuthenticated = !!currentUser.value;

  useVisibleTask$(async ({ track }) => {
    /* Redirect already-authenticated users (unless mid token flow). */
    if (
      track(authChecked) &&
      isAuthenticated &&
      !resetTokenFromUrl &&
      !verifyTokenFromUrl
    ) {
      await nav(currentUser.value?.role === "ADMIN" ? "/admin" : "/", {
        scroll: false,
      });
      return;
    }

    if (!verifyTokenFromUrl && !resetTokenFromUrl) return;

    if (resetTokenFromUrl) {
      isLogin.value = true;
      isForgotPasswordMode.value = true;
      await toast.showToast({
        severity: "info",
        summary: "Password reset",
        detail: "Enter a new password to finish resetting your account.",
        life: 3000,
      });
    }

    if (verifyTokenFromUrl) {
      try {
        const data = (await verifyEmail(verifyTokenFromUrl)) as {
          message?: string;
        };
        await toast.showToast({
          severity: "success",
          summary: "Verification successful",
          detail: data?.message,
          life: 4000,
        });
        showVerificationTools.value = false;
        isForgotPasswordMode.value = false;
      } catch (err) {
        await toast.showToast({
          severity: "error",
          summary: "Verification failed",
          detail:
            err instanceof Error && err.message
              ? err.message
              : "Verification failed",
          life: 5000,
        });
      }
    }
  });

  const finishAuthenticatedLogin = $(
    async (data: AuthUserPayload, successMessage: string) => {
      showVerificationTools.value = false;
      setCurrentUser(data.user);

      if (data.user?.role === "ADMIN") {
        await nav("/admin?cartMessage=" + encodeURIComponent(successMessage));
        return;
      }

      let redirectMessage = successMessage;
      if (fromParam === "/cart" || fromParam === "/wishlist") {
        redirectMessage =
          "Welcome back! Your saved items have been restored to your account.";
      }

      await nav(
        fromParam + "?cartMessage=" + encodeURIComponent(redirectMessage),
      );
    },
  );

  /* Google button rendering (client only). */
  useVisibleTask$(async ({ track }) => {
    const googleClientId = env.googleClientId();
    const loginMode = track(isLogin);
    if (!googleClientId || !googleButtonRef.value || resetTokenFromUrl) {
      return;
    }

    loadGoogleIdentityScript()
      .then(() => {
        const googleId = getGoogleId();
        const el = googleButtonRef.value;
        if (!el || !googleId) return;

        if (
          !googleAuthState.credentialHandler ||
          googleAuthState.initializedClientId !== googleClientId
        ) {
          googleAuthState.credentialHandler = async (response: {
            credential: string;
          }) => {
            if (!response.credential) {
              void toast.showToast({
                severity: "error",
                summary: "Google sign-in",
                detail: "Google sign-in did not return a valid credential.",
                life: 4000,
              });
              return;
            }
            isGoogleLoading.value = true;
            showVerificationTools.value = false;
            try {
              const data = (await loginWithGoogle(
                response.credential,
              )) as AuthUserPayload;
              await finishAuthenticatedLogin(
                data,
                "Google sign-in successful. You can now continue shopping.",
              );
            } catch (err) {
              void toast.showToast({
                severity: "error",
                summary: "Google sign-in failed",
                detail:
                  err instanceof Error && err.message
                    ? err.message
                    : "Google sign-in failed.",
                life: 4000,
              });
            } finally {
              isGoogleLoading.value = false;
            }
          };

          googleId.initialize({
            client_id: googleClientId,
            callback: (response: { credential: string }) =>
              googleAuthState.credentialHandler?.(response),
          });
          googleAuthState.initializedClientId = googleClientId;
        }

        el.innerHTML = "";
        const isMobile =
          typeof window !== "undefined" && window.innerWidth < 640;
        googleId.renderButton(el, {
          theme: "outline",
          size: isMobile ? "medium" : "large",
          width: isMobile ? el.clientWidth || 280 : 300,
          text: loginMode ? "signin_with" : "signup_with",
          shape: "pill",
        });
      })
      .catch(async (err: unknown) => {
        await toast.showToast({
          severity: "error",
          summary: "Google sign-in",
          detail:
            err instanceof Error && err.message
              ? err.message
              : "Could not load Google sign-in.",
          life: 4000,
        });
      });
  });

  const handleSubmit = $(async () => {
    try {
      if (resetTokenFromUrl) {
        const data = (await resetPassword(
          resetTokenFromUrl,
          resetPasswordValue.value,
        )) as { message: string; email: string };
        const loginData = (await loginUser(
          data.email,
          resetPasswordValue.value,
        )) as AuthUserPayload;
        await toast.showToast({
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

      if (isForgotPasswordMode.value) {
        const data = (await forgotPassword(email.value)) as { message: string };
        await toast.showToast({
          severity: "success",
          summary: "Reset link sent",
          detail: data.message,
          life: 4000,
        });
        return;
      }

      if (isLogin.value) {
        const data = (await loginUser(
          email.value,
          password.value,
        )) as AuthUserPayload;
        await finishAuthenticatedLogin(
          data,
          "Login successful. You can now add items to your cart.",
        );
        await toast.showToast({
          severity: "success",
          summary: "Login successful",
          detail: "You can now add items to your cart.",
          life: 3000,
        });
        return;
      }

      clearToken();
      const data = (await registerUser(
        name.value,
        email.value,
        password.value,
      )) as { message: string; user: Record<string, unknown> };
      const message =
        data.message ||
        "Registration successful. Check your email to verify your account.";
      showVerificationTools.value = true;
      isLogin.value = true;
      await toast.showToast({
        severity: "success",
        summary: "Account created",
        detail: message,
        life: 4000,
      });
    } catch (err) {
      const message =
        err instanceof Error && err.message ? err.message : "Request failed";
      await toast.showToast({
        severity: "error",
        summary: "Authentication failed",
        detail: message,
        life: 5000,
      });
      if (message.toLowerCase().includes("verify your email")) {
        showVerificationTools.value = true;
      }
    }
  });

  const handleResendVerification = $(async () => {
    showVerificationTools.value = false;

    try {
      const data = (await resendVerification(email.value)) as {
        message: string;
      };
      await toast.showToast({
        severity: "success",
        summary: "Verification email sent",
        detail: data.message,
        life: 4000,
      });
      showVerificationTools.value = true;
    } catch (err) {
      await toast.showToast({
        severity: "error",
        summary: "Could not resend verification email",
        detail:
          err instanceof Error && err.message
            ? err.message
            : "Could not resend verification email",
        life: 4000,
      });
    }
  });

  const EyeIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );

  const EyeOffIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );

  const googleClientId = env.googleClientId();

  return (
    <div class="relative flex min-h-screen items-center justify-center px-4 py-8 theme-transition sm:px-6">
      <div class="absolute left-4 right-4 top-4 flex items-center justify-between sm:left-8 sm:top-6">
        <Link
          href="/"
          class="font-serif text-xl text-white transition hover:text-emerald-200 sm:text-2xl"
        >
          Moringa Store Online
        </Link>
        <ThemeToggle />
      </div>

      {/* BACKGROUND */}
      <div class="absolute inset-0">
        <img
          src="/bg-login.webp"
          alt=""
          width={1920}
          height={1080}
          class="h-full w-full object-cover"
          aria-hidden="true"
        />
        <div class="absolute inset-0 bg-gradient-to-br from-slate-950/90 via-emerald-950/70 to-black/85 backdrop-blur-sm" />
      </div>

      {/* CARD */}
      <div class="relative z-10 w-full max-w-md rounded-[2rem] border border-emerald-400/20 bg-slate-950/88 p-5 text-slate-100 shadow-[0_30px_80px_rgba(0,0,0,0.45)] sm:p-8">
        {/* TITLE */}
        <h1 class="text-2xl font-semibold text-white">
          {resetTokenFromUrl ? (
            "Reset password"
          ) : isForgotPasswordMode.value ? (
            "Forgot password"
          ) : isLogin.value ? (
            <>
              Sign in to <span class="text-emerald-300">Moringa Store</span>
            </>
          ) : (
            "Create your account"
          )}
        </h1>

        {!resetTokenFromUrl && !isForgotPasswordMode.value ? (
          <p class="mt-2 text-sm text-slate-300">
            {isLogin.value
              ? "Already have an account with us? Sign in to continue."
              : "Register first to save your cart, place orders, and track deliveries."}
          </p>
        ) : null}

        {/* FORM */}
        <form
          preventdefault:submit
          onSubmit$={handleSubmit}
          class="mt-6 space-y-4"
        >
          {!isLogin.value &&
            !isForgotPasswordMode.value &&
            !resetTokenFromUrl && (
              <input
                placeholder="Full name"
                aria-label="Full name"
                autoComplete="name"
                value={name.value}
                onInput$={(_, el) => (name.value = el.value)}
                class={inputClassName}
              />
            )}

          {!resetTokenFromUrl ? (
            <input
              placeholder="Email"
              aria-label="Email"
              type="email"
              autoComplete="email"
              spellcheck={false}
              value={email.value}
              onInput$={(_, el) => (email.value = el.value)}
              class={inputClassName}
            />
          ) : null}

          {resetTokenFromUrl ? (
            <div class="relative">
              <input
                type={isResetPasswordVisible.value ? "text" : "password"}
                placeholder="New password"
                aria-label="New password"
                autoComplete="new-password"
                value={resetPasswordValue.value}
                onInput$={(_, el) => (resetPasswordValue.value = el.value)}
                class={inputClassName}
              />
              <button
                type="button"
                aria-label={
                  isResetPasswordVisible.value
                    ? "Hide password"
                    : "Show password"
                }
                class="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                onClick$={() => {
                  isResetPasswordVisible.value = !isResetPasswordVisible.value;
                }}
              >
                {isResetPasswordVisible.value ? <EyeIcon /> : <EyeOffIcon />}
              </button>
            </div>
          ) : !isForgotPasswordMode.value ? (
            <div class="relative">
              <input
                type={isPasswordVisible.value ? "text" : "password"}
                placeholder="Password"
                aria-label="Password"
                autoComplete="current-password"
                value={password.value}
                onInput$={(_, el) => (password.value = el.value)}
                class={inputClassName}
              />
              <button
                type="button"
                aria-label={
                  isPasswordVisible.value ? "Hide password" : "Show password"
                }
                class="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                onClick$={() => {
                  isPasswordVisible.value = !isPasswordVisible.value;
                }}
              >
                {isPasswordVisible.value ? <EyeIcon /> : <EyeOffIcon />}
              </button>
            </div>
          ) : null}

          <button type="submit" class="btn-admin w-full">
            {resetTokenFromUrl
              ? "Reset password"
              : isForgotPasswordMode.value
                ? "Send reset link"
                : isLogin.value
                  ? "Sign in"
                  : "Register"}
          </button>
        </form>

        {!resetTokenFromUrl && !isForgotPasswordMode.value ? (
          <div class="mt-5 space-y-3">
            <div class="flex items-center gap-3 text-sm uppercase tracking-[0.15em] text-[var(--text-muted)]">
              <span class="h-px flex-1 bg-[var(--border-strong)]" />
              <span>Or continue with</span>
              <span class="h-px flex-1 bg-[var(--border-strong)]" />
            </div>

            {googleClientId ? (
              <div
                ref={googleButtonRef}
                class="flex min-h-[44px] items-center justify-center"
                aria-label="Sign in with Google"
              />
            ) : (
              <button
                type="button"
                disabled
                class="btn-secondary w-full opacity-80"
              >
                Continue with Google
              </button>
            )}

            <p class="text-center text-sm text-[var(--text-secondary)]">
              {isLogin.value
                ? "Use your existing Google account to sign in instantly."
                : "Create your account using your existing Google account."}
            </p>

            {!googleClientId ? (
              <p class="text-center text-sm text-[var(--warning-text)]">
                Google sign-in is not configured yet. Add{" "}
                <code>VITE_GOOGLE_CLIENT_ID</code> in the frontend env to enable
                this button.
              </p>
            ) : null}

            {isGoogleLoading.value ? (
              <p class="text-center text-sm text-emerald-500">
                Finishing Google sign-in...
              </p>
            ) : null}
          </div>
        ) : null}

        {showVerificationTools.value || Boolean(verifyTokenFromUrl) ? (
          <div class="mt-6 space-y-3 rounded-[1.5rem] border border-[var(--border-color)] bg-[var(--bg-secondary)]/80 p-4">
            <p class="text-sm text-[var(--text-secondary)]">
              Verify your email before signing in. Use the link sent to your
              inbox.
            </p>

            <button
              type="button"
              onClick$={handleResendVerification}
              class="btn-secondary w-full"
            >
              Resend verification email
            </button>
          </div>
        ) : null}

        {isLogin.value && !resetTokenFromUrl ? (
          <button
            type="button"
            onClick$={() => {
              isForgotPasswordMode.value = !isForgotPasswordMode.value;
            }}
            class="mt-4 text-sm text-emerald-300 hover:underline"
          >
            {isForgotPasswordMode.value
              ? "Back to sign in"
              : "Forgot password?"}
          </button>
        ) : null}

        {/* SWITCH */}
        <p class="mt-6 text-center text-sm text-slate-400">
          {isLogin.value ? "New here?" : "Already have an account with us?"}{" "}
          <button
            type="button"
            onClick$={() => {
              isLogin.value = !isLogin.value;
              isForgotPasswordMode.value = false;
            }}
            class="text-emerald-300 hover:underline"
          >
            {isLogin.value ? "Create an account" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
});

export const head: DocumentHead = () =>
  buildHead({
    title: "Sign In",
    description:
      "Sign in or create your Moringa Store Online account to save your cart, place orders, and track deliveries.",
    path: "/auth",
  });
