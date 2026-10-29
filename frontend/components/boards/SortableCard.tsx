"use client";

import { useSortable } from "@dnd-kit/react/sortable";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { BoardCard } from "@/lib/boards/types";
import ItemMenu from "./ItemMenu";

/** dnd-kit type of cards; columns accept it so cards can be dropped into empty columns. */
export const CARD_DND_TYPE = "card";

type SortableCardProps = {
  card: BoardCard;
  index: number;
  columnId: string;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
};

/** A card that can be dragged within and between columns (the whole card is the handle). */
export default function SortableCard({
  card,
  index,
  columnId,
  canEdit,
  onEdit,
  onDelete,
}: SortableCardProps) {
  const { ref, isDragging } = useSortable({
    id: card.id,
    index,
    group: columnId,
    type: CARD_DND_TYPE,
    accept: CARD_DND_TYPE,
    disabled: !canEdit,
  });

  return (
    <Paper
      ref={ref}
      component="article"
      sx={{
        p: 1.5,
        pr: canEdit ? 0.5 : 1.5,
        opacity: isDragging ? 0.5 : 1,
        cursor: canEdit ? "grab" : undefined,
        touchAction: canEdit ? "none" : undefined,
      }}
    >
      <Stack direction="row" sx={{ gap: 0.5, alignItems: "flex-start" }}>
        <Typography variant="body2" sx={{ flex: 1, fontWeight: 500, overflowWrap: "anywhere" }}>
          {card.title}
        </Typography>
        {canEdit && <ItemMenu title={card.title} onEdit={onEdit} onDelete={onDelete} />}
      </Stack>
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
  );
}
