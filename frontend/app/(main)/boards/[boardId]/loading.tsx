import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";

// Cards per placeholder column; varied so the skeleton doesn't look like a grid.
const COLUMN_CARD_COUNTS = [3, 2, 4];

// Mirrors the layout of page.tsx: full-width, horizontally scrolling workspace.
export default function Loading() {
  const t = useTranslations("Common");

  return (
    <Box
      role="status"
      aria-label={t("loading")}
      sx={{ flex: 1, px: { xs: 2, md: 3 }, py: 3, overflowX: "auto" }}
    >
      <Typography variant="h5" component="div" sx={{ mb: 2 }}>
        <Skeleton width={200} />
      </Typography>

      <Stack direction="row" sx={{ gap: 2, alignItems: "flex-start" }}>
        {COLUMN_CARD_COUNTS.map((cardCount, column) => (
          <Stack key={column} sx={{ width: 272, flexShrink: 0, gap: 1 }}>
            <Skeleton variant="text" width="60%" />
            {Array.from({ length: cardCount }, (_, card) => (
              <Skeleton key={card} variant="rounded" height={72} />
            ))}
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}
