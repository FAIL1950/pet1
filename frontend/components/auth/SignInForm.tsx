"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import { authClient } from "@/lib/auth/client";
import { useAfterAuthRedirect } from "@/lib/auth/useAfterAuthRedirect";
import { authErrorKey, type AuthErrorKey } from "@/lib/auth/errors";
import { signInSchema, type SignInValues } from "@/lib/auth/schemas";
import FormTextField from "@/components/form/FormTextField";

export default function SignInForm() {
  const t = useTranslations("AuthForm");
  const tPage = useTranslations("SignInPage");
  const router = useRouter();
  const afterAuthRedirect = useAfterAuthRedirect();
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
    mode: "onTouched",
  });

  const setServerError = (key: AuthErrorKey) => setError("root.serverError", { message: key });

  const onSubmit = async ({ email, password }: SignInValues) => {
    try {
      const { error } = await authClient.signIn.email({
        email,
        password,
        callbackURL: afterAuthRedirect,
      });
      if (error) {
        setServerError(authErrorKey(error));
        return;
      }
      router.replace(afterAuthRedirect);
      router.refresh();
    } catch {
      setServerError(authErrorKey(null));
    }
  };

  const serverError = errors.root?.serverError?.message as AuthErrorKey | undefined;

  return (
    <Stack component="form" noValidate spacing={2} onSubmit={handleSubmit(onSubmit)}>
      {serverError && <Alert severity="error">{t(`errors.${serverError}`)}</Alert>}
      <FormTextField
        control={control}
        name="email"
        label={t("email")}
        type="email"
        autoComplete="email"
        required
        fullWidth
      />
      <FormTextField
        control={control}
        name="password"
        label={t("password")}
        type="password"
        autoComplete="current-password"
        required
        fullWidth
      />
      <Button
        type="submit"
        variant="contained"
        size="large"
        fullWidth
        disableElevation
        // Stays in the loading state while navigating to the boards after a successful sign-in.
        loading={isSubmitting || isSubmitSuccessful}
      >
        {tPage("submit")}
      </Button>
    </Stack>
  );
}
