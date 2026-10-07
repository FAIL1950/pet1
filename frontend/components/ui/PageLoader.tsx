import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import { useTranslations } from "next-intl";

// Generic route-level fallback for segments without a page-specific skeleton.
export default function PageLoader() {
  const t = useTranslations("Common");

  return (
    <Box
      role="status"
      sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", py: 6 }}
    >
      <CircularProgress aria-label={t("loading")} />
    </Box>
  );
}
