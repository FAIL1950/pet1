"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { CollisionPriority } from "@dnd-kit/abstract";
import { useSortable } from "@dnd-kit/react/sortable";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import DragIndicatorRounded from "@mui/icons-material/DragIndicatorRounded";
import type { BoardColumn } from "@/lib/boards/types";
import { COLUMN_WIDTH } from "./constants";
import ItemMenu from "./ItemMenu";
import { CARD_DND_TYPE } from "./SortableCard";

export const COLUMN_DND_TYPE = "column";

type SortableColumnProps = {
  column: BoardColumn;
  index: number;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
  /** Cards and the "add card" button. */
  children: ReactNode;
};

/**
 * A column that can be dragged horizontally by the handle in its header. It also accepts cards,
 * with low collision priority so cards take precedence and empty columns still catch drops.
 */
export default function SortableColumn({
  column,
  index,
  canEdit,
  onEdit,
  onDelete,
  children,
}: SortableColumnProps) {
  const t = useTranslations("BoardPage");
  const { ref, handleRef, isDragging } = useSortable({
    id: column.id,
    index,
    type: COLUMN_DND_TYPE,
    accept: [COLUMN_DND_TYPE, CARD_DND_TYPE],
    collisionPriority: CollisionPriority.Low,
    disabled: !canEdit,
  });

  return (
    <Paper
      ref={ref}
      component="section"
      variant="outlined"
      aria-label={column.title}
      sx={{
        width: COLUMN_WIDTH,
        flexShrink: 0,
        p: 1.5,
        bgcolor: "action.hover",
        opacity: isDragging ? 0.6 : 1,
      }}
    >
      <Stack direction="row" sx={{ alignItems: "center", gap: 0.5, mb: 1 }}>
        {canEdit && (
          <Box
            ref={handleRef}
            role="button"
            tabIndex={0}
            aria-label={t("dragColumn", { title: column.title })}
            sx={{ display: "flex", color: "text.secondary", cursor: "grab", touchAction: "none" }}
          >
            <DragIndicatorRounded fontSize="small" />
          </Box>
        )}
        <Typography
          variant="subtitle1"
          component="h2"
          sx={{ flex: 1, minWidth: 0, fontWeight: 600 }}
          noWrap
        >
          {column.title}
        </Typography>
        {canEdit && <ItemMenu title={column.title} onEdit={onEdit} onDelete={onDelete} />}
      </Stack>
      {children}
    </Paper>
  );
}
