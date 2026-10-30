import type { ReactNode } from "react";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

type AuthMessageCardProps = {
  /** Icon shown above the title. */
  icon: ReactNode;
  title: string;
  /** Paragraphs of text. */
  children: ReactNode;
  /** Buttons under the text. */
  actions?: ReactNode;
};

/** Card for auth status pages (check your email, email verified), styled like AuthCard. */
export default function AuthMessageCard({ icon, title, children, actions }: AuthMessageCardProps) {
  return (
    <Paper variant="outlined" sx={{ p: { xs: 3, sm: 4 }, borderRadius: 3 }}>
      <Stack spacing={2} sx={{ alignItems: "flex-start" }}>
        {icon}
        <Typography variant="h5" component="h1">
          {title}
        </Typography>
        <Stack spacing={1.5} sx={{ color: "text.secondary" }}>
          {children}
        </Stack>
        {actions && <Stack spacing={1} sx={{ width: "100%", pt: 1 }}>{actions}</Stack>}
      </Stack>
    </Paper>
  );
}
