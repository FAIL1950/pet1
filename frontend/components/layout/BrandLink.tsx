"use client";

import NextLink from "next/link";
import { useTranslations } from "next-intl";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { SxProps, Theme } from "@mui/material/styles";
import ViewKanbanRounded from "@mui/icons-material/ViewKanbanRounded";

export default function BrandLink({ sx }: { sx?: SxProps<Theme> }) {
  const t = useTranslations("Nav");

  return (
    <Box
      component={NextLink}
      href="/"
      sx={[
        {
          display: "flex",
          alignItems: "center",
          gap: 1,
          color: "text.primary",
          textDecoration: "none",
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      <ViewKanbanRounded color="primary" />
      <Typography variant="h6" component="span" sx={{ fontWeight: 700 }}>
        {t("brand")}
      </Typography>
    </Box>
  );
}
