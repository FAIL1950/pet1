"use client";

import NextLink from "next/link";
import Button, { type ButtonProps } from "@mui/material/Button";

type LinkButtonProps = Omit<ButtonProps<typeof NextLink>, "component">;

// Server Components can't pass `component={NextLink}` to MUI (functions aren't serializable), so wrap it here.
export default function LinkButton(props: LinkButtonProps) {
  return <Button component={NextLink} {...props} />;
}
