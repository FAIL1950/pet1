import type { ReactNode } from "react";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";

type PageContainerProps = {
  title?: string;
  children?: ReactNode;
};

export default function PageContainer({ title, children }: PageContainerProps) {
  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
      {title && (
        <Typography variant="h4" component="h1" sx={{ mb: 3 }}>
          {title}
        </Typography>
      )}
      {children}
    </Container>
  );
}
