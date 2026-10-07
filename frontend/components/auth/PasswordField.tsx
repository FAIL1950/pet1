"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import TextField, { type TextFieldProps } from "@mui/material/TextField";
import VisibilityOffRounded from "@mui/icons-material/VisibilityOffRounded";
import VisibilityRounded from "@mui/icons-material/VisibilityRounded";

export default function PasswordField(props: Omit<TextFieldProps, "type">) {
  const t = useTranslations("AuthForm");
  const [visible, setVisible] = useState(false);

  return (
    <TextField
      {...props}
      type={visible ? "text" : "password"}
      slotProps={{
        input: {
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                edge="end"
                aria-label={visible ? t("hidePassword") : t("showPassword")}
                onClick={() => setVisible((v) => !v)}
              >
                {visible ? <VisibilityOffRounded /> : <VisibilityRounded />}
              </IconButton>
            </InputAdornment>
          ),
        },
      }}
    />
  );
}
