"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { move } from "@dnd-kit/helpers";
import { DragDropProvider } from "@dnd-kit/react";
import { isSortable } from "@dnd-kit/react/sortable";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { deleteCard, deleteColumn, moveCard, moveColumn } from "@/lib/boards/api";
import { boardsApiErrorKey, type BoardsApiErrorKey } from "@/lib/boards/errors";
import {
  canEditContent,
  type BoardCard,
  type BoardColumn,
  type BoardDetails,
} from "@/lib/boards/types";
import CardDialog, { type CardDialogTarget } from "./CardDialog";
import ColumnDialog from "./ColumnDialog";
import { COLUMN_WIDTH } from "./constants";
import SortableCard from "./SortableCard";
import SortableColumn, { COLUMN_DND_TYPE } from "./SortableColumn";

type CardsByColumn = Record<string, BoardCard[]>;

type Layout = { columnOrder: string[]; cards: CardsByColumn };

/** A dialog that keeps its target while closing, so the closing animation shows its content. */
type DialogState<T> = { open: boolean; target: T; key: number };

type DeleteTarget = { kind: "column" | "card"; id: string; title: string };

function layoutOf(board: BoardDetails): Layout {
  return {
    columnOrder: board.columns.map((column) => column.id),
    cards: Object.fromEntries(board.columns.map((column) => [column.id, column.cards])),
  };
}

/**
 * Columns left to right with their cards. OWNER/EDITOR get "⋮" menus (edit/delete), add buttons
 * and drag-and-drop; the server re-checks every write.
 *
 * The order is local state for optimistic drags: the page renders this with `key={board.version}`,
 * so after a write + `router.refresh()` it starts over from the server's board.
 */
