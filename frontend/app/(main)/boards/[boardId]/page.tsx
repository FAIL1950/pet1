import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Box from "@mui/material/Box";
import { getTranslations } from "next-intl/server";
import BoardInfo from "@/components/boards/BoardInfo";
import BoardMembersButton from "@/components/boards/BoardMembersButton";
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
  const { user } = await requireSession(`/boards/${encodeURIComponent(boardId)}`);
  const board = await fetchBoard(boardId);
  if (!board) notFound();

  return (
    <Box sx={{ flex: 1, px: { xs: 2, md: 3 }, py: 3, overflowX: "auto" }}>
      <BoardInfo
        title={board.title}
        description={board.description}
        role={board.role}
        actions={
          <BoardMembersButton boardId={board.id} role={board.role} currentUserId={user.id} />
        }
      />

      {/* A new version (any write) resets BoardView's optimistic drag state to the server's. */}
      <BoardView key={board.version} board={board} />
    </Box>
  );
}
