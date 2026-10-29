import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { BoardRole } from "@/lib/boards/types";

type BoardInfoProps = {
  title: string;
  description: string | null;
  role: BoardRole;
  /** Rendered in the top-right corner (e.g. the members button). */
  actions?: ReactNode;
};

function Label({ children }: { children: ReactNode }) {
  return (
    <Typography component="dt" variant="caption" color="text.secondary" sx={{ display: "block" }}>
      {children}
    </Typography>
  );
}

/** The board's name, the user's role and the description as labelled fields in an outlined box. */
export default function BoardInfo({ title, description, role, actions }: BoardInfoProps) {
  const t = useTranslations("BoardInfo");
  const tRole = useTranslations("BoardRole");

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
      <Stack direction="row" sx={{ gap: 2, alignItems: "flex-start" }}>
        <Box component="dl" sx={{ flex: 1, minWidth: 0, m: 0, display: "grid", gap: 1.5 }}>
          <Stack direction={{ xs: "column", sm: "row" }} sx={{ gap: { xs: 1.5, sm: 4 } }}>
            <Box sx={{ minWidth: 0 }}>
              <Label>{t("title")}</Label>
              <Box component="dd" sx={{ m: 0 }}>
                <Typography variant="h6" component="h1" sx={{ overflowWrap: "anywhere" }}>
                  {title}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ flexShrink: 0 }}>
              <Label>{t("role")}</Label>
              <Box component="dd" sx={{ m: 0, mt: 0.5 }}>
                <Chip size="small" label={tRole(role)} />
              </Box>
            </Box>
          </Stack>
          <Box>
            <Label>{t("description")}</Label>
            <Typography
              component="dd"
              color={description ? "text.primary" : "text.secondary"}
              sx={{ m: 0, whiteSpace: "pre-line", overflowWrap: "anywhere" }}
            >
              {description ?? t("noDescription")}
            </Typography>
          </Box>
        </Box>
        {actions}
      </Stack>
    </Paper>
  );
}
