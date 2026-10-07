import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import { useTranslations } from "next-intl";
import PageContainer from "@/components/layout/PageContainer";

const PLACEHOLDER_COUNT = 6;

// The page title is static, so it renders for real; only the board list is skeletoned.
export default function Loading() {
  const t = useTranslations("BoardsPage");
  const tCommon = useTranslations("Common");

  return (
    <PageContainer title={t("title")}>
      <Box
        role="status"
        aria-label={tCommon("loading")}
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)" },
          gap: 2,
        }}
      >
        {Array.from({ length: PLACEHOLDER_COUNT }, (_, i) => (
          <Skeleton key={i} variant="rounded" height={120} />
        ))}
      </Box>
    </PageContainer>
  );
}
