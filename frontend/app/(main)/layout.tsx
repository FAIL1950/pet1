import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import AppHeader from "@/components/layout/AppHeader";

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <AppHeader />
      <Box component="main" sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {children}
      </Box>
    </>
  );
}
