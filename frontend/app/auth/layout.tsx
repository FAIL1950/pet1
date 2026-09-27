import NextLink from "next/link";
import { getTranslations } from "next-intl/server";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ViewKanbanRounded from "@mui/icons-material/ViewKanbanRounded";
import ColorSchemeToggle from "@/components/layout/ColorSchemeToggle";
import LocaleSwitcher from "@/components/layout/LocaleSwitcher";

export default async function AuthLayout({ children }: LayoutProps<"/auth">) {
  const t = await getTranslations("Nav");

  return (
    <>
      <Container maxWidth="lg">
        <Stack direction="row" sx={{ alignItems: "center", gap: 1, minHeight: 64 }}>
          <Box
            component={NextLink}
            href="/"
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              color: "text.primary",
              textDecoration: "none",
            }}
          >
            <ViewKanbanRounded color="primary" />
            <Typography variant="h6" component="span" sx={{ fontWeight: 700 }}>
              {t("brand")}
            </Typography>
          </Box>
          <Box sx={{ flexGrow: 1 }} />
          <LocaleSwitcher />
          <ColorSchemeToggle />
        </Stack>
      </Container>

      <Box
        component="main"
        sx={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}
      >
        <Container maxWidth="xs" sx={{ py: { xs: 3, md: 5 } }}>
          {children}
        </Container>
      </Box>
    </>
  );
}
