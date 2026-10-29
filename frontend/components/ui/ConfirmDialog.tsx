"use client";

import { useState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";

type ConfirmDialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  text: string;
  confirmLabel: string;
  cancelLabel: string;
  /** Runs on confirm; the dialog stays busy until it settles. Throw to keep it open. */
  onConfirm: () => Promise<void>;
  /** Already translated error to show (e.g. from the last `onConfirm`). */
  error?: string;
};

/** Destructive-action confirmation: text plus Cancel / confirm (in the error color). */
export default function ConfirmDialog({
  open,
  onClose,
  title,
  text,
  confirmLabel,
  cancelLabel,
  onConfirm,
  error,
}: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
    } catch {
      // The caller reports the failure through `error`.
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <DialogContentText>{text}</DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={busy}>
          {cancelLabel}
        </Button>
        <Button
          onClick={confirm}
          color="error"
          variant="contained"
          disableElevation
          loading={busy}
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
