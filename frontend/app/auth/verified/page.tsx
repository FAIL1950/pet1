import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import ErrorOutlineRounded from "@mui/icons-material/ErrorOutlineRounded";
import TaskAltRounded from "@mui/icons-material/TaskAltRounded";
import Typography from "@mui/material/Typography";
import AuthMessageCard from "@/components/auth/AuthMessageCard";
import LinkButton from "@/components/ui/LinkButton";
import { CALLBACK_URL_PARAM, safeCallbackPath, signInUrl } from "@/lib/auth/redirect";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("VerifiedPage");
  return { title: t("title") };
}

/**
 * Where the verification link lands. On success Better Auth has already signed the user in
 * (autoSignInAfterVerification); on failure it appends `?error=` (e.g. an expired token).
 */
export default async function VerifiedPage({ searchParams }: PageProps<"/auth/verified">) {
  const params = await searchParams;
  const callbackPath = safeCallbackPath(
    typeof params[CALLBACK_URL_PARAM] === "string" ? params[CALLBACK_URL_PARAM] : null,
  );
  const t = await getTranslations("VerifiedPage");

  if (params.error) {
    return (
      <AuthMessageCard
        icon={<ErrorOutlineRounded color="error" sx={{ fontSize: 48 }} />}
        title={t("failedTitle")}
        actions={
          <LinkButton href={signInUrl(callbackPath)} variant="contained" disableElevation fullWidth>
            {t("signIn")}
          </LinkButton>
        }
      >
        <Typography>{t("failedText")}</Typography>
      </AuthMessageCard>
    );
  }

  return (
    <AuthMessageCard
      icon={<TaskAltRounded color="success" sx={{ fontSize: 48 }} />}
      title={t("title")}
      actions={
        <LinkButton href={callbackPath} variant="contained" disableElevation fullWidth>
          {t("continue")}
        </LinkButton>
      }
    >
      <Typography>{t("text")}</Typography>
    </AuthMessageCard>
  );
}
