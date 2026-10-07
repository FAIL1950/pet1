import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import AuthCard from "@/components/auth/AuthCard";
import SignInForm from "@/components/auth/SignInForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("SignInPage");
  return { title: t("title") };
}

export default async function SignInPage() {
  const t = await getTranslations("SignInPage");

  return (
    <AuthCard
      title={t("title")}
      subtitle={t("subtitle")}
      footerText={t("noAccount")}
      footerLinkText={t("switchLink")}
      footerHref="/auth/sign-up"
    >
      <SignInForm />
    </AuthCard>
  );
}
