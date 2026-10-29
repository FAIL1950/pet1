"use client";

import { useState, type MouseEvent } from "react";
import { useTranslations } from "next-intl";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import EditRounded from "@mui/icons-material/EditRounded";
import MoreVertRounded from "@mui/icons-material/MoreVertRounded";

type ItemMenuProps = {
  /** Name of the column/card, for the button's accessible label. */
  title: string;
  onEdit: () => void;
  onDelete: () => void;
};

/** "⋮" button with Edit / Delete for a column or card. */
export default function ItemMenu({ title, onEdit, onDelete }: ItemMenuProps) {
  const t = useTranslations("BoardPage");
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const choose = (action: () => void) => () => {
    setAnchorEl(null);
    action();
  };

  return (
    <>
      <IconButton
        size="small"
        aria-label={t("itemMenu", { title })}
        aria-haspopup="true"
        aria-expanded={anchorEl !== null}
        onClick={(event: MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget)}
        // Keeps a click on the menu from starting a drag of the column/card.
        onPointerDown={(event) => event.stopPropagation()}
        sx={{ flexShrink: 0 }}
      >
        <MoreVertRounded fontSize="small" />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={anchorEl !== null}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <MenuItem onClick={choose(onEdit)}>
          <ListItemIcon>
            <EditRounded fontSize="small" />
          </ListItemIcon>
          {t("edit")}
        </MenuItem>
        <MenuItem onClick={choose(onDelete)} sx={{ color: "error.main" }}>
          <ListItemIcon sx={{ color: "inherit" }}>
            <DeleteOutlineRounded fontSize="small" />
          </ListItemIcon>
          {t("delete")}
        </MenuItem>
      </Menu>
    </>
  );
}
