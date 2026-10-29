"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import FormDialog from "@/components/form/FormDialog";
import FormTextField from "@/components/form/FormTextField";
import { createCard, updateCard } from "@/lib/boards/api";
import { boardsApiErrorKey, type BoardsApiErrorKey } from "@/lib/boards/errors";
import {
  CARD_DESCRIPTION_MAX_LENGTH,
  CARD_TITLE_MAX_LENGTH,
  createCardSchema,
  type CreateCardValues,
} from "@/lib/boards/schemas";
import type { BoardCard } from "@/lib/boards/types";

/** Create a card in a column, or edit an existing card. */
export type CardDialogTarget = { columnId: string; card?: undefined } | { card: BoardCard };

type CardDialogProps = {
  boardId: string;
  /** Remount (key) the dialog per target, so the form starts from its values. */
  target: CardDialogTarget;
  open: boolean;
  onClose: () => void;
};

export default function CardDialog({ boardId, target, open, onClose }: CardDialogProps) {
  const t = useTranslations("CardDialog");
  const tErrors = useTranslations("BoardsApiErrors");
  const router = useRouter();
  const { card } = target;
  const {
    control,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateCardValues>({
    resolver: zodResolver(createCardSchema),
    defaultValues: { title: card?.title ?? "", description: card?.description ?? "" },
    mode: "onTouched",
  });

  const onSubmit = async (values: CreateCardValues) => {
    try {
      if (target.card) await updateCard(boardId, target.card.id, values);
      else await createCard(boardId, target.columnId, values);
      // Re-renders the board page on the server with the change.
      router.refresh();
      onClose();
    } catch (error) {
      setError("root.serverError", { message: boardsApiErrorKey(error) });
    }
  };

  const serverError = errors.root?.serverError?.message as BoardsApiErrorKey | undefined;

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      onExited={() => reset()}
      title={t(card ? "editTitle" : "createTitle")}
      submitLabel={t(card ? "save" : "create")}
      cancelLabel={t("cancel")}
      onSubmit={handleSubmit(onSubmit)}
      busy={isSubmitting}
      error={serverError && tErrors(serverError)}
    >
      <FormTextField
        control={control}
        name="title"
        label={t("name")}
        required
        fullWidth
        autoFocus
        slotProps={{ htmlInput: { maxLength: CARD_TITLE_MAX_LENGTH } }}
      />
      <FormTextField
        control={control}
        name="description"
        label={t("description")}
        fullWidth
        multiline
        minRows={3}
        slotProps={{ htmlInput: { maxLength: CARD_DESCRIPTION_MAX_LENGTH } }}
      />
    </FormDialog>
  );
}
