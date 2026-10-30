"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import { authClient } from "@/lib/auth/client";
import { clearAccessToken } from "@/lib/auth/token";
import { authErrorKey, type AuthErrorKey } from "@/lib/auth/errors";
import { verifiedUrl } from "@/lib/auth/redirect";

/** Seconds before another email can be requested. */
const COOLDOWN_SECONDS = 60;

type ResendVerificationButtonProps = {
  email: string;
  /** Where to continue after verifying. */
  callbackPath: string;
};

/** Asks Better Auth for a new verification email; then waits a minute before allowing another. */
export default function ResendVerificationButton({
  email,
  callbackPath,
}: ResendVerificationButtonProps) {
  const t = useTranslations("CheckEmailPage");
  const tErrors = useTranslations("AuthForm.errors");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<AuthErrorKey | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const resend = async () => {
    setSending(true);
    setError(null);
    try {
      const request = () =>
        authClient.sendVerificationEmail({ email, callbackURL: verifiedUrl(callbackPath) });
      let { error: resendError } = await request();
      // With a session, Better Auth only resends for that session's own email. A leftover session
      // of another account (e.g. signed in before signing up) is dropped, then the request retried.
      if (resendError?.code === "EMAIL_MISMATCH") {
        await authClient.signOut();
        clearAccessToken();
        ({ error: resendError } = await request());
      }
      if (resendError) {
        setError(authErrorKey(resendError));
        return;
      }
      setSent(true);
      setCooldown(COOLDOWN_SECONDS);
    } catch {
      setError(authErrorKey(null));
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {sent && !error && <Alert severity="success">{t("resent")}</Alert>}
      {error && <Alert severity="error">{tErrors(error)}</Alert>}
      <Button
        variant="outlined"
        onClick={resend}
        loading={sending}
        disabled={cooldown > 0}
        fullWidth
      >
        {cooldown > 0 ? t("resendIn", { seconds: cooldown }) : t("resend")}
      </Button>
    </>
  );
}
