"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Button from "@mui/material/Button";
import PeopleRounded from "@mui/icons-material/PeopleRounded";
import type { BoardRole } from "@/lib/boards/types";
import BoardMembersDialog from "./BoardMembersDialog";

type BoardMembersButtonProps = {
  boardId: string;
  role: BoardRole;
  currentUserId: string;
};

/** "Members" button in the board header; each opening mounts a fresh dialog (reloads the list). */
export default function BoardMembersButton(props: BoardMembersButtonProps) {
  const t = useTranslations("BoardMembers");
  const [dialog, setDialog] = useState({ open: false, key: 0 });

  return (
    <>
      <Button
        variant="outlined"
        size="small"
        startIcon={<PeopleRounded />}
        onClick={() => setDialog((state) => ({ open: true, key: state.key + 1 }))}
      >
        {t("open")}
      </Button>
      {dialog.key > 0 && (
        <BoardMembersDialog
          key={dialog.key}
          {...props}
          open={dialog.open}
          onClose={() => setDialog((state) => ({ ...state, open: false }))}
        />
      )}
    </>
  );
}
