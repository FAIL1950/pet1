import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import { COLUMN_WIDTH } from "@/components/boards/constants";

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
      {/* Same outlined box as BoardInfo: name and role, then the description. */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" sx={{ gap: 4, mb: 1.5 }}>
          <Box>
            <Skeleton variant="text" width={80} />
            <Typography variant="h6" component="div">
              <Skeleton width={200} />
            </Typography>
          </Box>
          <Box>
            <Skeleton variant="text" width={40} />
            <Skeleton variant="rounded" width={64} height={24} sx={{ mt: 0.5 }} />
          </Box>
        </Stack>
        <Skeleton variant="text" width={60} />
        <Skeleton variant="text" width="50%" />
      </Paper>

      <Stack direction="row" sx={{ gap: 2, alignItems: "flex-start" }}>
        {COLUMN_CARD_COUNTS.map((cardCount, column) => (
          <Stack key={column} sx={{ width: COLUMN_WIDTH, flexShrink: 0, gap: 1 }}>
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
