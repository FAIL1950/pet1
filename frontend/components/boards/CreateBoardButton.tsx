"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Button from "@mui/material/Button";
import AddIcon from "@mui/icons-material/Add";
import CreateBoardDialog from "./CreateBoardDialog";

export default function CreateBoardButton() {
  const t = useTranslations("BoardsPage");
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="contained" disableElevation startIcon={<AddIcon />} onClick={() => setOpen(true)}>
        {t("create")}
      </Button>
      <CreateBoardDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
