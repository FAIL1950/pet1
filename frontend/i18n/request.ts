import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { isAppLocale, LOCALE_COOKIE, matchAcceptLanguage, toLocaleTag } from "./config";

export default getRequestConfig(async () => {
  const cookieLocale = (await cookies()).get(LOCALE_COOKIE)?.value;
  const appLocale = isAppLocale(cookieLocale)
    ? cookieLocale
    : matchAcceptLanguage((await headers()).get("accept-language"));

  return {
    locale: toLocaleTag(appLocale),
    messages: (await import(`../messages/${appLocale}.json`)).default,
  };
});
