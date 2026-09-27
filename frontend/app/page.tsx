import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { getTranslations } from "next-intl/server";
import PageContainer from "@/components/layout/PageContainer";
import LinkButton from "@/components/ui/LinkButton";

export default async function AboutPage() {
  const t = await getTranslations("AboutPage");

  return (
    <PageContainer title={t("title")}>
      <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 640, mb: 4 }}>
        {t("description")}
      </Typography>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <LinkButton href="/auth/sign-up" variant="contained" size="large" disableElevation>
          {t("getStarted")}
        </LinkButton>
        <LinkButton href="/boards" variant="outlined" size="large">
          {t("openBoards")}
        </LinkButton>
      </Stack>
    </PageContainer>
  );
}
