import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import BrandLink from "@/components/layout/BrandLink";
import ColorSchemeToggle from "@/components/layout/ColorSchemeToggle";
import LocaleSwitcher from "@/components/layout/LocaleSwitcher";

export default function AuthLayout({ children }: LayoutProps<"/auth">) {
  return (
    <>
      <Container maxWidth="lg">
        <Stack direction="row" sx={{ alignItems: "center", gap: 1, minHeight: 64 }}>
          <BrandLink />
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
