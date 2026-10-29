"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import FormDialog from "@/components/form/FormDialog";
import FormTextField from "@/components/form/FormTextField";
import { createColumn, updateColumn } from "@/lib/boards/api";
import { boardsApiErrorKey, type BoardsApiErrorKey } from "@/lib/boards/errors";
import {
  COLUMN_TITLE_MAX_LENGTH,
  createColumnSchema,
  type CreateColumnValues,
} from "@/lib/boards/schemas";
import type { BoardColumn } from "@/lib/boards/types";

type ColumnDialogProps = {
  boardId: string;
  /** The column to edit; omit to create a new one. Remount (key) the dialog per column. */
  column?: BoardColumn;
  open: boolean;
  onClose: () => void;
};

export default function ColumnDialog({ boardId, column, open, onClose }: ColumnDialogProps) {
  const t = useTranslations("ColumnDialog");
  const tErrors = useTranslations("BoardsApiErrors");
  const router = useRouter();
  const {
    control,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateColumnValues>({
    resolver: zodResolver(createColumnSchema),
    defaultValues: { title: column?.title ?? "" },
    mode: "onTouched",
  });

  const onSubmit = async (values: CreateColumnValues) => {
    try {
      if (column) await updateColumn(boardId, column.id, values);
      else await createColumn(boardId, values);
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
      title={t(column ? "editTitle" : "createTitle")}
      submitLabel={t(column ? "save" : "create")}
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
        slotProps={{ htmlInput: { maxLength: COLUMN_TITLE_MAX_LENGTH } }}
      />
    </FormDialog>
  );
}
