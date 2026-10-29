"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";
import { canEditContent, type BoardDetails } from "@/lib/boards/types";
import { COLUMN_WIDTH } from "./constants";
import CreateCardDialog from "./CreateCardDialog";
import CreateColumnDialog from "./CreateColumnDialog";

/** Columns left to right with their cards; add buttons for OWNER/EDITOR (the server re-checks). */
export default function BoardView({ board }: { board: BoardDetails }) {
  const t = useTranslations("BoardPage");
  const [columnDialogOpen, setColumnDialogOpen] = useState(false);
  const [cardColumnId, setCardColumnId] = useState<string | null>(null);
  const canEdit = canEditContent(board.role);

  return (
    <>
      {board.columns.length === 0 && (
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          {t("emptyBoard")}
        </Typography>
      )}

      <Stack direction="row" sx={{ gap: 2, alignItems: "flex-start" }}>
        {board.columns.map((column) => (
          <Paper
            key={column.id}
            component="section"
            variant="outlined"
            aria-label={t("columnActions", { title: column.title })}
            sx={{ width: COLUMN_WIDTH, flexShrink: 0, p: 1.5, bgcolor: "action.hover" }}
          >
            <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 600, mb: 1 }} noWrap>
              {column.title}
            </Typography>

            <Stack sx={{ gap: 1 }}>
              {column.cards.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  {t("emptyColumn")}
                </Typography>
              )}
              {column.cards.map((card) => (
                <Paper key={card.id} component="article" sx={{ p: 1.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500, overflowWrap: "anywhere" }}>
                    {card.title}
                  </Typography>
                  {card.description && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      component="p"
                      sx={{ mt: 0.5, whiteSpace: "pre-line", overflowWrap: "anywhere" }}
                    >
                      {card.description}
                    </Typography>
                  )}
                </Paper>
              ))}
            </Stack>

            {canEdit && (
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={() => setCardColumnId(column.id)}
                sx={{ mt: 1, justifyContent: "flex-start" }}
                fullWidth
              >
                {t("addCard")}
              </Button>
            )}
          </Paper>
        ))}

        {canEdit && (
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => setColumnDialogOpen(true)}
            sx={{ width: COLUMN_WIDTH, flexShrink: 0, justifyContent: "flex-start" }}
          >
            {t("addColumn")}
          </Button>
        )}
      </Stack>

      <CreateColumnDialog
        boardId={board.id}
        open={columnDialogOpen}
        onClose={() => setColumnDialogOpen(false)}
      />
      <CreateCardDialog
        boardId={board.id}
        columnId={cardColumnId}
        onClose={() => setCardColumnId(null)}
      />
    </>
  );
}
