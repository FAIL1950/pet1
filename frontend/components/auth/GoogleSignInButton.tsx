"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import GoogleIcon from "@mui/icons-material/Google";
import { AFTER_AUTH_REDIRECT, authClient } from "@/lib/auth/client";
import { authErrorKey, type AuthErrorKey } from "@/lib/auth/errors";

export default function GoogleSignInButton() {
  const t = useTranslations("AuthForm");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<AuthErrorKey | null>(null);

  const handleClick = async () => {
    setPending(true);
    setError(null);
    try {
      // On success the client navigates to Google, so the pending state is only reset on failure.
      const { error } = await authClient.signIn.social({
        provider: "google",
        // Absolute: the OAuth callback is handled by the auth service, which then redirects here.
        callbackURL: `${window.location.origin}${AFTER_AUTH_REDIRECT}`,
      });
      if (error) {
        setError(authErrorKey(error));
        setPending(false);
      }
    } catch {
      setError(authErrorKey(null));
      setPending(false);
    }
  };

  return (
    <Stack spacing={2}>
      {error && <Alert severity="error">{t(`errors.${error}`)}</Alert>}
      <Button
        variant="outlined"
        size="large"
        fullWidth
        startIcon={<GoogleIcon />}
        loading={pending}
        onClick={handleClick}
      >
        {t("continueWithGoogle")}
      </Button>
    </Stack>
  );
}
