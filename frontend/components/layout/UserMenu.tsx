"use client";

import { useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";
import LogoutRounded from "@mui/icons-material/LogoutRounded";
import { authClient } from "@/lib/auth/client";
import type { SessionUser } from "@/lib/auth/session";

function initials({ name, email }: SessionUser): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return email.charAt(0).toUpperCase();
  return words
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

export default function UserMenu({ user }: { user: SessionUser }) {
  const t = useTranslations("Nav");
  const router = useRouter();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const open = anchorEl !== null;

  const handleOpen = (event: MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await authClient.signOut();
    } finally {
      handleClose();
      setSigningOut(false);
      router.replace("/");
      router.refresh();
    }
  };

  return (
    <>
      <IconButton
        aria-label={t("userMenu")}
        aria-controls={open ? "user-menu" : undefined}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={handleOpen}
        sx={{ ml: 1, p: 0.5 }}
      >
        <Avatar
          src={user.image ?? undefined}
          alt={user.name || user.email}
          sx={{ width: 32, height: 32, fontSize: 14, bgcolor: "primary.main" }}
        >
          {initials(user)}
        </Avatar>
      </IconButton>
      <Menu
        id="user-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Box sx={{ px: 2, py: 1, maxWidth: 260 }}>
          <Typography variant="subtitle2" noWrap>
            {user.name}
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {user.email}
          </Typography>
        </Box>
        <Divider />
        <MenuItem onClick={handleSignOut} disabled={signingOut}>
          <ListItemIcon>
            <LogoutRounded fontSize="small" />
          </ListItemIcon>
          {t("signOut")}
        </MenuItem>
      </Menu>
    </>
  );
}
