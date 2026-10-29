import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { getTranslations } from "next-intl/server";
import BoardView from "@/components/boards/BoardView";
import { requireSession } from "@/lib/auth/session";
import { fetchBoard } from "@/lib/boards/server";

export async function generateMetadata({ params }: PageProps<"/boards/[boardId]">): Promise<Metadata> {
  const { boardId } = await params;
  const board = await fetchBoard(boardId).catch(() => null);
  if (board) return { title: board.title };
  const t = await getTranslations("BoardPage");
  return { title: t("title") };
}

// Full-width workspace (no Container): boards scroll horizontally on small screens.
export default async function BoardPage({ params }: PageProps<"/boards/[boardId]">) {
  const { boardId } = await params;
  await requireSession(`/boards/${encodeURIComponent(boardId)}`);
  const [board, tRole] = await Promise.all([fetchBoard(boardId), getTranslations("BoardRole")]);
  if (!board) notFound();

  return (
    <Box sx={{ flex: 1, px: { xs: 2, md: 3 }, py: 3, overflowX: "auto" }}>
      <Stack direction="row" sx={{ gap: 1, alignItems: "center", mb: board.description ? 0.5 : 2 }}>
        <Typography variant="h5" component="h1" sx={{ overflowWrap: "anywhere" }}>
          {board.title}
        </Typography>
        <Chip size="small" label={tRole(board.role)} />
      </Stack>
      {board.description && (
        <Typography color="text.secondary" sx={{ mb: 2, whiteSpace: "pre-line" }}>
          {board.description}
        </Typography>
      )}

      <BoardView board={board} />
    </Box>
  );
}
