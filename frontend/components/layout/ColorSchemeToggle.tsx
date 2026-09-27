"use client";

import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { useColorScheme } from "@mui/material/styles";
import DarkModeRounded from "@mui/icons-material/DarkModeRounded";
import LightModeRounded from "@mui/icons-material/LightModeRounded";
import SettingsBrightnessRounded from "@mui/icons-material/SettingsBrightnessRounded";
import { useTranslations } from "next-intl";

const NEXT_MODE = {
  system: "light",
  light: "dark",
  dark: "system",
} as const;

const ICONS = {
  system: SettingsBrightnessRounded,
  light: LightModeRounded,
  dark: DarkModeRounded,
};

export default function ColorSchemeToggle() {
  const t = useTranslations("ColorScheme");
  const { mode, setMode } = useColorScheme();

  // `mode` is undefined until mounted — keep the slot to avoid layout shift and hydration mismatch.
  if (!mode) {
    return <IconButton disabled aria-hidden sx={{ visibility: "hidden" }} />;
  }

  const Icon = ICONS[mode];
  const label = t("toggle", { mode: t(mode) });

  return (
    <Tooltip title={label}>
      <IconButton color="inherit" aria-label={label} onClick={() => setMode(NEXT_MODE[mode])}>
        <Icon />
      </IconButton>
    </Tooltip>
  );
}
