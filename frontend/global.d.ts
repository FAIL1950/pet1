import type { LocaleTag } from "./i18n/config";
import type messages from "./messages/ua.json";

declare module "next-intl" {
  interface AppConfig {
    Locale: LocaleTag;
    Messages: typeof messages;
  }
}
