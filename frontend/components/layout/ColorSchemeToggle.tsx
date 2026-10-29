"use client";

import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Skeleton from "@mui/material/Skeleton";
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

  // `mode` is undefined until mounted — render a skeleton of the button's size to avoid layout shift and hydration mismatch.
  if (!mode) {
    return (
      <Box sx={{ p: 1 }}>
        <Skeleton variant="circular" width={24} height={24} />
      </Box>
    );
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
