"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import FormDialog from "@/components/form/FormDialog";
import FormTextField from "@/components/form/FormTextField";
import { createCard } from "@/lib/boards/api";
import { boardsApiErrorKey, type BoardsApiErrorKey } from "@/lib/boards/errors";
import {
  CARD_DESCRIPTION_MAX_LENGTH,
  CARD_TITLE_MAX_LENGTH,
  createCardSchema,
  type CreateCardValues,
} from "@/lib/boards/schemas";

type CreateCardDialogProps = {
  boardId: string;
  /** Column the card is added to; the dialog is open while it's set. */
  columnId: string | null;
  onClose: () => void;
};

export default function CreateCardDialog({ boardId, columnId, onClose }: CreateCardDialogProps) {
  const t = useTranslations("CreateCardDialog");
  const tErrors = useTranslations("BoardsApiErrors");
  const router = useRouter();
  const {
    control,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateCardValues>({
    resolver: zodResolver(createCardSchema),
    defaultValues: { title: "", description: "" },
    mode: "onTouched",
  });

  const onSubmit = async (values: CreateCardValues) => {
    if (!columnId) return;
    try {
      await createCard(boardId, columnId, values);
      // Re-renders the board page on the server with the new card.
      router.refresh();
      onClose();
    } catch (error) {
      setError("root.serverError", { message: boardsApiErrorKey(error) });
    }
  };

  const serverError = errors.root?.serverError?.message as BoardsApiErrorKey | undefined;

  return (
    <FormDialog
      open={columnId !== null}
      onClose={onClose}
      onExited={() => reset()}
      title={t("title")}
      submitLabel={t("submit")}
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
