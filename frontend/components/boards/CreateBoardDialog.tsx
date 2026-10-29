"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import FormDialog from "@/components/form/FormDialog";
import FormTextField from "@/components/form/FormTextField";
import { createBoard } from "@/lib/boards/api";
import { boardsApiErrorKey, type BoardsApiErrorKey } from "@/lib/boards/errors";
import {
  BOARD_DESCRIPTION_MAX_LENGTH,
  BOARD_TITLE_MAX_LENGTH,
  createBoardSchema,
  type CreateBoardValues,
} from "@/lib/boards/schemas";

type CreateBoardDialogProps = {
  open: boolean;
  onClose: () => void;
};

export default function CreateBoardDialog({ open, onClose }: CreateBoardDialogProps) {
  const t = useTranslations("CreateBoardDialog");
  const tErrors = useTranslations("BoardsApiErrors");
  const router = useRouter();
  const {
    control,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<CreateBoardValues>({
    resolver: zodResolver(createBoardSchema),
    defaultValues: { title: "", description: "" },
    mode: "onTouched",
  });

  const onSubmit = async (values: CreateBoardValues) => {
    try {
      const { boardId } = await createBoard(values);
      router.push(`/boards/${boardId}`);
    } catch (error) {
      setError("root.serverError", { message: boardsApiErrorKey(error) });
    }
  };

  // Stays busy while navigating to the new board after a successful create.
  const busy = isSubmitting || isSubmitSuccessful;
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
      busy={busy}
      error={serverError && tErrors(serverError)}
    >
      <FormTextField
        control={control}
        name="title"
        label={t("name")}
        required
        fullWidth
        autoFocus
        slotProps={{ htmlInput: { maxLength: BOARD_TITLE_MAX_LENGTH } }}
      />
      <FormTextField
        control={control}
        name="description"
        label={t("description")}
        fullWidth
        multiline
        minRows={3}
        slotProps={{ htmlInput: { maxLength: BOARD_DESCRIPTION_MAX_LENGTH } }}
      />
    </FormDialog>
  );
}
