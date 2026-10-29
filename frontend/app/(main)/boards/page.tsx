import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import CreateBoardButton from "@/components/boards/CreateBoardButton";
import PageContainer from "@/components/layout/PageContainer";
import { requireSession } from "@/lib/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("BoardsPage");
  return { title: t("title") };
}

export default async function BoardsPage() {
  await requireSession("/boards");
  const t = await getTranslations("BoardsPage");

  return <PageContainer title={t("title")} actions={<CreateBoardButton />} />;
}
