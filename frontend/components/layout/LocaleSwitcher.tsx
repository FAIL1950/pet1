"use client";

import { useState, useTransition, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Tooltip from "@mui/material/Tooltip";
import TranslateRounded from "@mui/icons-material/TranslateRounded";
import { setLocale } from "@/i18n/actions";
import { locales, toAppLocale, type AppLocale } from "@/i18n/config";

export default function LocaleSwitcher() {
  const t = useTranslations("LocaleSwitcher");
  const current = toAppLocale(useLocale());
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const handleOpen = (event: MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handleSelect = (locale: AppLocale) => {
    handleClose();
    if (locale === current) return;
    startTransition(async () => {
      await setLocale(locale);
      router.refresh();
    });
  };

  return (
    <>
      <Tooltip title={t("label")}>
        <IconButton
          color="inherit"
          aria-label={t("label")}
          aria-controls={anchorEl ? "locale-menu" : undefined}
          aria-haspopup="menu"
          aria-expanded={anchorEl ? "true" : undefined}
          disabled={isPending}
          onClick={handleOpen}
        >
          <TranslateRounded />
        </IconButton>
      </Tooltip>
      <Menu id="locale-menu" anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
        {locales.map((locale) => (
          <MenuItem key={locale} selected={locale === current} onClick={() => handleSelect(locale)}>
            {t(locale)}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
