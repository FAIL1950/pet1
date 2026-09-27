"use server";

import { cookies } from "next/headers";
import { isAppLocale, LOCALE_COOKIE, type AppLocale } from "./config";

export async function setLocale(locale: AppLocale): Promise<void> {
  if (!isAppLocale(locale)) return;
  (await cookies()).set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}
