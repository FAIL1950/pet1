"use client";

import NextLink from "next/link";
import { useTranslations } from "next-intl";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { BoardSummary } from "@/lib/boards/types";

// Client component: `component={NextLink}` can't be passed from a Server Component.
export default function BoardListItem({ board }: { board: BoardSummary }) {
  const t = useTranslations("BoardRole");

  return (
    <Card variant="outlined" sx={{ height: "100%" }}>
      <CardActionArea component={NextLink} href={`/boards/${board.id}`} sx={{ height: "100%" }}>
        <CardContent sx={{ height: "100%", minHeight: 120 }}>
          <Stack direction="row" sx={{ gap: 1, alignItems: "flex-start", mb: 1 }}>
            <Typography variant="h6" component="h2" sx={{ flex: 1, minWidth: 0 }} noWrap>
              {board.title}
            </Typography>
            <Chip size="small" label={t(board.role)} />
          </Stack>
          {board.description && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {board.description}
            </Typography>
          )}
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
