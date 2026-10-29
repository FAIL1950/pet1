"use client";

import { useController, type Control, type FieldPath, type FieldValues } from "react-hook-form";
import { useTranslations } from "next-intl";
import TextField, { type TextFieldProps } from "@mui/material/TextField";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/schemas";
import { isValidationKey } from "@/lib/validation";
import PasswordField from "./PasswordField";

type FormTextFieldProps<T extends FieldValues> = Omit<
  TextFieldProps,
  "name" | "value" | "onChange" | "onBlur" | "inputRef" | "error"
> & {
  control: Control<T>;
  name: FieldPath<T>;
};

// MUI TextField bound to a React Hook Form field; shows the translated schema error as helper text.
export default function FormTextField<T extends FieldValues>({
  control,
  name,
  type,
  helperText,
  ...props
}: FormTextFieldProps<T>) {
  const t = useTranslations("Form");
  const { field, fieldState } = useController({ control, name });

  const message = fieldState.error?.message;
  const errorText = isValidationKey(message)
    ? t(`validation.${message}`, { min: MIN_PASSWORD_LENGTH })
    : message;

  const fieldProps = {
    ...props,
    name: field.name,
    value: field.value,
    onChange: field.onChange,
    onBlur: field.onBlur,
    // MUI forwards `ref` to the root div; RHF needs the <input> to focus it on errors.
    inputRef: field.ref,
    error: Boolean(fieldState.error),
    helperText: errorText ?? helperText,
  };

  return type === "password" ? <PasswordField {...fieldProps} /> : <TextField {...fieldProps} type={type} />;
}
