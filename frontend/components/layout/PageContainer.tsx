import type { ReactNode } from "react";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

type PageContainerProps = {
  title?: string;
  /** Rendered to the right of the title (wraps below it on narrow screens). */
  actions?: ReactNode;
  children?: ReactNode;
};

export default function PageContainer({ title, actions, children }: PageContainerProps) {
  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
      {(title || actions) && (
        <Stack
          direction="row"
          sx={{
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 2,
            mb: 3,
          }}
        >
          {title && (
            <Typography variant="h4" component="h1">
              {title}
            </Typography>
          )}
          {actions}
        </Stack>
      )}
      {children}
    </Container>
  );
}
