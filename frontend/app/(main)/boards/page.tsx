import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import PageContainer from "@/components/layout/PageContainer";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("BoardsPage");
  return { title: t("title") };
}

export default async function BoardsPage() {
  const t = await getTranslations("BoardsPage");

  return <PageContainer title={t("title")} />;
}
