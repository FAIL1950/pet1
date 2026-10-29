import type { Metadata } from "next";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { getTranslations } from "next-intl/server";
import BoardListItem from "@/components/boards/BoardListItem";
import CreateBoardButton from "@/components/boards/CreateBoardButton";
import PageContainer from "@/components/layout/PageContainer";
import { requireSession } from "@/lib/auth/session";
import { fetchBoards } from "@/lib/boards/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("BoardsPage");
  return { title: t("title") };
}

export default async function BoardsPage() {
  await requireSession("/boards");
  const [t, boards] = await Promise.all([getTranslations("BoardsPage"), fetchBoards()]);

  return (
    <PageContainer title={t("title")} actions={<CreateBoardButton />}>
      {boards.length === 0 ? (
        <Typography color="text.secondary">{t("empty")}</Typography>
      ) : (
        // Same grid as loading.tsx.
        <Box
          component="ul"
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)" },
            gap: 2,
            listStyle: "none",
            p: 0,
            m: 0,
          }}
        >
          {boards.map((board) => (
            <li key={board.id}>
              <BoardListItem board={board} />
            </li>
          ))}
        </Box>
      )}
    </PageContainer>
  );
}