export default function BoardView({ board }: { board: BoardDetails }) {
  const t = useTranslations("BoardPage");
  const tConfirm = useTranslations("ConfirmDelete");
  const tErrors = useTranslations("BoardsApiErrors");
  const router = useRouter();
  const canEdit = canEditContent(board.role);

  const [columnOrder, setColumnOrder] = useState(() => layoutOf(board).columnOrder);
  const [cards, setCards] = useState(() => layoutOf(board).cards);
  // Latest cards for onDragEnd (the drop position comes from the dragover moves).
  const cardsRef = useRef(cards);
  useEffect(() => {
    cardsRef.current = cards;
  }, [cards]);
  const beforeDrag = useRef<Layout>(layoutOf(board));

  const [moveError, setMoveError] = useState<BoardsApiErrorKey | null>(null);
  const [columnDialog, setColumnDialog] = useState<DialogState<BoardColumn | undefined>>({
    open: false,
    target: undefined,
    key: 0,
  });
  const [cardDialog, setCardDialog] = useState<DialogState<CardDialogTarget> | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<
    DialogState<DeleteTarget> & { error?: BoardsApiErrorKey }
  >();

  const columnsById = new Map(board.columns.map((column) => [column.id, column]));

  const restore = () => {
    setColumnOrder(beforeDrag.current.columnOrder);
    setCards(beforeDrag.current.cards);
  };

  /** Saves a drop; on failure puts everything back and tells the user. */
  const persistMove = async (request: Promise<unknown>) => {
    try {
      await request;
      router.refresh();
    } catch (error) {
      restore();
      setMoveError(boardsApiErrorKey(error));
    }
  };

  const openColumnDialog = (column?: BoardColumn) =>
    setColumnDialog((state) => ({ open: true, target: column, key: state.key + 1 }));
  const openCardDialog = (target: CardDialogTarget) =>
    setCardDialog((state) => ({ open: true, target, key: (state?.key ?? 0) + 1 }));
  const openDeleteDialog = (target: DeleteTarget) =>
    setDeleteDialog((state) => ({ open: true, target, key: (state?.key ?? 0) + 1 }));

  const confirmDelete = async () => {
    if (!deleteDialog) return;
    const { kind, id } = deleteDialog.target;
    try {
      if (kind === "column") await deleteColumn(board.id, id);
      else await deleteCard(board.id, id);
      router.refresh();
      setDeleteDialog({ ...deleteDialog, open: false, error: undefined });
    } catch (error) {
      setDeleteDialog({ ...deleteDialog, error: boardsApiErrorKey(error) });
    }
  };

  return (
    <>
      {columnOrder.length === 0 && (
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          {t("emptyBoard")}
        </Typography>
      )}

      <DragDropProvider
        onDragStart={() => {
          beforeDrag.current = { columnOrder, cards };
        }}
        onDragOver={(event) => {
          // Cards move between columns live; columns are reordered on drop.
          if (event.operation.source?.type === COLUMN_DND_TYPE) return;
          setCards((current) => move(current, event));
        }}
        onDragEnd={(event) => {
          const { source } = event.operation;
          if (event.canceled || !source) {
            restore();
            return;
          }
          const id = String(source.id);

          if (source.type === COLUMN_DND_TYPE) {
            const order = move(columnOrder, event);
            if (order.every((columnId, i) => columnId === columnOrder[i])) return;
            setColumnOrder(order);
            const index = order.indexOf(id);
            void persistMove(moveColumn(board.id, id, index > 0 ? order[index - 1] : null));
            return;
          }

          if (!isSortable(source) || source.group == null) return;
          const columnId = String(source.group);
          if (columnId === String(source.initialGroup) && source.index === source.initialIndex) {
            return;
          }
          const list = cardsRef.current[columnId] ?? [];
          const index = list.findIndex((card) => card.id === id);
          if (index < 0) return;
          void persistMove(
            moveCard(board.id, id, columnId, index > 0 ? list[index - 1].id : null),
          );
        }}
      >
        <Stack direction="row" sx={{ gap: 2, alignItems: "flex-start" }}>
          {columnOrder.map((columnId, columnIndex) => {
            const column = columnsById.get(columnId);
            if (!column) return null;
            const columnCards = cards[columnId] ?? [];
            return (
              <SortableColumn
                key={columnId}
                column={column}
                index={columnIndex}
                canEdit={canEdit}
                onEdit={() => openColumnDialog(column)}
                onDelete={() =>
                  openDeleteDialog({ kind: "column", id: column.id, title: column.title })
                }
              >
                <Stack sx={{ gap: 1, minHeight: 8 }}>
                  {columnCards.length === 0 && (
                    <Typography variant="body2" color="text.secondary">
                      {t("emptyColumn")}
                    </Typography>
                  )}
                  {columnCards.map((card, cardIndex) => (
                    <SortableCard
                      key={card.id}
                      card={card}
                      index={cardIndex}
                      columnId={columnId}
                      canEdit={canEdit}
                      onEdit={() => openCardDialog({ card })}
                      onDelete={() =>
                        openDeleteDialog({ kind: "card", id: card.id, title: card.title })
                      }
                    />
                  ))}
                </Stack>

                {canEdit && (
                  <Button
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => openCardDialog({ columnId })}
                    sx={{ mt: 1, justifyContent: "flex-start" }}
                    fullWidth
                  >
                    {t("addCard")}
                  </Button>
                )}
              </SortableColumn>
            );
          })}

          {canEdit && (
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => openColumnDialog()}
              sx={{ width: COLUMN_WIDTH, flexShrink: 0, justifyContent: "flex-start" }}
            >
              {t("addColumn")}
            </Button>
          )}
        </Stack>
      </DragDropProvider>

      <ColumnDialog
        key={`column-${columnDialog.key}`}
        boardId={board.id}
        column={columnDialog.target}
        open={columnDialog.open}
        onClose={() => setColumnDialog((state) => ({ ...state, open: false }))}
      />
      {cardDialog && (
        <CardDialog
          key={`card-${cardDialog.key}`}
          boardId={board.id}
          target={cardDialog.target}
          open={cardDialog.open}
          onClose={() => setCardDialog({ ...cardDialog, open: false })}
        />
      )}
      {deleteDialog && (
        <ConfirmDialog
          key={`delete-${deleteDialog.key}`}
          open={deleteDialog.open}
          onClose={() => setDeleteDialog({ ...deleteDialog, open: false })}
          title={tConfirm(deleteDialog.target.kind === "column" ? "columnTitle" : "cardTitle")}
          text={tConfirm(deleteDialog.target.kind === "column" ? "columnText" : "cardText", {
            title: deleteDialog.target.title,
          })}
          confirmLabel={tConfirm("confirm")}
          cancelLabel={tConfirm("cancel")}
          onConfirm={confirmDelete}
          error={deleteDialog.error && tErrors(deleteDialog.error)}
        />
      )}

      <Snackbar
        open={moveError !== null}
        autoHideDuration={6000}
        onClose={() => setMoveError(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="error" onClose={() => setMoveError(null)} variant="filled">
          {moveError && tErrors(moveError)}
        </Alert>
      </Snackbar>
    </>
  );
}
