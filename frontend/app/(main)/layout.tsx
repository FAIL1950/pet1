import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import AppHeader from "@/components/layout/AppHeader";
import { getSession } from "@/lib/auth/session";

export default async function MainLayout({ children }: { children: ReactNode }) {
  const session = await getSession();

  return (
    <>
      <AppHeader user={session?.user ?? null} />
      <Box component="main" sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {children}
      </Box>
    </>
  );
}
