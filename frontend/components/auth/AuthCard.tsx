"use client";

import type { ReactNode } from "react";
import NextLink from "next/link";
import { useTranslations } from "next-intl";
import Divider from "@mui/material/Divider";
import Link from "@mui/material/Link";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import GoogleSignInButton from "./GoogleSignInButton";

type AuthCardProps = {
  title: string;
  subtitle: string;
  footerText: string;
  footerLinkText: string;
  footerHref: "/auth/sign-in" | "/auth/sign-up";
  children: ReactNode;
};

export default function AuthCard({
  title,
  subtitle,
  footerText,
  footerLinkText,
  footerHref,
  children,
}: AuthCardProps) {
  const t = useTranslations("AuthForm");

  return (
    <Paper variant="outlined" sx={{ p: { xs: 3, sm: 4 }, borderRadius: 3 }}>
      <Stack spacing={3}>
        <Stack spacing={1}>
          <Typography variant="h4" component="h1">
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        </Stack>

        {children}

        <Divider>
          <Typography variant="body2" color="text.secondary">
            {t("or")}
          </Typography>
        </Divider>

        <GoogleSignInButton />

        <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center" }}>
          {footerText}{" "}
          <Link component={NextLink} href={footerHref} underline="hover" sx={{ fontWeight: 600 }}>
            {footerLinkText}
          </Link>
        </Typography>
      </Stack>
    </Paper>
  );
}
