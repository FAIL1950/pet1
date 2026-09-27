"use client";

import { useMemo, type ReactNode } from "react";
import { useLocale } from "next-intl";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { enUS, ukUA } from "@mui/material/locale";
import themeOptions from "@/theme";

const muiLocales = {
  uk: ukUA,
  en: enUS,
};

export default function AppThemeProvider({ children }: { children: ReactNode }) {
  const locale = useLocale();
  const theme = useMemo(() => createTheme(themeOptions, muiLocales[locale]), [locale]);

  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}
