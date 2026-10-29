"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import FormDialog from "@/components/form/FormDialog";
import FormTextField from "@/components/form/FormTextField";
import { createColumn } from "@/lib/boards/api";
import { boardsApiErrorKey, type BoardsApiErrorKey } from "@/lib/boards/errors";
import {
  COLUMN_TITLE_MAX_LENGTH,
  createColumnSchema,
  type CreateColumnValues,
} from "@/lib/boards/schemas";

type CreateColumnDialogProps = {
  boardId: string;
  open: boolean;
  onClose: () => void;
};

export default function CreateColumnDialog({ boardId, open, onClose }: CreateColumnDialogProps) {
  const t = useTranslations("CreateColumnDialog");
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
    defaultValues: { title: "" },
    mode: "onTouched",
  });

  const onSubmit = async (values: CreateColumnValues) => {
    try {
      await createColumn(boardId, values);
      // Re-renders the board page on the server with the new column.
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
        slotProps={{ htmlInput: { maxLength: COLUMN_TITLE_MAX_LENGTH } }}
      />
    </FormDialog>
  );
}
