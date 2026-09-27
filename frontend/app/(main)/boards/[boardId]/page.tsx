import type { Metadata } from "next";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("BoardPage");
  return { title: t("title") };
}

// Full-width workspace (no Container): boards scroll horizontally on small screens.
export default async function BoardPage() {
  const t = await getTranslations("BoardPage");

  return (
    <Box sx={{ flex: 1, px: { xs: 2, md: 3 }, py: 3, overflowX: "auto" }}>
      <Typography variant="h5" component="h1" sx={{ mb: 2 }}>
        {t("title")}
      </Typography>
    </Box>
  );
}
