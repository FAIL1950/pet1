"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import FormTextField from "@/components/form/FormTextField";
import { BoardsApiError, createBoard, type BoardsApiErrorCode } from "@/lib/boards/api";
import {
  BOARD_DESCRIPTION_MAX_LENGTH,
  BOARD_TITLE_MAX_LENGTH,
  createBoardSchema,
  type CreateBoardValues,
} from "@/lib/boards/schemas";

type ServerErrorKey = Exclude<BoardsApiErrorCode, "validation">;

// Client-side validation mirrors the backend, so a 400 here is unexpected — show the generic error.
function serverErrorKey(error: unknown): ServerErrorKey {
  if (!(error instanceof BoardsApiError) || error.code === "validation") return "generic";
  return error.code;
}

type CreateBoardDialogProps = {
  open: boolean;
  onClose: () => void;
};

export default function CreateBoardDialog({ open, onClose }: CreateBoardDialogProps) {
  const t = useTranslations("CreateBoardDialog");
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
      setError("root.serverError", { message: serverErrorKey(error) });
    }
  };

  // Stays busy while navigating to the new board after a successful create.
  const busy = isSubmitting || isSubmitSuccessful;

  const serverError = errors.root?.serverError?.message as ServerErrorKey | undefined;

  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onClose}
      fullWidth
      maxWidth="sm"
      slotProps={{
        // Clear the form only after the closing animation, so it doesn't flash empty.
        transition: { onExited: () => reset() },
      }}
    >
      <DialogTitle>{t("title")}</DialogTitle>
      {/* Flex column keeps DialogContent scrollable between the title and the actions. */}
      <Box
        component="form"
        noValidate
        onSubmit={handleSubmit(onSubmit)}
        sx={{ display: "flex", flexDirection: "column", minHeight: 0 }}
      >
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {serverError && <Alert severity="error">{t(`errors.${serverError}`)}</Alert>}
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
              slotProps={{
                htmlInput: { maxLength: BOARD_DESCRIPTION_MAX_LENGTH },
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} disabled={busy}>
            {t("cancel")}
          </Button>
          <Button type="submit" variant="contained" disableElevation loading={busy}>
            {t("submit")}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
