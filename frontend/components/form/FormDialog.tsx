"use client";

import type { FormEventHandler, ReactNode } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";

type FormDialogProps = {
  open: boolean;
  onClose: () => void;
  /** Called after the closing animation, e.g. to reset the form without it flashing empty. */
  onExited?: () => void;
  title: string;
  submitLabel: string;
  cancelLabel: string;
  onSubmit: FormEventHandler<HTMLFormElement>;
  /** Disables closing and shows the submit button as loading. */
  busy: boolean;
  /** Already translated server error, shown above the fields. */
  error?: string;
  children: ReactNode;
};

/** Dialog with a form: title, fields, an optional error alert and Cancel/Submit actions. */
export default function FormDialog({
  open,
  onClose,
  onExited,
  title,
  submitLabel,
  cancelLabel,
  onSubmit,
  busy,
  error,
  children,
}: FormDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onClose}
      fullWidth
      maxWidth="sm"
      slotProps={{ transition: { onExited } }}
    >
      <DialogTitle>{title}</DialogTitle>
      {/* Flex column keeps DialogContent scrollable between the title and the actions. */}
      <Box
        component="form"
        noValidate
        onSubmit={onSubmit}
        sx={{ display: "flex", flexDirection: "column", minHeight: 0 }}
      >
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            {children}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button type="submit" variant="contained" disableElevation loading={busy}>
            {submitLabel}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
