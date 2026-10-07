import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import AuthCard from "@/components/auth/AuthCard";
import SignUpForm from "@/components/auth/SignUpForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("SignUpPage");
  return { title: t("title") };
}

export default async function SignUpPage() {
  const t = await getTranslations("SignUpPage");

  return (
    <AuthCard
      title={t("title")}
      subtitle={t("subtitle")}
      footerText={t("haveAccount")}
      footerLinkText={t("switchLink")}
      footerHref="/auth/sign-in"
    >
      <SignUpForm />
    </AuthCard>
  );
}
