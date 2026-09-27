import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Typography from "@mui/material/Typography";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("SignInPage");
  return { title: t("title") };
}

export default async function SignInPage() {
  const t = await getTranslations("SignInPage");

  return (
    <Typography variant="h4" component="h1">
      {t("title")}
    </Typography>
  );
}
