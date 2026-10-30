import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import MarkEmailUnreadRounded from "@mui/icons-material/MarkEmailUnreadRounded";
import Typography from "@mui/material/Typography";
import AuthMessageCard from "@/components/auth/AuthMessageCard";
import ResendVerificationButton from "@/components/auth/ResendVerificationButton";
import LinkButton from "@/components/ui/LinkButton";
import { CALLBACK_URL_PARAM, safeCallbackPath, signInUrl } from "@/lib/auth/redirect";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("CheckEmailPage");
  return { title: t("title") };
}

/** After sign-up (or a sign-in with an unverified email): the link is on its way. */
export default async function CheckEmailPage({ searchParams }: PageProps<"/auth/check-email">) {
  const params = await searchParams;
  const email = typeof params.email === "string" ? params.email : "";
  const callbackPath = safeCallbackPath(
    typeof params[CALLBACK_URL_PARAM] === "string" ? params[CALLBACK_URL_PARAM] : null,
  );
  const t = await getTranslations("CheckEmailPage");

  return (
    <AuthMessageCard
      icon={<MarkEmailUnreadRounded color="primary" sx={{ fontSize: 48 }} />}
      title={t("title")}
      actions={
        <>
          {email && <ResendVerificationButton email={email} callbackPath={callbackPath} />}
          <LinkButton href={signInUrl(callbackPath)} fullWidth>
            {t("signIn")}
          </LinkButton>
        </>
      }
    >
      <Typography>
        {email
          ? t.rich("sentTo", { email, strong: (chunks) => <strong>{chunks}</strong> })
          : t("sent")}
      </Typography>
      <Typography>{t("hint")}</Typography>
    </AuthMessageCard>
  );
}
